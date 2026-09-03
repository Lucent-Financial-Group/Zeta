module Zeta.Tests.Storage.DiskDeltaLogTests

open System
open System.IO
open System.Threading
open System.Threading.Tasks
open FsUnit.Xunit
open global.Xunit
open Zeta.Core
open Zeta.Tests.Support


// ═══════════════════════════════════════════════════════════════════
// DiskDeltaLog — file-per-entry durable log on the IDeltaCodec seam.
// Proves real on-disk persistence + recovery across a FRESH instance.
// ═══════════════════════════════════════════════════════════════════

let private ct = CancellationToken.None
let private empty : Map<string, string> = Map.empty
let private keyEnc (i: int) : DynamicValue = DynamicValue.Int(int64 i)
let private keyDec (dv: DynamicValue) : int =
    match dv with DynamicValue.Int w -> int w | o -> failwithf "keyDec: %A" o

// A size-control test double: emits a fixed-size payload (to drive batching/segment behavior) but
// PRESERVES the entry's Seq in the first 8 bytes so replay recovers it (the whole entry now rides the
// IEntryCodec, so a codec that dropped Seq would make ReplayAsync(0) filter everything out).
type private FixedBytesEntryCodec(bytesPerDelta: int) =
    interface IEntryCodec<int> with
        member _.Encode entry =
            let b = Array.zeroCreate bytesPerDelta
            System.BitConverter.GetBytes(entry.Seq).CopyTo(b, 0)
            b
        member _.Decode bytes =
            DeltaLogEntry<int, ZSet<int>>(System.BitConverter.ToInt64(bytes, 0), ZSet<int>.Empty, Map.empty)

let private withDir name (f: string -> unit) =
    let dir = DeterministicTestPath.nextDir name
    try f dir
    finally try Directory.Delete(dir, true) with _ -> ()


[<Fact>]
let ``append + replay round-trips deltas and captured through disk`` () =
    withDir "ddl-roundtrip" (fun dir ->
        let log = DiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec)) :> IDeltaLog<int>
        log.AppendAsync(ZSet.ofKeys [ 1; 2 ], empty, ct).AsTask().Wait()
        log.AppendAsync(ZSet.ofKeys [ 3 ], Map.ofList [ "clock", "99" ], ct).AsTask().Wait()
        let entries = log.ReplayAsync(0L, ct).AsTask().Result
        entries |> Array.map (fun e -> e.Seq) |> should equal [| 1L; 2L |]
        entries.[0].Delta |> should equal (ZSet.ofKeys [ 1; 2 ])
        entries.[1].Captured |> should equal (Map.ofList [ "clock", "99" ]))


[<Fact>]
let ``truncate deletes entry files; replay returns the tail; HighWater holds`` () =
    withDir "ddl-truncate" (fun dir ->
        let log = DiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec)) :> IDeltaLog<int>
        for i in 1 .. 5 do log.AppendAsync(ZSet.ofKeys [ i ], empty, ct).AsTask().Wait()
        log.TruncateAsync(3L, ct).AsTask().Wait()
        log.ReplayAsync(0L, ct).AsTask().Result
        |> Array.map (fun e -> e.Seq) |> should equal [| 4L; 5L |]
        log.HighWater |> should equal 5L)


[<Fact>]
let ``a FRESH instance recovers high-water + entries from disk`` () =
    withDir "ddl-reopen" (fun dir ->
        // First instance writes 3 entries, then "process exits".
        (let log1 = DiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec)) :> IDeltaLog<int>
         for i in 1 .. 3 do log1.AppendAsync(ZSet.ofKeys [ i ], empty, ct).AsTask().Wait())
        // Fresh instance over the same dir: continues the sequence, sees history.
        let log2 = DiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec)) :> IDeltaLog<int>
        log2.HighWater |> should equal 3L
        log2.ReplayAsync(0L, ct).AsTask().Result.Length |> should equal 3
        let s4 = log2.AppendAsync(ZSet.ofKeys [ 4 ], empty, ct).AsTask().Result
        s4 |> should equal 4L)


