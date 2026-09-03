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
/// `InMemoryFileSystem.ArmCrashMidWrite`. Journaled/Durable boats write
/// intent, Flush (visible, no crash arm), put leaves, then commit.
/// Plain and sealed log replay restore intact intent+commit pairs on create
/// (torn tail / intent-without-commit / mid-log CRC dropped from the bad
/// frame; prefix kept). Sealed frames carry LSN in the clear so `openLog`
/// can rebuild the nonce. Reclaim sweep stays `toy`.
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
          IntentFrame: byte[]
          CommitFrame: byte[]
          Durable: bool
          Objects: struct (ContentHash256 * byte[])[]
          Reply: TaskCompletionSource<Result<struct (int64 * int64), FreezeError>> }

    /// DoP=1 segment writer. One boat = N freezes, one Flush; Durable adds one
    /// fsync of objects-dir + log. `manual` is the DST pump (no background ferry).
    [<Sealed>]
    type internal FreezeLog
        (storeDir: string, config: FerryThrottlerConfig, manual: bool, blockIo: SimulatedBlockIo option, objectCas: BlockCas option) =

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

                let putLeaves (item: LogItem) =
                    let mutable j = 0

                    while err.IsNone && j < item.Objects.Length do
                        let struct (id, bytes) = item.Objects.[j]
                        let hex = (ContentHash256.toContentAddress128 id).ToHex()

                        match objectCas with
                        | Some cas ->
                            cas.Put(hex, bytes)

                            if item.Durable then
                                cas.Device.Flush()
                        | None ->
                            let path = Path.Combine(objectsDir, hex.Substring(0, 2), hex.Substring(2))
                            let dir = Path.GetDirectoryName path
                            fsDoor.CreateDirectory dir
                            FileSystemIo.writeAllBytes fsDoor path bytes

                            if item.Durable then
                                match FileSync.fsyncFile path with
                                | Ok() -> ()
                                | Error e -> err <- Some(FreezeError.Fsync e)

                        j <- j + 1

                    if err.IsNone && item.Durable && objectCas.IsNone then
                        match FileSync.fsyncDir objectsDir with
                        | Error e -> err <- Some(FreezeError.Fsync e)
                        | Ok() -> ()

                // Intent Flush publishes without crash arms on the file door.
                // On IBlockIo, Flush is the barrier; crash arms fire on Write.
                match blockIo with
                | Some io ->
                    let mutable i = 0
                    let device = io :> IBlockIo
                    let origin = BlockLog.origin device

                    while err.IsNone && i < boat.Length do
                        let item = boat.Span.[i]
                        let afterIntent =
                            BlockLog.append
                                device
                                (origin + io.LogicalBytes)
                                (System.ReadOnlyMemory<byte>.op_Implicit item.IntentFrame)

                        io.LogicalBytes <- afterIntent - origin
                        BlockSuper.writeLog device io.LogicalBytes
                        device.Flush()
                        putLeaves item

                        if err.IsNone then
                            let afterCommit =
                                BlockLog.append
                                    device
                                    (origin + io.LogicalBytes)
                                    (System.ReadOnlyMemory<byte>.op_Implicit item.CommitFrame)

                            io.LogicalBytes <- afterCommit - origin
                            BlockSuper.writeLog device io.LogicalBytes
                            device.Flush()

                        i <- i + 1
                | None ->
                    do
                        use stream = fsDoor.OpenFile(logPath, FileMode.Append, FileAccess.Write, FileShare.Read)

                        let mutable i = 0

                        while err.IsNone && i < boat.Length do
                            let item = boat.Span.[i]
                            stream.Write(item.IntentFrame, 0, item.IntentFrame.Length)
                            stream.Flush()
                            putLeaves item

                            if err.IsNone then
                                stream.Write(item.CommitFrame, 0, item.CommitFrame.Length)

                            i <- i + 1

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
        member _.BlockIo = blockIo
        member _.ObjectCas = objectCas

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
            manual: bool,
            blockIo: SimulatedBlockIo option,
            objectCas: BlockCas option
        ) =
        let gate = obj ()
        let commits = Dictionary<ContentHash256, FreezeResult>()
        let leaves = Dictionary<ContentHash256, ContentHash256[]>()
        let mutable nextLsn = 1L
        let log = new FreezeLog(storeDir, config, manual, blockIo, objectCas)

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

    let private tryHash (v: DynamicValue) : ContentHash256 option =
        match v with
        | DynamicValue.Bytes b when not b.IsDefault && b.Length = 32 ->
            let raw = Array.zeroCreate 32
            b.AsSpan().CopyTo(Span<byte> raw)
            Some { Raw = raw }
        | _ -> None

    let private tryInt (v: DynamicValue) : int64 option =
        match v with
        | DynamicValue.Int x -> Some x
        | _ -> None

    let private tryString (v: DynamicValue) : string option =
        match v with
        | DynamicValue.String s -> Some s
        | _ -> None

    let private tryFind (pairs: (string * DynamicValue) list) (key: string) : DynamicValue option =
        pairs
        |> List.tryFind (fun (k, _) -> k.Equals(key, StringComparison.Ordinal))
        |> Option.map snd

    let private classFromName (s: string) : DurabilityClass option =
        match s with
        | "buffered" -> Some DurabilityClass.Buffered
        | "journaled" -> Some DurabilityClass.Journaled
        | "durable" -> Some DurabilityClass.Durable
        | _ -> None

    type private PlainRec =
        | Intent of entity: ZetaFsNamespace.EntityId * content: ContentHash256 * leaves: ContentHash256[] * cls: DurabilityClass * lsn: int64
        | Commit of intentLsn: int64 * content: ContentHash256 * lsn: int64

    let private decodePlain (payload: byte[]) : PlainRec option =
        match DynamicValue.fromCanonicalCbor payload with
        | Error _ -> None
        | Ok(DynamicValue.Object pairs) ->
            match tryFind pairs "t" |> Option.bind tryString with
            | Some "freeze-intent/1" ->
                let entity =
                    tryFind pairs "entity"
                    |> Option.bind tryString
                    |> Option.bind ZetaFsNamespace.EntityId.tryParse
                let content = tryFind pairs "content" |> Option.bind tryHash
                let cls = tryFind pairs "class" |> Option.bind tryString |> Option.bind classFromName
                let lsn = tryFind pairs "lsn" |> Option.bind tryInt
                let leaves =
                    match tryFind pairs "leaves" with
                    | Some(DynamicValue.Array xs) ->
                        let acc = ResizeArray<ContentHash256>()
                        let mutable ok = true

                        for x in xs do
                            match tryHash x with
                            | Some h when ok -> acc.Add h
                            | _ -> ok <- false

                        if ok then Some(acc.ToArray()) else None
                    | _ -> None

                match entity, content, leaves, cls, lsn with
                | Some e, Some c, Some ls, Some k, Some n -> Some(Intent(e, c, ls, k, n))
                | _ -> None
            | Some "freeze-commit/1" ->
                match
                    tryFind pairs "intentLsn" |> Option.bind tryInt,
                    tryFind pairs "content" |> Option.bind tryHash,
                    tryFind pairs "lsn" |> Option.bind tryInt
                with
                | Some i, Some c, Some n -> Some(Commit(i, c, n))
                | _ -> None
            | _ -> None
        | Ok _ -> None

    let private applyDecoded
        (volume: Volume)
        (pending: byref<PlainRec option>)
        (pendingStart: byref<int64>)
        (maxLsn: byref<int64>)
        (recordStart: int64)
        (atTail: bool)
        (truncate: int64 -> unit)
        (decoded: PlainRec option)
        : bool =
        match decoded with
        | None ->
            if atTail then
                truncate recordStart
                false
            else
                invalidOp (sprintf "ZetaFsFreeze: malformed frame at byte %d" recordStart)
        | Some(Intent _ as intentRec) ->
            match pending with
            | Some _ ->
                invalidOp (sprintf "ZetaFsFreeze: intent without commit at byte %d" pendingStart)
            | None ->
                pending <- Some intentRec
                pendingStart <- recordStart
                true
        | Some(Commit(intentLsn, content, commitLsn)) ->
            match pending with
            | Some(Intent(entity, intentContent, leaves, cls, intentLsn2)) when
                intentLsn = intentLsn2 && content.Equals intentContent
                ->
                pending <- None
                pendingStart <- -1L

                if intentLsn > maxLsn then
                    maxLsn <- intentLsn

                if commitLsn > maxLsn then
                    maxLsn <- commitLsn

                volume.Commits.[content] <-
                    { Entity = entity
                      Content = content
                      Span = 0UL
                      Class = cls
                      Generation = 0UL
                      IntentLsn = intentLsn
                      CommitLsn = commitLsn }

                volume.Leaves.[content] <- leaves
                true
            | _ ->
                if atTail then
                    truncate recordStart
                    false
                else
                    invalidOp (sprintf "ZetaFsFreeze: commit without matching intent at byte %d" recordStart)

    /// Restore Commits/Leaves from intact plain frames. Trailing torn frame,
    /// intent-without-commit, or a CRC mismatch (tail or mid) is truncated
    /// from that frame; the verified prefix is kept.
    let private replayPlainFromStream (stream: Stream) (volume: Volume) =
        use br = new BinaryReader(stream, Text.Encoding.UTF8, leaveOpen = true)
        let mutable scanning = true
        let mutable pendingStart = -1L
        let mutable pending: PlainRec option = None
        let mutable maxLsn = 0L

        while scanning do
            let recordStart = stream.Position

            if stream.Length - stream.Position = 0L then
                scanning <- false
            elif stream.Length - stream.Position < 8L then
                stream.SetLength recordStart
                scanning <- false
            else
                let len = br.ReadInt32()
                let expectedCrc = br.ReadUInt32()

                if len < 0 then
                    invalidOp (sprintf "ZetaFsFreeze: negative frame length %d at byte %d" len recordStart)
                elif stream.Length - stream.Position < int64 len then
                    stream.SetLength recordStart
                    scanning <- false
                else
                    let payload = br.ReadBytes len
                    let actualCrc = HardwareCrc.Crc32C(ReadOnlySpan payload)

                    if actualCrc <> expectedCrc then
                        stream.SetLength recordStart
                        scanning <- false
                    else
                        let atTail = stream.Position = stream.Length
                        scanning <-
                            applyDecoded
                                volume
                                &pending
                                &pendingStart
                                &maxLsn
                                recordStart
                                atTail
                                stream.SetLength
                                (decodePlain payload)

        match pending with
        | Some _ when pendingStart >= 0L -> stream.SetLength pendingStart
        | _ -> ()

        if maxLsn >= volume.NextLsn then
            volume.NextLsn <- maxLsn + 1L

    let private replayPlainLog (fs: IFileSystem) (volume: Volume) =
        match volume.Log.BlockIo with
        | Some io ->
            let device = io :> IBlockIo

            match BlockSuper.tryReadLog device with
            | Some n -> io.LogicalBytes <- n
            | None -> ()

            if io.LogicalBytes > 0L then
                let bytes = BlockLog.readAt device (BlockLog.origin device) io.LogicalBytes
                use stream = new MemoryStream(bytes, 0, bytes.Length, writable = true, publiclyVisible = true)
                replayPlainFromStream stream volume
                io.LogicalBytes <- stream.Length
                BlockSuper.writeLog device io.LogicalBytes
        | None ->
            let logPath = volume.Log.LogPath

            if fs.Exists logPath then
                use stream = fs.OpenFile(logPath, FileMode.Open, FileAccess.ReadWrite, FileShare.Read)
                replayPlainFromStream stream volume

    /// Sealed frames: [len:i32][lsn:i64][inner]. LSN is public so openLog can
    /// rebuild the nonce. Wrong-key MAC on the first frame recovers nothing
    /// and does not truncate.
    let private replaySealedLog (fs: IFileSystem) (volume: Volume) (session: ZetaFsCrypto.Session) =
        let logPath = volume.Log.LogPath

        if fs.Exists logPath then
            use stream = fs.OpenFile(logPath, FileMode.Open, FileAccess.ReadWrite, FileShare.Read)
            use br = new BinaryReader(stream)
            let mutable scanning = true
            let mutable pendingStart = -1L
            let mutable pending: PlainRec option = None
            let mutable maxLsn = 0L

            while scanning do
                let recordStart = stream.Position

                if stream.Length - stream.Position = 0L then
                    scanning <- false
                elif stream.Length - stream.Position < 12L then
                    stream.SetLength recordStart
                    scanning <- false
                else
                    let len = br.ReadInt32()
                    let lsn = br.ReadInt64()

                    if len < 0 then
                        invalidOp (sprintf "ZetaFsFreeze: negative sealed length %d at byte %d" len recordStart)
                    elif stream.Length - stream.Position < int64 len then
                        stream.SetLength recordStart
                        scanning <- false
                    else
                        let inner = br.ReadBytes len
                        let atTail = stream.Position = stream.Length

                        match ZetaFsCrypto.openLog session lsn inner with
                        | Error ZetaFsCrypto.CryptoError.MacMismatch
                        | Error ZetaFsCrypto.CryptoError.GcmAuthFailed when pending.IsNone && recordStart = 0L ->
                            scanning <- false
                        | Error ZetaFsCrypto.CryptoError.MacMismatch
                        | Error ZetaFsCrypto.CryptoError.GcmAuthFailed ->
                            stream.SetLength recordStart
                            scanning <- false
                        | Error e ->
                            invalidOp (sprintf "ZetaFsFreeze: sealed frame at byte %d: %s" recordStart (ZetaFsCrypto.errorName e))
                        | Ok plaintext ->
                            scanning <-
                                applyDecoded
                                    volume
                                    &pending
                                    &pendingStart
                                    &maxLsn
                                    recordStart
                                    atTail
                                    stream.SetLength
                                    (decodePlain plaintext)

            match pending with
            | Some _ when pendingStart >= 0L -> stream.SetLength pendingStart
            | _ -> ()

            if maxLsn >= volume.NextLsn then
                volume.NextLsn <- maxLsn + 1L

    let createFull
        (storeDir: string)
        (mutbuf: ZetaFsMutbuf.Catalog)
        (observer: IDurabilityObserver option)
        (session: ZetaFsCrypto.Session option)
        (config: FerryThrottlerConfig)
        (manual: bool)
        (blockIo: SimulatedBlockIo option)
        (objectCas: BlockCas option)
        : Volume =
        let fs = FileSystem.Current
        fs.CreateDirectory (Path.Combine(storeDir, "log"))
        fs.CreateDirectory (Path.Combine(storeDir, "objects"))
        let volume = new Volume(storeDir, mutbuf, observer, session, config, manual, blockIo, objectCas)

        try
            lock volume.Gate (fun () ->
                match session with
                | None -> replayPlainLog fs volume
                | Some s -> replaySealedLog fs volume s)

            volume
        with ex ->
            (volume :> IDisposable).Dispose()
            raise ex

    let createWith
        (storeDir: string)
        (mutbuf: ZetaFsMutbuf.Catalog)
        (observer: IDurabilityObserver option)
        (session: ZetaFsCrypto.Session option)
        : Volume =
        createFull storeDir mutbuf observer session defaultConfig false None None

    /// Unencrypted control (FORMAT enc=off). The default first-product profile.
    let create (storeDir: string) (mutbuf: ZetaFsMutbuf.Catalog) (observer: IDurabilityObserver option) : Volume =
        createWith storeDir mutbuf observer None

    /// DST / test: no background ferry. Caller drives with `pumpLog`.
    let createManual
        (storeDir: string)
        (mutbuf: ZetaFsMutbuf.Catalog)
        (observer: IDurabilityObserver option)
        : Volume =
        createFull storeDir mutbuf observer None defaultConfig true None None

    let createManualWith
        (storeDir: string)
        (mutbuf: ZetaFsMutbuf.Catalog)
        (observer: IDurabilityObserver option)
        (session: ZetaFsCrypto.Session option)
        : Volume =
        createFull storeDir mutbuf observer session defaultConfig true None None

    /// DST: Journaled log frames go through `IBlockIo` (RMW on the tail block).
    /// Objects still speak files unless `createManualWithBlockStore` is used.
    /// LBA 0 and 1 are checksummed `ZFL2` copies; payload starts at LBA 2.
    let createManualWithBlocks
        (storeDir: string)
        (mutbuf: ZetaFsMutbuf.Catalog)
        (observer: IDurabilityObserver option)
        (blocks: SimulatedBlockIo)
        : Volume =
        createFull storeDir mutbuf observer None defaultConfig true (Some blocks) None

    /// DST: log on one simulated disk, CAS objects on another. Two devices
    /// so a crash arm on objects cannot tear the log. LBA 0 and 1 on each
    /// disk are checksummed superblock copies (`ZFL2` / `ZCA2`).
    let createManualWithBlockStore
        (storeDir: string)
        (mutbuf: ZetaFsMutbuf.Catalog)
        (observer: IDurabilityObserver option)
        (logBlocks: SimulatedBlockIo)
        (objectCas: BlockCas)
        : Volume =
        createFull storeDir mutbuf observer None defaultConfig true (Some logBlocks) (Some objectCas)

    let dispose (volume: Volume) = (volume :> IDisposable).Dispose()

    let pumpLog (volume: Volume) (ct: CancellationToken) : Task =
        volume.Log.PumpToIdleAsync(ct)

    let logBoatCount (volume: Volume) = volume.Log.Boats
    let logLastBoatSize (volume: Volume) = volume.Log.LastBoatSize

    let logLogicalBytes (volume: Volume) =
        match volume.Log.BlockIo with
        | Some io -> io.LogicalBytes
        | None ->
            let path = volume.Log.LogPath
            if FileSystem.Current.Exists path then
                int64 (FileSystem.Current.ReadAllBytes path).Length
            else
                0L

    let private putObject (storeDir: string) (id: ContentHash256) (bytes: byte[]) =
        let path = objectPath storeDir id
        let dir = Path.GetDirectoryName path
        FileSystem.Current.CreateDirectory dir
        FileSystemIo.writeAllBytes FileSystem.Current path bytes

    let private objectKey (id: ContentHash256) =
        (ContentHash256.toContentAddress128 id).ToHex()

    let private objectExists (volume: Volume) (id: ContentHash256) : bool =
        match volume.Log.ObjectCas with
        | Some cas -> cas.Exists(objectKey id)
        | None -> FileSystem.Current.Exists(objectPath volume.StoreDir id)

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

    let private frameSealed (lsn: int64) (inner: byte[]) : byte[] =
        let frame = Array.zeroCreate (12 + inner.Length)
        BinaryPrimitives.WriteInt32LittleEndian(Span(frame, 0, 4), inner.Length)
        BinaryPrimitives.WriteInt64LittleEndian(Span(frame, 4, 8), lsn)
        Buffer.BlockCopy(inner, 0, frame, 12, inner.Length)
        frame

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
                        if not (objectExists volume leaves.[i]) then
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

            match cls with
            | Buffered ->
                for kv in rope.Cas.Objects do
                    putObject volume.StoreDir kv.Key kv.Value

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

                let framed: Result<byte[] * byte[], FreezeError> =
                    match volume.Session with
                    | None -> Ok(framePlain intentPt, framePlain commitPt)
                    | Some session ->
                        match ZetaFsCrypto.sealLog session intentLsn intentPt with
                        | Error e -> Error(FreezeError.Crypto e)
                        | Ok i ->
                            match ZetaFsCrypto.sealLog session commitLsn commitPt with
                            | Error e -> Error(FreezeError.Crypto e)
                            | Ok c -> Ok(frameSealed intentLsn i, frameSealed commitLsn c)

                match framed with
                | Error e -> ValueTask<Result<FreezeResult, FreezeError>>(Error e)
                | Ok(intentFrame, commitFrame) ->
                    let reply =
                        TaskCompletionSource<Result<struct (int64 * int64), FreezeError>>(
                            TaskCreationOptions.RunContinuationsAsynchronously
                        )

                    let objects =
                        let arr = Array.zeroCreate rope.Cas.Objects.Count
                        let mutable i = 0

                        for kv in rope.Cas.Objects do
                            arr.[i] <- struct (kv.Key, kv.Value)
                            i <- i + 1

                        arr

                    let item =
                        { IntentLsn = intentLsn
                          CommitLsn = commitLsn
                          IntentFrame = intentFrame
                          CommitFrame = commitFrame
                          Durable = (cls = Durable)
                          Objects = objects
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
