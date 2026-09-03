namespace Zeta.Core

open System
open System.Collections.Generic
open System.Globalization
open System.IO
open System.Threading
open System.Threading.Tasks


[<Struct>]
type private GroupCommitDeltaAppendRequest =
    { Seq: int64
      Record: byte[] }


/// Disk-backed `IDeltaLog` — one file per entry under a directory, named by
/// zero-padded sequence (`{seq:020}.delta`). File-per-entry is git-native-friendly
/// (diffable, mirrors the agent-bus folder/G-Set pattern) and makes truncation a
/// delete, not a rewrite. Delta bytes go through the pluggable `IDeltaCodec`
/// (Checkpoint today, canonical CBOR/YAML later — no log changes). Genuine async
/// I/O (`File.*Async`); `fsyncPerAppend` writes through to stable storage before
/// the append completes. Single-writer per shard (writer-actor model).
///
/// Frame per file: `[capLen:int32-LE][capturedJson][deltaLen:int32-LE][deltaBytes]`
/// (seq lives in the filename). Captured non-determinism is a JSON object so the
/// metadata stays readable independent of the delta codec.
[<Sealed>]
type DiskDeltaLog<'K when 'K : comparison>
    (dir: string, entryCodec: IEntryCodec<'K>, ?fsyncPerAppend: bool) =

    let fsync = defaultArg fsyncPerAppend false
    let root = Path.GetFullPath dir
    do FileSystem.Current.CreateDirectory root
    let gate = obj ()

    let nameFor (seq: int64) = Path.Combine(root, sprintf "%020d.delta" seq)
    let seqOf (path: string) =
        match Int64.TryParse(Path.GetFileNameWithoutExtension path) with
        | true, v -> ValueSome v
        | _ -> ValueNone

    // Recover the high-water mark from any existing entry files on construction
    // (so a reopened log continues its sequence rather than restarting at 0).
    let mutable nextSeq =
        let existing =
            Directory.GetFiles(root, "*.delta")
            |> Array.choose (fun p -> match seqOf p with ValueSome v -> Some v | ValueNone -> None)
        if existing.Length = 0 then 0L else Array.max existing

    // One file = the WHOLE entry (Seq + Delta + Captured) through the canonical `IEntryCodec`
    // (the 4-language byte-locked DeltaLogEntryCodec format) — no per-backend framing, no System.Text.Json.
    let frame (entry: DeltaLogEntry<'K>) : byte[] = entryCodec.Encode entry

    let unframe (bytes: byte[]) : DeltaLogEntry<'K> = entryCodec.Decode bytes

    // Atomic append: write to a `.delta.tmp` then rename to `.delta`. A crash
    // mid-write leaves at most an orphan `.tmp` (ignored by the `*.delta` glob),
    // never a partial/torn `.delta` entry — so recovery never sees a corrupt entry
    // (crash-consistency by construction, like the snapshot store's temp+rename).
    let writeFileAsync (path: string) (bytes: byte[]) (ct: CancellationToken) : Task =
        task {
            let tmp = path + ".tmp"
            do! (task {
                    use fs: Stream = FileSystem.Current.OpenWrite(tmp, fsync)
                    let vt = fs.WriteAsync(ReadOnlyMemory bytes, ct)
                    if vt.IsCompletedSuccessfully then
                        vt.GetAwaiter().GetResult()
                    else
                        do! vt.ConfigureAwait(false)
                    let flush = fs.FlushAsync ct
                    if not flush.IsCompletedSuccessfully then
                        do! flush.ConfigureAwait(false)
                    if fsync then
                        match fs with
                        | :? FileStream as fileStream -> fileStream.Flush(flushToDisk = true)
                        | _ -> ()
                 } : Task)
            FileSystem.Current.Move(tmp, path, true)   // atomic publish of the complete entry
            if fsync then FileSync.fsyncDirBestEffort root      // durably commit the new dir entry
        }
        :> Task

    interface IDeltaLog<'K> with
        member _.AppendAsync(delta, captured, ct) =
            let seq = lock gate (fun () -> nextSeq <- nextSeq + 1L; nextSeq)
            let bytes = frame (DeltaLogEntry<'K>(seq, delta, captured))
            task {
                do! writeFileAsync (nameFor seq) bytes ct
                return seq
            }
            |> ValueTask<int64>

        member _.ReplayAsync(fromSeqExclusive, ct) =
            let files =
                FileSystem.Current.GetFiles(root, "*.delta")
                |> Array.choose (fun p ->
                    match seqOf p with
                    | ValueSome v when v > fromSeqExclusive -> Some(v, p)
                    | _ -> None)
                |> Array.sortBy fst
            task {
                let entries = ResizeArray<DeltaLogEntry<'K>>()
                for (_seq, path) in files do
                    let! bytes = FileSystem.Current.ReadAllBytesAsync(path, ct)
                    // The entry's Seq rides inside the canonical bytes (== the file-name seq we wrote).
                    entries.Add(unframe bytes)
                return entries.ToArray()
            }
            |> ValueTask<DeltaLogEntry<'K>[]>

        member _.HighWater = lock gate (fun () -> nextSeq)

        member _.TruncateAsync(throughSeqInclusive, _ct) =
            let toDelete =
                FileSystem.Current.GetFiles(root, "*.delta")
                |> Array.choose (fun p ->
                    match seqOf p with
                    | ValueSome v when v <= throughSeqInclusive -> Some p
                    | _ -> None)
            // Thermodynamic class: ERASING through the read surface (the files are unlinked and
            // this backend keeps no second copy) and UNMEASURED at the medium — see the two rows
            // in `ErasureProfiles`. Note the swallowed failure: a delete that throws leaves the
            // file in place, so a *failed* call is quietly the identity. That is sound in the
            // Landauer direction (never over-charges) and unsound in the privacy direction, which
            // is why the medium-level row is not allowed to claim erasure.
            for p in toDelete do
                try FileSystem.Current.Delete p with _ -> ()
            ValueTask.CompletedTask

    /// **The declaration, beside the operation it classifies** (`ErasureClass`).
    ///
    /// Two rows for one method, because "is the preimage recoverable" is not a question until you
    /// say *through what*. Through this log's own read surface the deltas are gone. Through the
    /// storage medium nobody in this process can say: `Delete` unlinks a name, and whether the
    /// bytes survive in a journal, an SSD's remapped block, a snapshot or a backup is outside
    /// anything a sweep here can observe. Averaging those two into one class would be a guess
    /// wearing a measurement's clothes.
    interface IErasureDeclaring with
        member _.ErasureProfiles =
            [ { Representation = "DiskDeltaLog"
                Operation = "IDeltaLog.TruncateAsync"
                Observation = "the log's own read surface (ReplayAsync(0) plus HighWater), at a pinned truncation point"
                RecoveryChannel =
                    "none — the .delta files are unlinked; unlike GitDeltaLog no parent commit \
                     retains them, and unlike ZetaFsDeltaLog no orphaned object is left behind. \
                     HighWater survives, because it is a field rather than a fold over the files, \
                     so how MANY entries were destroyed is still legible after they are gone"
                Classification = ErasureClass.ThermodynamicClass.Erasing
                Evidence = ErasureClass.Evidence.BoundedModelSweep("truncate-through pinned at 2 (truncate everything); logs of 0-2 deltas over {empty, +a, -a}, on a real temp directory", 9, 3_169_925L) }

              { Representation = "DiskDeltaLog"
                Operation = "IDeltaLog.TruncateAsync"
                Observation = "the storage medium after unlink"
                RecoveryChannel =
                    "unknown — File.Delete removes a directory entry; journal replay, SSD block \
                     remapping, filesystem snapshots and backups are all outside this process's \
                     observation, and the catch-all on the delete means even the unlink is not \
                     guaranteed to have happened"
                Classification = ErasureClass.ThermodynamicClass.Unmeasured
                Evidence =
                    ErasureClass.Evidence.NoAdmissibleMeasurement
                        "no sweep run from inside this process can observe the medium; classifying this as Reversible would claim recoverability we cannot deliver and classifying it as Erasing would claim destruction we cannot deliver either" } ]


/// Segment-backed `IDeltaLog` with group-commit fsync. Unlike
/// `DiskDeltaLog`, which writes one file per entry for audit/git-native
/// inspectability, this hot-path backend appends framed records to segment
/// files and routes appends through `FerryThrottler<'TItem,'TResult>`. Each ferry
/// boat writes N records then performs one `Flush(true)` before completing the N
/// caller tasks. Single-WRITER (one active segment at a time), so
/// `MaxDegreeOfParallelism` must be 1; segment sharding/striping is a later
/// scale-out backend, not an implicit behavior here.
///
/// **Segment rollover + physical truncation** (081KTF9T0E408QG0R003C002Q5 /
/// 081KTF48J3V08QG0R0010T7YJA — the increment the v1 no-op `TruncateAsync` named
/// next; revived 2026-09-03 from `otto/agent-sovereign-keys-proposal`). Segments
/// are named `delta-{firstSeq:020}.segment` (the first record's sequence — so a
/// segment's coverage is `[itsFirstSeq, nextSegment.firstSeq)`, derivable from
/// names alone, no index file to drift). The ACTIVE (last) segment rolls when it
/// reaches `maxSegmentBytes`: the next boat seals it and opens a new segment
/// named by that boat's first sequence. `TruncateAsync(seq)` then physically
/// deletes whole SEALED segments whose coverage lies at or below `seq` (the
/// snapshot has absorbed them) — the active segment is never deleted. Classic
/// WAL segment GC (ARIES: Mohan et al. 1992; SQLite WAL checkpointing; Kafka log
/// segments). A pre-rollover `delta.segment` is honoured as the FIRST segment
/// (sorted before every numbered one), so existing dirs upgrade in place with
/// no migration step.
///
/// Record frame:
/// `[len:int32-LE][crc32c:uint32-LE][payload]`, where payload is
/// `[seq:int64-LE][capLen:int32-LE][capturedJson][deltaLen:int32-LE][deltaBytes]`.
/// Recovery scans segments in order. Torn-write handling is POSITIONAL: only
/// the ACTIVE segment can carry a torn trailing record (every sealed segment
/// was flushed through by its final boat before the roll), so a torn tail
/// there is truncated/ignored — but ANY anomaly inside a SEALED segment is
/// genuine corruption and fails loudly, as does non-trailing CRC corruption
/// anywhere.
[<Sealed>]
type GroupCommitDiskDeltaLog<'K when 'K : comparison>
    (dir: string,
     entryCodec: IEntryCodec<'K>,
     ?config: FerryThrottlerConfig,
     ?maxBatchBytes: int,
     ?maxSegmentBytes: int64,
     ?useBlockIo: bool) =

    let root = Path.GetFullPath dir
    // Bind the door at construction. Background ferries must not re-read
    // FileSystem.Current (AsyncLocal does not survive every channel wake).
    let fsDoor = FileSystem.Current
    do fsDoor.CreateDirectory root
    /// Opt-in `FileSystemBlockIo` + dual-slot `ZGL2` superblock. Default is
    /// still the whole-file stream path so existing Dispose crash tests keep
    /// their door. Crash/corrupt/reorder then tear the LBA, not the file.
    let viaBlockIo = defaultArg useBlockIo false

    /// Roll threshold for the active segment. The default favours few large
    /// segments; tests (and the erasure law pack) dial it down to force rollover.
    let segmentCap = defaultArg maxSegmentBytes (64L * 1024L * 1024L)
    do
        if segmentCap <= 0L then
            invalidArg (nameof maxSegmentBytes) "GroupCommitDiskDeltaLog: maxSegmentBytes must be positive."

    let legacySegmentPath = Path.Combine(root, "delta.segment")
    let segmentNameFor (firstSeq: int64) = Path.Combine(root, sprintf "delta-%020d.segment" firstSeq)

    /// Parse `delta-{seq:020}.segment` → the segment's first sequence. Anything
    /// else in the directory (the legacy name, foreign files) is `ValueNone`.
    let firstSeqOf (path: string) : int64 voption =
        let name = Path.GetFileName path
        if name.StartsWith("delta-", StringComparison.Ordinal) && name.EndsWith(".segment", StringComparison.Ordinal) then
            let digits = name.AsSpan(6, name.Length - 6 - ".segment".Length)
            match Int64.TryParse(digits, NumberStyles.None, CultureInfo.InvariantCulture) with
            | true, v -> ValueSome v
            | _ -> ValueNone
        else
            ValueNone

    /// Discover segments in coverage order: the legacy unnumbered segment (if
    /// present) FIRST — it predates rollover, so it holds the earliest
    /// sequences (sentinel key 0; real sequences start at 1) — then the
    /// numbered segments by their embedded first-sequence. The glob is
    /// `*.segment` (a suffix) rather than `delta-*.segment` so the same
    /// discovery runs unchanged over the in-memory test filesystem, whose
    /// `GetFiles` matches suffixes only; the prefix is checked here.
    let discoverSegments () : ResizeArray<struct (int64 * string)> =
        let found = ResizeArray<struct (int64 * string)>()
        if fsDoor.Exists legacySegmentPath then
            found.Add(struct (0L, legacySegmentPath))
        fsDoor.GetFiles(root, "*.segment")
        |> Array.choose (fun p ->
            match firstSeqOf p with
            | ValueSome v -> Some(struct (v, p))
            | ValueNone -> None)
        |> Array.sortBy (fun (struct (s, _)) -> s)
        |> found.AddRange
        found

    let gate = obj ()
    // Segment list + active-segment size, guarded by `gate` (the ferry is the
    // single writer, but TruncateAsync and recovery scans run off-boat).
    let segments = discoverSegments ()

    let segmentLength (path: string) : int64 =
        if not (fsDoor.Exists path) then
            0L
        elif viaBlockIo then
            let io = FileSystemBlockIo(fsDoor, path, 4096)
            match BlockSuper.tryReadGroup (io :> IBlockIo) with
            | Some n when n > 0L -> n
            | _ -> 0L
        else
            use fs = fsDoor.OpenFile(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite)
            fs.Length

    let mutable activeSize =
        if segments.Count = 0 then 0L
        else
            let struct (_, last) = segments.[segments.Count - 1]
            segmentLength last

    let baseConfig =
        match config with
        | Some c -> c
        | None -> { FerryThrottlerConfig.deterministic with MaxBatchSize = 64 }

    let ferryConfig =
        match maxBatchBytes with
        | Some bytes -> { baseConfig with MaxBatchBytes = Some bytes }
        | None -> baseConfig
    do
        if ferryConfig.MaxDegreeOfParallelism <> 1 then
            invalidArg
                (nameof config)
                "GroupCommitDiskDeltaLog writes one active segment file; MaxDegreeOfParallelism must be 1."

    // The record PAYLOAD is the WHOLE entry (Seq + Delta + Captured) through the canonical `IEntryCodec`
    // (the 4-language byte-locked format); the record wrapper (`frameRecord`: [len][crc][payload]) is kept
    // for torn-write scanning. No per-payload framing, no System.Text.Json.
    let framePayload (entry: DeltaLogEntry<'K>) : byte[] = entryCodec.Encode entry

    let frameRecord (payload: byte[]) : byte[] =
        use ms = new MemoryStream()
        use bw = new BinaryWriter(ms)
        bw.Write(payload.Length)
        bw.Write(HardwareCrc.Crc32C(ReadOnlySpan payload))
        bw.Write(payload)
        bw.Flush()
        ms.ToArray()

    let decodePayload (payload: byte[]) : DeltaLogEntry<'K> = entryCodec.Decode payload

    /// Scan one segment. A SEALED segment admits NO anomaly (its final boat
    /// flushed through before the roll — a torn tail there is corruption, loud);
    /// the active segment's torn TRAILING record is truncated (`ReadWrite`
    /// recovery scan) or ignored (read-only live replay). Non-trailing CRC
    /// corruption is loud everywhere.
    let scanFromStream
        (fs: Stream)
        (isSealed: bool)
        (truncateTrailingTornWrite: bool)
        (name: string)
        : DeltaLogEntry<'K>[] =
        use br = new BinaryReader(fs, Text.Encoding.UTF8, leaveOpen = true)
        let entries = ResizeArray<DeltaLogEntry<'K>>()
        let torn (recordStart: int64) (what: string) =
            if isSealed then
                invalidOp
                    $"GroupCommitDiskDeltaLog: {what} at byte {recordStart} in SEALED segment {name} — corruption (a torn write can only trail the active segment)."
            elif truncateTrailingTornWrite then
                fs.SetLength recordStart
        let mutable scanning = true
        while scanning do
            let recordStart = fs.Position
            if fs.Length - fs.Position = 0L then
                scanning <- false
            elif fs.Length - fs.Position < 8L then
                torn recordStart "short record header"
                scanning <- false
            else
                let len = br.ReadInt32()
                let expectedCrc = br.ReadUInt32()
                if len < 0 then
                    invalidOp $"GroupCommitDiskDeltaLog: negative record length {len} at byte {recordStart} in {name}."
                elif fs.Length - fs.Position < int64 len then
                    torn recordStart "short record body"
                    scanning <- false
                else
                    let payload = br.ReadBytes len
                    let actualCrc = HardwareCrc.Crc32C(ReadOnlySpan payload)
                    if actualCrc <> expectedCrc then
                        if fs.Position = fs.Length && not isSealed then
                            torn recordStart "trailing CRC mismatch"
                            scanning <- false
                        else
                            invalidOp
                                $"GroupCommitDiskDeltaLog: CRC mismatch at byte {recordStart} in {name} (expected 0x{expectedCrc:X8}, got 0x{actualCrc:X8})."
                    else
                        entries.Add(decodePayload payload)
        entries.ToArray()

    let scanSegment (path: string) (isSealed: bool) (truncateTrailingTornWrite: bool) : DeltaLogEntry<'K>[] =
        if not (fsDoor.Exists path) then
            [||]
        elif viaBlockIo then
            let io = FileSystemBlockIo(fsDoor, path, 4096)
            let device = io :> IBlockIo
            match BlockSuper.tryReadGroup device with
            | Some logical when logical > 0L ->
                let bytes = BlockLog.readAt device (BlockLog.origin device) logical
                use ms = new MemoryStream(bytes, 0, bytes.Length, writable = true, publiclyVisible = true)
                let entries = scanFromStream ms isSealed truncateTrailingTornWrite (Path.GetFileName path)
                if truncateTrailingTornWrite && ms.Length <> logical then
                    BlockSuper.writeGroup device ms.Length
                entries
            | _ -> [||]
        else
            let access = if truncateTrailingTornWrite then FileAccess.ReadWrite else FileAccess.Read
            use fs: Stream = fsDoor.OpenFile(path, FileMode.Open, access, FileShare.ReadWrite)
            scanFromStream fs isSealed truncateTrailingTornWrite (Path.GetFileName path)

    /// Scan every segment in coverage order. Only the LAST is active.
    let scanEntries (truncateTrailingTornWrite: bool) : DeltaLogEntry<'K>[] =
        let segs = lock gate (fun () -> segments.ToArray())
        [| for i in 0 .. segs.Length - 1 do
               let struct (_, path) = segs.[i]
               let isSealed = i < segs.Length - 1
               yield! scanSegment path isSealed (truncateTrailingTornWrite && not isSealed) |]

    let mutable nextSeq =
        let recovered = scanEntries true
        // The recovery scan may have truncated a torn tail — re-read the active size.
        lock gate (fun () ->
            if segments.Count > 0 then
                let struct (_, last) = segments.[segments.Count - 1]
                activeSize <- segmentLength last)
        if recovered.Length = 0 then 0L else recovered |> Array.maxBy _.Seq |> _.Seq

    let appendBoat (boat: ReadOnlyMemory<GroupCommitDeltaAppendRequest>) (ct: CancellationToken) : Task<int64 array> =
        task {
            // Roll decision at boat start: no segment yet, or the active one has
            // reached the cap — open a new segment named by this boat's first
            // sequence (so names alone encode coverage). Under `gate`: the ferry
            // is the only writer, but TruncateAsync reads the list concurrently.
            let struct (segPath, createdSegment) =
                lock gate (fun () ->
                    if segments.Count = 0 || activeSize >= segmentCap then
                        let path = segmentNameFor boat.Span.[0].Seq
                        segments.Add(struct (boat.Span.[0].Seq, path))
                        activeSize <- 0L
                        struct (path, true)
                    else
                        let struct (_, last) = segments.[segments.Count - 1]
                        struct (last, not (fsDoor.Exists last)))
            if viaBlockIo then
                let io = FileSystemBlockIo(fsDoor, segPath, 4096)
                let device = io :> IBlockIo
                let origin = BlockLog.origin device
                let logical =
                    match BlockSuper.tryReadGroup device with
                    | Some n when n > 0L -> n
                    | _ -> 0L
                let mutable pos = origin + logical
                for i in 0 .. boat.Length - 1 do
                    pos <-
                        BlockLog.append
                            device
                            pos
                            (System.ReadOnlyMemory<byte>.op_Implicit boat.Span.[i].Record)
                let newLogical = pos - origin
                // Superblock after payload. Crash on the payload WriteAt leaves
                // the previous generation; crash on the inactive slot does too.
                BlockSuper.writeGroup device newLogical
                device.Flush()
                if createdSegment then
                    FileSync.fsyncDirBestEffort root
                lock gate (fun () -> activeSize <- newLogical)
            else
                let stream: Stream = fsDoor.OpenFile(segPath, FileMode.Append, FileAccess.Write, FileShare.Read)
                let mutable written = 0L
                // Dispose/commit before the boat result. Crash-mid-write on Dispose
                // must fault ProcessAsync; Ok-then-throw would ack a torn segment.
                try
                    for i in 0 .. boat.Length - 1 do
                        let record = boat.Span.[i].Record
                        let vt = stream.WriteAsync(ReadOnlyMemory record, ct)
                        // FileStream's WriteAsync is a pooled ValueTask. AsTask()
                        // would allocate a Task per record; GetResult is legal
                        // only because this branch is already complete.
                        if vt.IsCompletedSuccessfully then
                            vt.GetAwaiter().GetResult()
                        else
                            do! vt.ConfigureAwait(false)
                        written <- written + int64 record.Length

                    let flush = stream.FlushAsync ct
                    if not flush.IsCompletedSuccessfully then
                        do! flush.ConfigureAwait(false)

                    match stream with
                    | :? FileStream as fileStream -> fileStream.Flush(flushToDisk = true)
                    | _ -> stream.Flush()
                    if createdSegment then
                        FileSync.fsyncDirBestEffort root
                finally
                    stream.Dispose()
                lock gate (fun () -> activeSize <- activeSize + written)
            return [| for i in 0 .. boat.Length - 1 -> boat.Span.[i].Seq |]
        }

    let throttler =
        new FerryThrottler<GroupCommitDeltaAppendRequest, int64>(
            ferryConfig,
            appendBoat,
            itemSizeBytes = (fun req -> req.Record.Length))

    /// The segment files currently making up the log, in coverage order. A
    /// read-only view for tests and tooling; the last entry is the active segment.
    member _.SegmentPaths : string list =
        lock gate (fun () -> [ for struct (_, p) in segments -> p ])

    interface IDeltaLog<'K> with
        member _.AppendAsync(delta, captured, ct) =
            if ct.IsCancellationRequested then
                ValueTask<int64>(Task.FromCanceled<int64> ct)
            else
                let seq = lock gate (fun () -> nextSeq <- nextSeq + 1L; nextSeq)
                let payload = framePayload (DeltaLogEntry<'K>(seq, delta, captured))
                let req = { Seq = seq; Record = frameRecord payload }
                // Admit-shield (tested): once the seq is minted the boat writes
                // even if the caller later cancels. The token is still the door
                // *before* admit (`IsCancellationRequested` above). Passing None
                // into ProcessAsync is that policy, not a missing DST seam.
                throttler.ProcessAsync(req, CancellationToken.None)

        member _.ReplayAsync(fromSeqExclusive, ct) =
            if ct.IsCancellationRequested then
                ValueTask<DeltaLogEntry<'K>[]>(Task.FromCanceled<DeltaLogEntry<'K>[]> ct)
            else
                scanEntries false
                |> Array.filter (fun e -> e.Seq > fromSeqExclusive)
                |> Array.sortBy _.Seq
                |> ValueTask<DeltaLogEntry<'K>[]>

        member _.HighWater = lock gate (fun () -> nextSeq)

        member _.TruncateAsync(throughSeqInclusive, _ct) =
            // Physically drop whole SEALED segments fully absorbed by the
            // snapshot: sealed segment i covers [firstSeq(i), firstSeq(i+1)),
            // derivable from names alone. The ACTIVE (last) segment is never
            // deleted — logical filtering (`ReplayAsync(fromSeqExclusive)`)
            // continues to mask any absorbed prefix it still holds.
            let toDelete =
                lock gate (fun () ->
                    // Walk sealed segments from the front; stop at the first survivor
                    // (coverage is monotone, so nothing after it can be dead either).
                    let dead = ResizeArray<string>()
                    let mutable i = 0
                    let mutable stop = false
                    while not stop && i < segments.Count - 1 do
                        let struct (_, path) = segments.[i]
                        let struct (nextFirst, _) = segments.[i + 1]
                        if nextFirst - 1L <= throughSeqInclusive then
                            dead.Add path
                            i <- i + 1
                        else
                            stop <- true
                    dead)
            // A segment leaves the in-memory list only once its unlink SUCCEEDED. A
            // failed unlink keeps the segment listed, so the next TruncateAsync
            // retries it and a fresh instance rediscovers it — the failure is
            // NOT swallowed into "gone"; it is deferred, and the medium-level
            // erasure row below refuses to claim more than that. Truncation is
            // GC after a durable snapshot, so it must not fault the commit that
            // already succeeded; that is why the exception is not rethrown.
            for p in toDelete do
                let unlinked =
                    try
                        if fsDoor.Exists p then fsDoor.Delete p
                        true
                    with :? IOException | :? UnauthorizedAccessException -> false
                if unlinked then
                    lock gate (fun () ->
                        let idx = segments.FindIndex(fun (struct (_, q)) -> String.Equals(q, p, StringComparison.Ordinal))
                        if idx >= 0 && idx < segments.Count - 1 then segments.RemoveAt idx)
            ValueTask.CompletedTask

    /// **The declaration, beside the operation it classifies** (`ErasureClass`).
    ///
    /// Three rows for one method, because the answer depends on two things the method
    /// signature does not show: whether a roll has happened (only SEALED segments are ever
    /// unlinked) and what you observe through. The v1 row ("reversible because unimplemented")
    /// was written to fail the day compaction landed; it did, and these rows replace it.
    interface IErasureDeclaring with
        member _.ErasureProfiles =
            [ { Representation = "GroupCommitDiskDeltaLog"
                Operation = "IDeltaLog.TruncateAsync"
                Observation = "the log's own read surface (ReplayAsync(0) plus HighWater), at a pinned truncation point"
                RecoveryChannel =
                    "everything — IN THIS MODEL. Under the default 64 MiB segment cap a two-record log \
                     never rolls, every record lives in the active segment, and the active segment is \
                     never unlinked, so the call is the identity here. This is reversible by model \
                     size, not by design: the next row is the same operation over a cap that forces a \
                     roll, and it erases"
                Classification = ErasureClass.ThermodynamicClass.Reversible
                Evidence =
                    ErasureClass.Evidence.BoundedModelSweep(
                        "truncate-through pinned at 2 (truncate everything); logs of 0-2 deltas over {empty, +a, -a}, on a real temp directory, default segment cap (no roll)",
                        1,
                        0L) }

              { Representation = "GroupCommitDiskDeltaLog"
                Operation = "IDeltaLog.TruncateAsync"
                Observation =
                    "the log's own read surface (ReplayAsync(0) plus HighWater), at a pinned truncation point, with the segment cap forced to one byte so every boat seals its predecessor"
                RecoveryChannel =
                    "only the active segment — every SEALED segment at or below the truncation point is \
                     unlinked, and this backend keeps no second copy. HighWater survives (a field, not a \
                     fold over the files), so how MANY records were absorbed stays legible; which deltas \
                     they carried does not"
                Classification = ErasureClass.ThermodynamicClass.Erasing
                Evidence =
                    ErasureClass.Evidence.BoundedModelSweep(
                        "truncate-through pinned at 2 (truncate everything); logs of 0-2 deltas over {empty, +a, -a}, on a real temp directory, maxSegmentBytes = 1 and MaxBatchSize = 1 (every append rolls)",
                        3,
                        1_584_963L) }

              { Representation = "GroupCommitDiskDeltaLog"
                Operation = "IDeltaLog.TruncateAsync"
                Observation = "the storage medium after unlink"
                RecoveryChannel =
                    "unknown — Delete removes a directory entry; journal replay, SSD block remapping, \
                     filesystem snapshots and backups are all outside this process's observation. A \
                     failed unlink is deferred (the segment stays listed and is retried), not swallowed, \
                     but deferral is still not a measurement of the medium"
                Classification = ErasureClass.ThermodynamicClass.Unmeasured
                Evidence =
                    ErasureClass.Evidence.NoAdmissibleMeasurement
                        "no sweep run from inside this process can observe the medium; classifying this as Reversible would claim recoverability we cannot deliver and classifying it as Erasing would claim destruction we cannot deliver either" } ]

    interface IDisposable with
        member _.Dispose() = (throttler :> IDisposable).Dispose()

    // Deterministic, non-blocking disposal — forwards to the throttler's awaited
    // drain. Prefer this over `Dispose` wherever an async disposal scope exists
    // (`use!` in a task/async), so the group-commit ferries flush replayably.
    interface IAsyncDisposable with
        member _.DisposeAsync() = (throttler :> IAsyncDisposable).DisposeAsync()