[<Fact>]
let ``disk log works through the canonical CBOR codec`` () =
    withDir "ddl-cbor" (fun dir ->
        let log = DiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec)) :> IDeltaLog<int>
        log.AppendAsync(ZSet.ofSeq [ 1, 1L; 2, -3L ], empty, ct).AsTask().Wait()
        let e = (log.ReplayAsync(0L, ct).AsTask().Result).[0]
        e.Delta |> should equal (ZSet.ofSeq [ 1, 1L; 2, -3L ]))


[<Fact>]
let ``fsync-per-append round-trips`` () =
    withDir "ddl-fsync" (fun dir ->
        let log = DiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec), fsyncPerAppend = true) :> IDeltaLog<int>
        log.AppendAsync(ZSet.ofKeys [ 7; 8 ], empty, ct).AsTask().Wait()
        (log.ReplayAsync(0L, ct).AsTask().Result).[0].Delta |> should equal (ZSet.ofKeys [ 7; 8 ]))


[<Fact>]
let ``group-commit segment log appends and replays in sequence order`` () =
    withDir "gcdl-roundtrip" (fun dir ->
        use log = new GroupCommitDiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec))
        let dlog = log :> IDeltaLog<int>
        let tasks =
            [| for i in 1 .. 20 ->
                   dlog.AppendAsync(ZSet.ofKeys [ i ], empty, ct).AsTask() |]
        System.Threading.Tasks.Task.WaitAll(tasks |> Array.map (fun t -> t :> System.Threading.Tasks.Task))
        tasks |> Array.map (fun t -> t.Result) |> should equal [| 1L .. 20L |]
        let entries = dlog.ReplayAsync(0L, ct).AsTask().Result
        entries |> Array.map _.Seq |> should equal [| 1L .. 20L |]
        entries |> Array.map (fun e -> e.Delta) |> should equal [| for i in 1 .. 20 -> ZSet.ofKeys [ i ] |])


[<Fact>]
let ``group-commit N small appends land in one segment file not N files`` () =
    // Product-existence floor for ZetaFS (ZetaDB D4 / ZD4): auto-batch of small
    // writes already exists on a host directory. A custom FS must win on
    // something else. Falsifier: 32 concurrent appends → one `delta-*.segment`,
    // zero `DiskDeltaLog`-style `*.delta` files.
    withDir "gcdl-one-segment" (fun dir ->
        use log = new GroupCommitDiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec))
        let dlog = log :> IDeltaLog<int>
        let tasks =
            [| for i in 1 .. 32 ->
                   dlog.AppendAsync(ZSet.ofKeys [ i ], empty, ct).AsTask() |]
        System.Threading.Tasks.Task.WaitAll(tasks |> Array.map (fun t -> t :> System.Threading.Tasks.Task))
        Directory.GetFiles(dir, "*.delta").Length |> should equal 0
        // Post-rollover naming: the (single, active) segment carries its first seq in the name.
        let segment = Directory.GetFiles(dir, "delta-*.segment") |> Array.exactlyOne
        Path.GetFileName segment |> should equal "delta-00000000000000000001.segment"
        FileInfo(segment).Length > 0L |> should equal true
        (dlog.ReplayAsync(0L, ct).AsTask().Result).Length |> should equal 32)


[<Fact>]
let ``group-commit segment log recovers high-water across a fresh instance`` () =
    withDir "gcdl-reopen" (fun dir ->
        (use log1 = new GroupCommitDiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec))
         let dlog1 = log1 :> IDeltaLog<int>
         for i in 1 .. 3 do
             dlog1.AppendAsync(ZSet.ofKeys [ i ], empty, ct).AsTask().Wait())
        use log2 = new GroupCommitDiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec))
        let dlog2 = log2 :> IDeltaLog<int>
        dlog2.HighWater |> should equal 3L
        dlog2.ReplayAsync(0L, ct).AsTask().Result.Length |> should equal 3
        dlog2.AppendAsync(ZSet.ofKeys [ 4 ], empty, ct).AsTask().Result |> should equal 4L)


