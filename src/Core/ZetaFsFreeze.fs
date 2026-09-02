namespace Zeta.Core

open System
open System.Buffers.Binary
open System.Collections.Generic
open System.IO
open System.Threading
open System.Threading.Tasks
open Zeta.Core.FSharp.Blake3

/// WAL freeze (E2 / PR7). Snapshot mutbuf G, Jumprope that snapshot, log
/// freeze-intent then CAS puts then freeze-commit. Durable fsyncs every
/// leaf+trunk **before** commit and withholds the ack. Readable iff commit
/// exists and every leaf is present. Crash-mid-write *intercept* is
/// `InMemoryFileSystem.ArmCrashMidWrite`. Freeze-log replay / recovery stays
/// `toy` until the rest of the PR12 corpus.
///
/// DoP=1 on this log. No Task.Run except the ferry launch (injected context
/// on the DST path; `manual` + `PumpToIdleAsync` for tests).
///
/// ZD2 / D4: Journaled and Durable log appends go through `FerryThrottler`
/// the way `GroupCommitDiskDeltaLog` already does. One boat writes N freeze
/// records then one Flush/fsync. Buffered still skips the log.
///
/// Cancellation: `freezeAsync` takes the token (DST / Generic Host
/// `ApplicationStopping`). Nested ferry calls pass it through. There is no
/// ambient token (noninterference). Cancel before admit skips the boat;
/// cancel after admit still writes (same shield as group-commit).
module ZetaFsFreeze =

    type DurabilityClass =
        | Buffered
        | Journaled
        | Durable

    type FreezeError =
        | Fsync of FileSync.FileSyncError
        | WindowsDurableNotClaimed
        | MissingLeaves of int
        | Observer of string
        | Malformed of string
        | Crypto of ZetaFsCrypto.CryptoError

    type FreezeResult =
        { Entity: ZetaFsNamespace.EntityId
          Content: ContentHash256
          Span: uint64
          Class: DurabilityClass
          Generation: uint64
          IntentLsn: int64
          CommitLsn: int64 }

    type IDurabilityObserver =
        abstract OnJournaled: FreezeResult -> Result<unit, FreezeError>
        abstract OnDurable: FreezeResult -> Result<unit, FreezeError>

    type internal LogItem =
        { IntentLsn: int64
          CommitLsn: int64
          Frames: byte[]
          Durable: bool
          ObjectIds: ContentHash256[]
          Reply: TaskCompletionSource<Result<struct (int64 * int64), FreezeError>> }

    /// DoP=1 segment writer. One boat = N freezes, one Flush; Durable adds one
    /// fsync of objects-dir + log. `manual` is the DST pump (no background ferry).
    [<Sealed>]
    type internal FreezeLog
        (storeDir: string, config: FerryThrottlerConfig, manual: bool) =

        do
            if config.MaxDegreeOfParallelism <> 1 then
                invalidArg (nameof config) "FreezeLog writes one segment file; MaxDegreeOfParallelism must be 1."

        let logDir = Path.Combine(storeDir, "log")
        let logPath = Path.Combine(logDir, "freeze")
        let objectsDir = Path.Combine(storeDir, "objects")
        let fsDoor = FileSystem.Current
        let mutable boats = 0
        let mutable lastBoat = 0

        let processBatch (boat: ReadOnlyMemory<LogItem>) (ct: CancellationToken) : Task =
            let succeed (err: FreezeError option) =
                for i in 0 .. boat.Length - 1 do
                    let it = boat.Span.[i]
                    let outcome =
                        match err with
                        | Some e -> Error e
                        | None -> Ok(struct (it.IntentLsn, it.CommitLsn))

                    it.Reply.TrySetResult outcome |> ignore

                Task.CompletedTask

            let fail (ex: exn) =
                for i in 0 .. boat.Length - 1 do
                    boat.Span.[i].Reply.TrySetException ex |> ignore

                Task.CompletedTask

            try
                ct.ThrowIfCancellationRequested()
                boats <- boats + 1
                lastBoat <- boat.Length
                fsDoor.CreateDirectory logDir
                let mutable err: FreezeError option = None
                let anyDurable =
                    let mutable d = false
                    let mutable i = 0

                    while i < boat.Length do
                        if boat.Span.[i].Durable then
                            d <- true

                        i <- i + 1

                    d

                if anyDurable then
                    let mutable i = 0

                    while err.IsNone && i < boat.Length do
                        let item = boat.Span.[i]

                        if item.Durable then
                            let mutable j = 0

                            while err.IsNone && j < item.ObjectIds.Length do
                                let hex = (ContentHash256.toContentAddress128 item.ObjectIds.[j]).ToHex()
                                let path = Path.Combine(objectsDir, hex.Substring(0, 2), hex.Substring(2))

                                match FileSync.fsyncFile path with
                                | Ok() -> ()
                                | Error e -> err <- Some(FreezeError.Fsync e)

                                j <- j + 1

                        i <- i + 1

                    if err.IsNone then
                        match FileSync.fsyncDir objectsDir with
                        | Error e -> err <- Some(FreezeError.Fsync e)
                        | Ok() -> ()

                // Commit (Dispose) before Reply. A crash-mid-write on Dispose must
                // fault the boat; Ok-then-throw would lie that the log is durable.
                do
                    use stream = fsDoor.OpenFile(logPath, FileMode.Append, FileAccess.Write, FileShare.Read)

                    if err.IsNone then
                        for i in 0 .. boat.Length - 1 do
                            let frames = boat.Span.[i].Frames
                            stream.Write(frames, 0, frames.Length)

                        stream.Flush()

                    if err.IsNone && anyDurable then
                        match FileSync.fsyncFile logPath with
                        | Error e -> err <- Some(FreezeError.Fsync e)
                        | Ok() ->
                            match FileSync.fsyncDir logDir with
                            | Error e -> err <- Some(FreezeError.Fsync e)
                            | Ok() -> ()

                succeed err
            with
            | ex -> fail ex

        let throttler = new FerryThrottler<LogItem>(config, processBatch, manual = manual)

        member _.Boats = boats
        member _.LastBoatSize = lastBoat
        member _.LogPath = logPath

        member _.SubmitAsync(item: LogItem, ct: CancellationToken) : ValueTask<Result<struct (int64 * int64), FreezeError>> =
            if ct.IsCancellationRequested then
                item.Reply.TrySetCanceled ct |> ignore
                ValueTask<Result<struct (int64 * int64), FreezeError>>(Task.FromCanceled<Result<struct (int64 * int64), FreezeError>> ct)
            else
                let write = throttler.EnqueueAsync(item, ct)
                let wait (enqueue: ValueTask) =
                    task {
                        try
                            if not enqueue.IsCompletedSuccessfully then
                                do! enqueue.AsTask().ConfigureAwait(false)

                            return! item.Reply.Task.WaitAsync(ct).ConfigureAwait(false)
                        with
                        | :? OperationCanceledException as ex ->
                            item.Reply.TrySetCanceled ct |> ignore
                            return raise ex
                        | ex ->
                            item.Reply.TrySetException ex |> ignore
                            return raise ex
                    }

                if write.IsCompletedSuccessfully then
                    ValueTask<Result<struct (int64 * int64), FreezeError>>(wait (ValueTask()))
                else
                    ValueTask<Result<struct (int64 * int64), FreezeError>>(wait write)

        member _.PumpToIdleAsync(?cancellationToken: CancellationToken) =
            throttler.PumpToIdleAsync(?cancellationToken = cancellationToken)

        interface IDisposable with
            member _.Dispose() = (throttler :> IDisposable).Dispose()

    [<Sealed>]
    type Volume
        (
            storeDir: string,
            mutbuf: ZetaFsMutbuf.Catalog,
            observer: IDurabilityObserver option,
            session: ZetaFsCrypto.Session option,
            config: FerryThrottlerConfig,
            manual: bool
        ) =
        let gate = obj ()
        let commits = Dictionary<ContentHash256, FreezeResult>()
        let leaves = Dictionary<ContentHash256, ContentHash256[]>()
        let mutable nextLsn = 1L
        let log = new FreezeLog(storeDir, config, manual)

        member _.StoreDir = storeDir
        member _.Mutbuf = mutbuf
        member _.Observer = observer
        member _.Session = session
        member internal _.Gate = gate
        member internal _.Commits = commits
        member internal _.Leaves = leaves
        member internal _.NextLsn
            with get () = nextLsn
            and set v = nextLsn <- v
        member internal _.Log = log

        interface IDisposable with
            member _.Dispose() = (log :> IDisposable).Dispose()

    let private logDir (v: Volume) = Path.Combine(v.StoreDir, "log")
    let private objectsDir (v: Volume) = Path.Combine(v.StoreDir, "objects")

    let private objectPath (storeDir: string) (id: ContentHash256) =
        let hex = (ContentHash256.toContentAddress128 id).ToHex()
        Path.Combine(storeDir, "objects", hex.Substring(0, 2), hex.Substring(2))

    let errorName (e: FreezeError) : string =
        match e with
        | FreezeError.Fsync _ -> "Fsync"
        | FreezeError.WindowsDurableNotClaimed -> "WindowsDurableNotClaimed"
        | FreezeError.MissingLeaves _ -> "MissingLeaves"
        | FreezeError.Observer _ -> "Observer"
        | FreezeError.Malformed _ -> "Malformed"
        | FreezeError.Crypto e -> ZetaFsCrypto.errorName e

    let private defaultConfig =
        { FerryThrottlerConfig.deterministic with MaxBatchSize = 64 }

    let createFull
        (storeDir: string)
        (mutbuf: ZetaFsMutbuf.Catalog)
        (observer: IDurabilityObserver option)
        (session: ZetaFsCrypto.Session option)
        (config: FerryThrottlerConfig)
        (manual: bool)
        : Volume =
        let fs = FileSystem.Current
        fs.CreateDirectory (Path.Combine(storeDir, "log"))
        fs.CreateDirectory (Path.Combine(storeDir, "objects"))
        new Volume(storeDir, mutbuf, observer, session, config, manual)

    let createWith
        (storeDir: string)
        (mutbuf: ZetaFsMutbuf.Catalog)
        (observer: IDurabilityObserver option)
        (session: ZetaFsCrypto.Session option)
        : Volume =
        createFull storeDir mutbuf observer session defaultConfig false

    /// Unencrypted control (FORMAT enc=off). The default first-product profile.
    let create (storeDir: string) (mutbuf: ZetaFsMutbuf.Catalog) (observer: IDurabilityObserver option) : Volume =
        createWith storeDir mutbuf observer None

    /// DST / test: no background ferry. Caller drives with `pumpLog`.
    let createManual
        (storeDir: string)
        (mutbuf: ZetaFsMutbuf.Catalog)
        (observer: IDurabilityObserver option)
        : Volume =
        createFull storeDir mutbuf observer None defaultConfig true

    let dispose (volume: Volume) = (volume :> IDisposable).Dispose()

    let pumpLog (volume: Volume) (ct: CancellationToken) : Task =
        volume.Log.PumpToIdleAsync(ct)

    let logBoatCount (volume: Volume) = volume.Log.Boats
    let logLastBoatSize (volume: Volume) = volume.Log.LastBoatSize

    let private putObject (storeDir: string) (id: ContentHash256) (bytes: byte[]) =
        let path = objectPath storeDir id
        let dir = Path.GetDirectoryName path
        FileSystem.Current.CreateDirectory dir
        FileSystemIo.writeAllBytes FileSystem.Current path bytes

    let private objectExists (storeDir: string) (id: ContentHash256) : bool =
        FileSystem.Current.Exists(objectPath storeDir id)

    let private className (c: DurabilityClass) =
        match c with
        | Buffered -> "buffered"
        | Journaled -> "journaled"
        | Durable -> "durable"

    let private encodeIntent entity (content: ContentHash256) (leaves: ContentHash256[]) (cls: DurabilityClass) (lsn: int64) : byte[] =
        let leafArr =
            DynamicValue.Array [ for leaf in leaves -> DynamicValue.Bytes(System.Collections.Immutable.ImmutableArray.CreateRange leaf.Raw) ]

        DynamicValue.toCanonicalCborOk (
            DynamicValue.Object
                [ "t", DynamicValue.String "freeze-intent/1"
                  "entity", DynamicValue.String(ZetaFsNamespace.EntityId.format entity)
                  "content", DynamicValue.Bytes(System.Collections.Immutable.ImmutableArray.CreateRange content.Raw)
                  "leaves", leafArr
                  "class", DynamicValue.String(className cls)
                  "lsn", DynamicValue.Int lsn ]
        )

    let private encodeCommit (intentLsn: int64) (content: ContentHash256) (lsn: int64) : byte[] =
        DynamicValue.toCanonicalCborOk (
            DynamicValue.Object
                [ "t", DynamicValue.String "freeze-commit/1"
                  "intentLsn", DynamicValue.Int intentLsn
                  "content", DynamicValue.Bytes(System.Collections.Immutable.ImmutableArray.CreateRange content.Raw)
                  "lsn", DynamicValue.Int lsn ]
        )

    let private framePlain (payload: byte[]) : byte[] =
        let crc = HardwareCrc.Crc32C(ReadOnlySpan payload)
        let frame = Array.zeroCreate (8 + payload.Length)
        BinaryPrimitives.WriteInt32LittleEndian(Span(frame, 0, 4), payload.Length)
        BinaryPrimitives.WriteUInt32LittleEndian(Span(frame, 4, 4), crc)
        Buffer.BlockCopy(payload, 0, frame, 8, payload.Length)
        frame

    let private frameSealed (inner: byte[]) : byte[] =
        let frame = Array.zeroCreate (4 + inner.Length)
        BinaryPrimitives.WriteInt32LittleEndian(Span(frame, 0, 4), inner.Length)
        Buffer.BlockCopy(inner, 0, frame, 4, inner.Length)
        frame

    let private concatFrames (a: byte[]) (b: byte[]) : byte[] =
        let all = Array.zeroCreate (a.Length + b.Length)
        Buffer.BlockCopy(a, 0, all, 0, a.Length)
        Buffer.BlockCopy(b, 0, all, a.Length, b.Length)
        all

    let isReadable (volume: Volume) (content: ContentHash256) : bool =
        lock volume.Gate (fun () ->
            match volume.Commits.TryGetValue content with
            | false, _ -> false
            | true, _ ->
                match volume.Leaves.TryGetValue content with
                | false, _ -> false
                | true, leaves ->
                    let mutable ok = true
                    let mutable i = 0

                    while ok && i < leaves.Length do
                        if not (objectExists volume.StoreDir leaves.[i]) then
                            ok <- false

                        i <- i + 1

                    ok)

    let private finish
        (volume: Volume)
        (entity: ZetaFsNamespace.EntityId)
        (content: ContentHash256)
        (span: uint64)
        (cls: DurabilityClass)
        (generation: uint64)
        (leafIds: ContentHash256[])
        (intentLsn: int64)
        (commitLsn: int64)
        : Result<FreezeResult, FreezeError> =
        let result =
            { Entity = entity
              Content = content
              Span = span
              Class = cls
              Generation = generation
              IntentLsn = intentLsn
              CommitLsn = commitLsn }

        lock volume.Gate (fun () ->
            volume.Commits.[content] <- result
            volume.Leaves.[content] <- leafIds)

        match cls, volume.Observer with
        | Durable, Some o -> o.OnDurable result |> Result.map (fun () -> result)
        | Durable, None -> Ok result
        | _, Some o -> o.OnJournaled result |> Result.map (fun () -> result)
        | _, None -> Ok result

    /// Library path: ValueTask. Await once (`let!` / `ConfigureAwait(false)`).
    ///
    /// `ct` is required (F# let-bound functions cannot take optional args).
    /// Callers: tests pass `CancellationToken.None` at *their* entry; a Generic
    /// Host passes `ApplicationStopping`. Nested ferry calls pass `ct` through.
    /// Cancel before admit skips the boat; cancel after admit still writes
    /// (group-commit shield) but the waiter observes the token.
    let freezeAsync
        (volume: Volume)
        (entity: ZetaFsNamespace.EntityId)
        (cls: DurabilityClass)
        (ct: CancellationToken)
        : ValueTask<Result<FreezeResult, FreezeError>> =
        if ct.IsCancellationRequested then
            ValueTask<Result<FreezeResult, FreezeError>>(Task.FromCanceled<Result<FreezeResult, FreezeError>> ct)
        elif cls = Durable && OperatingSystem.IsWindows() then
            ValueTask<Result<FreezeResult, FreezeError>>(Error FreezeError.WindowsDurableNotClaimed)
        else
            let snap = ZetaFsMutbuf.snapshot volume.Mutbuf entity
            let rope = ZetaFsJumprope.buildV1 snap.Bytes
            let leafIds = [| for id, _ in rope.Leaves -> id |]

            for kv in rope.Cas.Objects do
                putObject volume.StoreDir kv.Key kv.Value

            match cls with
            | Buffered ->
                let result =
                    { Entity = entity
                      Content = rope.Content
                      Span = rope.Span
                      Class = cls
                      Generation = snap.Generation
                      IntentLsn = 0L
                      CommitLsn = 0L }

                ValueTask<Result<FreezeResult, FreezeError>>(Ok result)
            | Journaled
            | Durable ->
                let intentLsn, commitLsn =
                    lock volume.Gate (fun () ->
                        let a = volume.NextLsn
                        volume.NextLsn <- a + 2L
                        a, a + 1L)

                let intentPt = encodeIntent entity rope.Content leafIds cls intentLsn
                let commitPt = encodeCommit intentLsn rope.Content commitLsn

                let framed: Result<byte[], FreezeError> =
                    match volume.Session with
                    | None -> Ok(concatFrames (framePlain intentPt) (framePlain commitPt))
                    | Some session ->
                        match ZetaFsCrypto.sealLog session intentLsn intentPt with
                        | Error e -> Error(FreezeError.Crypto e)
                        | Ok i ->
                            match ZetaFsCrypto.sealLog session commitLsn commitPt with
                            | Error e -> Error(FreezeError.Crypto e)
                            | Ok c -> Ok(concatFrames (frameSealed i) (frameSealed c))

                match framed with
                | Error e -> ValueTask<Result<FreezeResult, FreezeError>>(Error e)
                | Ok frames ->
                    let reply =
                        TaskCompletionSource<Result<struct (int64 * int64), FreezeError>>(
                            TaskCreationOptions.RunContinuationsAsynchronously
                        )

                    let objectIds =
                        let ids = Array.zeroCreate (leafIds.Length + 1)
                        ids.[0] <- rope.Content
                        Array.Copy(leafIds, 0, ids, 1, leafIds.Length)
                        ids

                    let item =
                        { IntentLsn = intentLsn
                          CommitLsn = commitLsn
                          Frames = frames
                          Durable = (cls = Durable)
                          ObjectIds = objectIds
                          Reply = reply }

                    let pending = volume.Log.SubmitAsync(item, ct)

                    if pending.IsCompletedSuccessfully then
                        match pending.Result with
                        | Error e -> ValueTask<Result<FreezeResult, FreezeError>>(Error e)
                        | Ok(struct (i, c)) ->
                            ValueTask<Result<FreezeResult, FreezeError>>(
                                finish volume entity rope.Content rope.Span cls snap.Generation leafIds i c
                            )
                    else
                        let work =
                            task {
                                let! logged = pending.AsTask().ConfigureAwait(false)

                                match logged with
                                | Error e -> return Error e
                                | Ok(struct (i, c)) ->
                                    return finish volume entity rope.Content rope.Span cls snap.Generation leafIds i c
                            }

                        ValueTask<Result<FreezeResult, FreezeError>> work