[<Fact>]
let ``group-commit segment log works through the canonical CBOR codec`` () =
    withDir "gcdl-cbor" (fun dir ->
        use log = new GroupCommitDiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec))
        let dlog = log :> IDeltaLog<int>
        dlog.AppendAsync(ZSet.ofSeq [ 1, 1L; 2, -3L ], empty, ct).AsTask().Wait()
        let e = (dlog.ReplayAsync(0L, ct).AsTask().Result).[0]
        e.Delta |> should equal (ZSet.ofSeq [ 1, 1L; 2, -3L ]))


[<Fact>]
let ``group-commit segment log rejects multi-ferry writer configs`` () =
    withDir "gcdl-dop" (fun dir ->
        let config = { FerryThrottlerConfig.deterministic with MaxDegreeOfParallelism = 2 }
        (fun () -> new GroupCommitDiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec), config) |> ignore)
        |> should throw typeof<System.ArgumentException>)


[<Fact>]
let ``group-commit crash-mid-write through IFileSystem tears the tail and a fresh instance truncates`` () : Task =
    task {
        let mock = InMemoryFileSystem()
        FileSystem.Register(mock)
        let dir = DeterministicTestPath.nextDir "gcdl-crash-mid"
        try
            let codec = CborEntryCodec<int>(keyEnc, keyDec)
            let log1 = new GroupCommitDiskDeltaLog<int>(dir, codec)
            let mutable committedLen = 0
            try
                let dlog1 = log1 :> IDeltaLog<int>
                let! seq1 = dlog1.AppendAsync(ZSet.ofKeys [ 1 ], empty, ct).AsTask().ConfigureAwait(false)
                Assert.Equal(1L, seq1)
                let segmentPath = Path.Combine(Path.GetFullPath dir, "delta-00000000000000000001.segment")
                let committed = FileSystem.Current.ReadAllBytes segmentPath
                committedLen <- committed.Length
                mock.ArmCrashMidWrite(".segment", committed.Length + 8)
                let append2 = dlog1.AppendAsync(ZSet.ofKeys [ 2 ], empty, ct).AsTask()
                let! ex =
                    Assert
                        .ThrowsAsync<CrashMidWriteException>(fun () -> append2 :> Task)
                        .ConfigureAwait(false)

                Assert.Equal(committed.Length + 8, ex.CommittedBytes)
                Assert.Equal(committed.Length + 8, FileSystem.Current.ReadAllBytes(segmentPath).Length)
            finally
                (log1 :> IDisposable).Dispose()

            use log2 = new GroupCommitDiskDeltaLog<int>(dir, codec)
            let dlog2 = log2 :> IDeltaLog<int>
            Assert.Equal(1L, dlog2.HighWater)
            let! replayed = dlog2.ReplayAsync(0L, ct).AsTask().ConfigureAwait(false)
            Assert.Equal<int64>([| 1L |], replayed |> Array.map (fun e -> e.Seq))
            let recovered =
                FileSystem.Current.ReadAllBytes(Path.Combine(Path.GetFullPath dir, "delta-00000000000000000001.segment"))
            Assert.Equal(committedLen, recovered.Length)
        finally
            FileSystem.Reset()
            try Directory.Delete(dir, true) with _ -> ()
    }

[<Fact>]
let ``group-commit corrupt-last-write through IFileSystem acks then a fresh instance drops the tail`` () : Task =
    task {
        let mock = InMemoryFileSystem()
        FileSystem.Register(mock)
        let dir = DeterministicTestPath.nextDir "gcdl-corrupt-last"
        try
            let codec = CborEntryCodec<int>(keyEnc, keyDec)
            mock.ArmCorruptLastWrite(".segment", 8)
            let log1 = new GroupCommitDiskDeltaLog<int>(dir, codec)
            try
                let dlog1 = log1 :> IDeltaLog<int>
                let! seq1 = dlog1.AppendAsync(ZSet.ofKeys [ 1 ], empty, ct).AsTask().ConfigureAwait(false)
                Assert.Equal(1L, seq1)
            finally
                (log1 :> IDisposable).Dispose()

            use log2 = new GroupCommitDiskDeltaLog<int>(dir, codec)
            let dlog2 = log2 :> IDeltaLog<int>
            Assert.Equal(0L, dlog2.HighWater)
            let! replayed = dlog2.ReplayAsync(0L, ct).AsTask().ConfigureAwait(false)
            Assert.Equal(0, replayed.Length)
        finally
            FileSystem.Reset()
            try Directory.Delete(dir, true) with _ -> ()
    }

[<Fact>]
let ``group-commit segment log truncates torn trailing record on recovery`` () =
    withDir "gcdl-torn" (fun dir ->
        (use log = new GroupCommitDiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec))
         let dlog = log :> IDeltaLog<int>
         dlog.AppendAsync(ZSet.ofKeys [ 1 ], empty, ct).AsTask().Wait()
         dlog.AppendAsync(ZSet.ofKeys [ 2 ], empty, ct).AsTask().Wait())
        // Post-rollover naming: the active segment carries its first seq in the name.
        let segment = Directory.GetFiles(dir, "delta-*.segment") |> Array.exactlyOne
        let before = FileInfo(segment).Length
        // Scope the torn-write handle so it is DISPOSED before recovery reopens the segment. On Windows the
        // share modes are enforced strictly: a still-open `FileShare.Read` write handle blocks the recovery's
        // truncate-reopen with IO_SharingViolation (Linux ignores share modes, so the leak only failed on
        // Windows runners). Same `(use … )` scoping idiom this test already uses for `log` above.
        (use fs = new FileStream(segment, FileMode.Append, FileAccess.Write, FileShare.Read)
         fs.Write([| 0x7uy; 0x8uy; 0x9uy |], 0, 3)
         fs.Flush())
        FileInfo(segment).Length |> should equal (before + 3L)
        use recovered = new GroupCommitDiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec))
        let dlog = recovered :> IDeltaLog<int>
        dlog.HighWater |> should equal 2L
        dlog.ReplayAsync(0L, ct).AsTask().Result |> Array.map _.Seq |> should equal [| 1L; 2L |]
        FileInfo(segment).Length |> should equal before)


[<Fact>]
let ``group-commit segment log shields admitted append from caller cancellation`` () =
    withDir "gcdl-cancel-after-admit" (fun dir ->
        let config = { FerryThrottlerConfig.deterministic with MaxBatchSize = 1 }
        use log = new GroupCommitDiskDeltaLog<int>(dir, FixedBytesEntryCodec(4 * 1024 * 1024), config)
        let dlog = log :> IDeltaLog<int>
        let first = dlog.AppendAsync(ZSet.ofKeys [ 1 ], empty, ct).AsTask()
        use cts = new CancellationTokenSource()
        let second = dlog.AppendAsync(ZSet.ofKeys [ 2 ], empty, cts.Token).AsTask()
        cts.Cancel()
        System.Threading.Tasks.Task.WaitAll([| first :> System.Threading.Tasks.Task; second :> System.Threading.Tasks.Task |])
        first.Result |> should equal 1L
        second.Result |> should equal 2L
        dlog.ReplayAsync(0L, ct).AsTask().Result |> Array.map _.Seq |> should equal [| 1L; 2L |])


[<Fact>]
let ``group-commit segment log live replay uses read-only scan during append`` () =
    withDir "gcdl-live-replay" (fun dir ->
        use log = new GroupCommitDiskDeltaLog<int>(dir, FixedBytesEntryCodec(8 * 1024 * 1024))
        let dlog = log :> IDeltaLog<int>
        let append = dlog.AppendAsync(ZSet.ofKeys [ 1 ], empty, ct).AsTask()
        // This must not require a read/write handle; the writer opens with
        // FileShare.Read while the append is in flight.
        dlog.ReplayAsync(0L, ct).AsTask().Wait()
        append.Wait()
        dlog.ReplayAsync(0L, ct).AsTask().Result |> Array.map _.Seq |> should equal [| 1L |])


[<Fact>]
let ``end-to-end: RecoverableSpine recovers from the group-commit segment log`` () =
    withDir "gcdl-spine" (fun dir ->
        let store = InMemorySnapshotStore<int>() :> ISnapshotStore<int>
        let live =
            use log1 = new GroupCommitDiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec))
            let s = RecoverableSpine.create (log1 :> IDeltaLog<int>) store
            for i in 1 .. 6 do s.CommitAsync(ZSet.ofKeys [ i ]).Wait()
            s.CommitAsync(ZSet.neg (ZSet.ofKeys [ 3 ])).Wait()
            s
        use log2 = new GroupCommitDiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec))
        let recovered = RecoverableSpine<int>.RecoverAsync(log2 :> IDeltaLog<int>, store).Result
        recovered.Consolidate() |> should equal (live.Consolidate())
        recovered.AppliedSeq |> should equal 7L
        (recovered.Consolidate()).[3] |> should equal 0L)


[<Fact>]
let ``end-to-end: RecoverableSpine recovers from the disk log across a fresh instance`` () =
    withDir "ddl-spine" (fun dir ->
        let store = InMemorySnapshotStore<int>() :> ISnapshotStore<int>
        // Live spine on a durable disk log.
        let live =
            let log1 = DiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec)) :> IDeltaLog<int>
            let s = RecoverableSpine.create log1 store
            for i in 1 .. 6 do s.CommitAsync(ZSet.ofKeys [ i ]).Wait()
            s.CommitAsync(ZSet.neg (ZSet.ofKeys [ 3 ])).Wait()   // retract 3
            s
        // "Restart": fresh log over the same dir, recover by full replay (no snapshot).
        let log2 = DiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec)) :> IDeltaLog<int>
        let recovered = RecoverableSpine<int>.RecoverAsync(log2, store).Result
        recovered.Consolidate() |> should equal (live.Consolidate())
        recovered.AppliedSeq |> should equal 7L
        (recovered.Consolidate()).[3] |> should equal 0L)        // retraction survived the round-trip


[<Fact>]
let ``end-to-end: snapshot+tail recovery survives a restart via the manifest`` () =
    withDir "ddl-snap-log" (fun logDir ->
        withDir "ddl-snap-store" (fun snapDir ->
            let mkLog () = DiskDeltaLog<int>(logDir, CborEntryCodec<int>(keyEnc, keyDec)) :> IDeltaLog<int>
            let mkSnap () = DiskSnapshotStore<int>(snapDir, CheckpointDeltaCodec<int>()) :> ISnapshotStore<int>
            // Live: commit, snapshot (manifest → seq 5), commit more.
            let live =
                let s = RecoverableSpine.create (mkLog ()) (mkSnap ())
                for i in 1 .. 5 do s.CommitAsync(ZSet.ofKeys [ i ]).Wait()
                s.SnapshotAsync().Wait()
                for i in 6 .. 8 do s.CommitAsync(ZSet.ofKeys [ i ]).Wait()
                s
            // Restart: FRESH log + snapshot store over the same dirs; recover via the
            // manifest alone (no externally-held pointer) — snapshot(1..5) + tail(6..8).
            let recovered = RecoverableSpine<int>.RecoverAsync(mkLog (), mkSnap ()).Result
            recovered.Consolidate() |> should equal (live.Consolidate())
            recovered.AppliedSeq |> should equal 8L))


[<Fact>]
let ``orphan .tmp from a crashed append is ignored on recovery`` () =
    withDir "ddl-orphan" (fun dir ->
        (let log = DiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec)) :> IDeltaLog<int>
         log.AppendAsync(ZSet.ofKeys [ 1 ], empty, ct).AsTask().Wait()
         log.AppendAsync(ZSet.ofKeys [ 2 ], empty, ct).AsTask().Wait())
        // Simulate a crash mid-append: a leftover, torn .delta.tmp.
        File.WriteAllText(Path.Combine(dir, "00000000000000000003.delta.tmp"), "torn-garbage")
        // Fresh instance: orphan ignored, history intact, sequence continues at 3.
        let log2 = DiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec)) :> IDeltaLog<int>
        log2.HighWater |> should equal 2L
        log2.ReplayAsync(0L, ct).AsTask().Result.Length |> should equal 2
        log2.AppendAsync(ZSet.ofKeys [ 3 ], empty, ct).AsTask().Result |> should equal 3L)


[<Fact>]
let ``recovery invariant holds over a long deterministic add/retract sequence`` () =
    withDir "ddl-invariant" (fun dir ->
        let snap = InMemorySnapshotStore<int>() :> ISnapshotStore<int>
        // 200 deterministic ops: ~1/3 are retractions, keys cycle through 0..16.
        let live =
            let s = RecoverableSpine.create (DiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec)) :> IDeltaLog<int>) snap
            for i in 1 .. 200 do
                let key = i % 17
                let z = if i % 3 = 0 then ZSet.neg (ZSet.ofKeys [ key ]) else ZSet.ofKeys [ key ]
                s.CommitAsync(z).Wait()
            s
        // Recover from a FRESH disk log (full replay): recovered == live, exactly.
        let recovered =
            RecoverableSpine<int>.RecoverAsync(
                DiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec)) :> IDeltaLog<int>, snap).Result
        recovered.Consolidate() |> should equal (live.Consolidate())
        recovered.AppliedSeq |> should equal 200L)


// ═══════════════════════════════════════════════════════════════════
// Segment rollover + physical truncation (081KTF9T0E408QG0R003C002Q5 /
// 081KTF48J3V08QG0R0010T7YJA; revived 2026-09-03): the active segment
// rolls at maxSegmentBytes; TruncateAsync deletes whole sealed segments
// the snapshot has absorbed; coverage is derived from segment NAMES
// alone; sealed-segment anomalies are loud; the legacy single segment
// upgrades in place.
// ═══════════════════════════════════════════════════════════════════

/// One record per boat, so the roll decision is taken on every append.
let private oneRecordBoats = { FerryThrottlerConfig.deterministic with MaxBatchSize = 1 }

[<Fact>]
let ``active segment ROLLS at the byte cap; replay stitches all segments in order`` () =
    withDir "gcdl-roll" (fun dir ->
        (use log = new GroupCommitDiskDeltaLog<int>(dir, FixedBytesEntryCodec 100, oneRecordBoats, maxSegmentBytes = 300L)
         let dlog = log :> IDeltaLog<int>
         for i in 1 .. 10 do dlog.AppendAsync(ZSet.ofKeys [ i ], empty, ct).AsTask().Wait()
         // ~108-byte records (100 + 8 frame) under a 300-byte cap: a roll every 3 records.
         log.SegmentPaths |> List.map Path.GetFileName
         |> should equal
             [ "delta-00000000000000000001.segment"
               "delta-00000000000000000004.segment"
               "delta-00000000000000000007.segment"
               "delta-00000000000000000010.segment" ])
        Directory.GetFiles(dir, "delta-*.segment").Length |> should equal 4
        // A fresh instance stitches the segments back into one ordered log.
        use reopened = new GroupCommitDiskDeltaLog<int>(dir, FixedBytesEntryCodec 100, oneRecordBoats, maxSegmentBytes = 300L)
        (reopened :> IDeltaLog<int>).HighWater |> should equal 10L
        (reopened :> IDeltaLog<int>).ReplayAsync(0L, ct).AsTask().Result
        |> Array.map _.Seq |> should equal [| 1L .. 10L |])

[<Fact>]
let ``TruncateAsync physically deletes sealed segments the snapshot absorbed — never the active one`` () =
    withDir "gcdl-truncate" (fun dir ->
        use log = new GroupCommitDiskDeltaLog<int>(dir, FixedBytesEntryCodec 100, oneRecordBoats, maxSegmentBytes = 300L)
        let dlog = log :> IDeltaLog<int>
        for i in 1 .. 12 do dlog.AppendAsync(ZSet.ofKeys [ i ], empty, ct).AsTask().Wait()
        // Segments cover [1,4) [4,7) [7,10) [10,∞).
        Directory.GetFiles(dir, "delta-*.segment").Length |> should equal 4
        // Truncate through 7: [1,4) and [4,7) are fully absorbed; [7,10) still holds 8 and 9.
        dlog.TruncateAsync(7L, ct).AsTask().Wait()
        Directory.GetFiles(dir, "delta-*.segment") |> Array.map Path.GetFileName |> Array.sort
        |> should equal [| "delta-00000000000000000007.segment"; "delta-00000000000000000010.segment" |]
        // Correctness: everything past the truncation point is still replayable...
        dlog.ReplayAsync(7L, ct).AsTask().Result |> Array.map _.Seq |> should equal [| 8L .. 12L |]
        // ...and the ACTIVE segment survives even a truncate past the high-water mark.
        dlog.TruncateAsync(1000L, ct).AsTask().Wait()
        Directory.GetFiles(dir, "delta-*.segment") |> Array.map Path.GetFileName
        |> should equal [| "delta-00000000000000000010.segment" |]
        dlog.ReplayAsync(0L, ct).AsTask().Result |> Array.map _.Seq |> should equal [| 10L .. 12L |]
        dlog.HighWater |> should equal 12L)

[<Fact>]
let ``a sealed segment whose last record is exactly the truncation point is deleted; one record past it survives`` () =
    withDir "gcdl-truncate-boundary" (fun dir ->
        use log = new GroupCommitDiskDeltaLog<int>(dir, FixedBytesEntryCodec 100, oneRecordBoats, maxSegmentBytes = 300L)
        let dlog = log :> IDeltaLog<int>
        for i in 1 .. 7 do dlog.AppendAsync(ZSet.ofKeys [ i ], empty, ct).AsTask().Wait()
        // [1,4) [4,7) [7,∞). Through 5: [4,7) still holds 6 → must survive; through 6 → gone.
        dlog.TruncateAsync(5L, ct).AsTask().Wait()
        Directory.GetFiles(dir, "delta-*.segment").Length |> should equal 2
        dlog.TruncateAsync(6L, ct).AsTask().Wait()
        Directory.GetFiles(dir, "delta-*.segment").Length |> should equal 1
        dlog.ReplayAsync(0L, ct).AsTask().Result |> Array.map _.Seq |> should equal [| 7L |])

[<Fact>]
let ``truncated log + snapshot still recovers the exact state across a fresh instance`` () =
    withDir "gcdl-truncate-recover" (fun dir ->
        let store = InMemorySnapshotStore<int>() :> ISnapshotStore<int>
        let liveState =
            use log1 = new GroupCommitDiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec), oneRecordBoats, maxSegmentBytes = 200L)
            let s = RecoverableSpine.create (log1 :> IDeltaLog<int>) store
            s.AutoSnapshotEvery <- 4 // snapshot + TruncateAsync every 4 commits ⇒ sealed segments get GC'd
            for i in 1 .. 15 do s.CommitAsync(if i % 3 = 0 then ZSet.neg (ZSet.ofKeys [ i % 5 ]) else ZSet.ofKeys [ i % 5 ]).Wait()
            // Bytes were actually reclaimed: fewer segments on disk than were ever opened.
            Directory.GetFiles(dir, "delta-*.segment").Length |> should be (lessThan (List.length log1.SegmentPaths + 4))
            s.Consolidate()
        use log2 = new GroupCommitDiskDeltaLog<int>(dir, CborEntryCodec<int>(keyEnc, keyDec), oneRecordBoats, maxSegmentBytes = 200L)
        let recovered = RecoverableSpine<int>.RecoverAsync(log2 :> IDeltaLog<int>, store).Result
        recovered.Consolidate() |> should equal liveState
        recovered.AppliedSeq |> should equal 15L)

[<Fact>]
let ``a pre-rollover delta.segment is honoured as the FIRST segment — in-place upgrade, no migration`` () =
    withDir "gcdl-legacy" (fun dir ->
        // Write via the current backend, then RENAME its (single) segment to the
        // legacy fixed name — byte-identical to a dir written by the v1 backend.
        (use log = new GroupCommitDiskDeltaLog<int>(dir, FixedBytesEntryCodec 100, oneRecordBoats)
         let dlog = log :> IDeltaLog<int>
         for i in 1 .. 3 do dlog.AppendAsync(ZSet.ofKeys [ i ], empty, ct).AsTask().Wait())
        let seg = Directory.GetFiles(dir, "delta-*.segment") |> Array.exactlyOne
        File.Move(seg, Path.Combine(dir, "delta.segment"))
        // A fresh instance reads the legacy segment, continues the sequence, and
        // rolls onward into numbered segments.
        use reopened = new GroupCommitDiskDeltaLog<int>(dir, FixedBytesEntryCodec 100, oneRecordBoats, maxSegmentBytes = 150L)
        let dlog = reopened :> IDeltaLog<int>
        dlog.HighWater |> should equal 3L
        for i in 4 .. 6 do dlog.AppendAsync(ZSet.ofKeys [ i ], empty, ct).AsTask().Wait()
        dlog.ReplayAsync(0L, ct).AsTask().Result |> Array.map _.Seq |> should equal [| 1L .. 6L |]
        // Truncation past the legacy coverage deletes the legacy file too.
        dlog.TruncateAsync(5L, ct).AsTask().Wait()
        File.Exists(Path.Combine(dir, "delta.segment")) |> should equal false
        dlog.ReplayAsync(0L, ct).AsTask().Result |> Array.map _.Seq |> should equal [| 6L |])

[<Fact>]
let ``an anomaly inside a SEALED segment is CORRUPTION — loud, never truncated`` () =
    withDir "gcdl-sealed-corrupt" (fun dir ->
        (use log = new GroupCommitDiskDeltaLog<int>(dir, FixedBytesEntryCodec 100, oneRecordBoats, maxSegmentBytes = 150L)
         let dlog = log :> IDeltaLog<int>
         for i in 1 .. 6 do dlog.AppendAsync(ZSet.ofKeys [ i ], empty, ct).AsTask().Wait())
        let segs = Directory.GetFiles(dir, "delta-*.segment") |> Array.sort
        segs.Length |> should be (greaterThan 1)
        // Append garbage to a SEALED (non-last) segment — a torn "tail" where no
        // torn tail can legitimately exist.
        (use fs = new FileStream(segs.[0], FileMode.Append, FileAccess.Write, FileShare.Read)
         fs.Write([| 0xDEuy; 0xADuy; 0xBEuy |], 0, 3))
        let lengthBefore = FileInfo(segs.[0]).Length
        (fun () -> new GroupCommitDiskDeltaLog<int>(dir, FixedBytesEntryCodec 100, oneRecordBoats, maxSegmentBytes = 150L) |> ignore)
        |> should throw typeof<System.InvalidOperationException>
        // ...and the loud path did NOT quietly truncate the sealed file on its way out.
        FileInfo(segs.[0]).Length |> should equal lengthBefore)

[<Fact>]
let ``a non-positive segment cap is rejected at construction`` () =
    withDir "gcdl-bad-cap" (fun dir ->
        (fun () -> new GroupCommitDiskDeltaLog<int>(dir, FixedBytesEntryCodec 100, oneRecordBoats, maxSegmentBytes = 0L) |> ignore)
        |> should throw typeof<System.ArgumentException>)
