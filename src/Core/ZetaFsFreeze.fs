namespace Zeta.Core

open System
open System.Buffers.Binary
open System.Collections.Generic
open System.IO
open Zeta.Core.FSharp.Blake3

/// WAL freeze (E2 / PR7). Snapshot mutbuf G, Jumprope that snapshot, log
/// freeze-intent then CAS puts then freeze-commit. Durable fsyncs every
/// leaf+trunk **before** commit and withholds the ack. Readable iff commit
/// exists and every leaf is present. Crash-mid-write stays `toy` until PR12.
///
/// DoP=1 on this log (one gate). No Task.Run.
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

    type Volume =
        { StoreDir: string
          Mutbuf: ZetaFsMutbuf.Catalog
          Gate: obj
          Commits: Dictionary<ContentHash256, FreezeResult>
          Leaves: Dictionary<ContentHash256, ContentHash256[]>
          mutable NextLsn: int64
          Observer: IDurabilityObserver option
          /// None = FORMAT enc=off (default). Some = explicit-nonce GCM on the log.
          Session: ZetaFsCrypto.Session option }

    let private logDir (v: Volume) = Path.Combine(v.StoreDir, "log")
    let private logPath (v: Volume) = Path.Combine(logDir v, "freeze")
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

    let createWith
        (storeDir: string)
        (mutbuf: ZetaFsMutbuf.Catalog)
        (observer: IDurabilityObserver option)
        (session: ZetaFsCrypto.Session option)
        : Volume =
        let fs = FileSystem.Current
        fs.CreateDirectory (Path.Combine(storeDir, "log"))
        fs.CreateDirectory (Path.Combine(storeDir, "objects"))
        { StoreDir = storeDir
          Mutbuf = mutbuf
          Gate = obj ()
          Commits = Dictionary<ContentHash256, FreezeResult>()
          Leaves = Dictionary<ContentHash256, ContentHash256[]>()
          NextLsn = 1L
          Observer = observer
          Session = session }

    /// Unencrypted control (FORMAT enc=off). The default first-product profile.
    let create (storeDir: string) (mutbuf: ZetaFsMutbuf.Catalog) (observer: IDurabilityObserver option) : Volume =
        createWith storeDir mutbuf observer None

    let private putObject (storeDir: string) (id: ContentHash256) (bytes: byte[]) =
        let path = objectPath storeDir id
        let dir = Path.GetDirectoryName path
        FileSystem.Current.CreateDirectory dir
        FileSystemIo.writeAllBytes FileSystem.Current path bytes

    let private objectExists (storeDir: string) (id: ContentHash256) : bool =
        FileSystem.Current.Exists(objectPath storeDir id)

    let private fsyncObject (storeDir: string) (id: ContentHash256) : Result<unit, FreezeError> =
        match FileSync.fsyncFile (objectPath storeDir id) with
        | Ok() -> Ok()
        | Error e -> Error(FreezeError.Fsync e)

    let private appendLog (volume: Volume) (payload: byte[]) : Result<int64, FreezeError> =
        let fs = FileSystem.Current
        fs.CreateDirectory (logDir volume)
        let lsn = volume.NextLsn

        match volume.Session with
        | None ->
            let crc = HardwareCrc.Crc32C(ReadOnlySpan payload)
            let frame = Array.zeroCreate (8 + payload.Length)
            BinaryPrimitives.WriteInt32LittleEndian(Span(frame, 0, 4), payload.Length)
            BinaryPrimitives.WriteUInt32LittleEndian(Span(frame, 4, 4), crc)
            Buffer.BlockCopy(payload, 0, frame, 8, payload.Length)
            let path = logPath volume
            use stream = fs.OpenFile(path, FileMode.Append, FileAccess.Write, FileShare.Read)
            stream.Write(frame, 0, frame.Length)
            stream.Flush()
            volume.NextLsn <- lsn + 1L
            Ok lsn
        | Some session ->
            match ZetaFsCrypto.sealLog session lsn payload with
            | Error e -> Error(FreezeError.Crypto e)
            | Ok inner ->
                let frame = Array.zeroCreate (4 + inner.Length)
                BinaryPrimitives.WriteInt32LittleEndian(Span(frame, 0, 4), inner.Length)
                Buffer.BlockCopy(inner, 0, frame, 4, inner.Length)
                let path = logPath volume
                use stream = fs.OpenFile(path, FileMode.Append, FileAccess.Write, FileShare.Read)
                stream.Write(frame, 0, frame.Length)
                stream.Flush()
                volume.NextLsn <- lsn + 1L
                Ok lsn

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

    let freeze
        (volume: Volume)
        (entity: ZetaFsNamespace.EntityId)
        (cls: DurabilityClass)
        : Result<FreezeResult, FreezeError> =
        if cls = Durable && OperatingSystem.IsWindows() then
            Error FreezeError.WindowsDurableNotClaimed
        else
            lock volume.Gate (fun () ->
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

                    Ok result
                | Journaled
                | Durable ->
                    let durableFlush () : Result<unit, FreezeError> =
                        if cls <> Durable then
                            Ok()
                        else
                            let mutable err: FreezeError option = None

                            for kv in rope.Cas.Objects do
                                if err.IsNone then
                                    match fsyncObject volume.StoreDir kv.Key with
                                    | Ok() -> ()
                                    | Error e -> err <- Some e

                            match err with
                            | Some e -> Error e
                            | None ->
                                match FileSync.fsyncDir (objectsDir volume) with
                                | Error e -> Error(FreezeError.Fsync e)
                                | Ok() ->
                                    match FileSync.fsyncDir (logDir volume) with
                                    | Error e -> Error(FreezeError.Fsync e)
                                    | Ok() ->
                                        match FileSync.fsyncFile (logPath volume) with
                                        | Error e -> Error(FreezeError.Fsync e)
                                        | Ok() -> Ok()

                    let finish (intentLsn: int64) (commitLsn: int64) : Result<FreezeResult, FreezeError> =
                        let result =
                            { Entity = entity
                              Content = rope.Content
                              Span = rope.Span
                              Class = cls
                              Generation = snap.Generation
                              IntentLsn = intentLsn
                              CommitLsn = commitLsn }

                        volume.Commits.[rope.Content] <- result
                        volume.Leaves.[rope.Content] <- leafIds

                        match cls, volume.Observer with
                        | Durable, Some o -> o.OnDurable result |> Result.map (fun () -> result)
                        | Durable, None -> Ok result
                        | _, Some o -> o.OnJournaled result |> Result.map (fun () -> result)
                        | _, None -> Ok result

                    match appendLog volume (encodeIntent entity rope.Content leafIds cls volume.NextLsn) with
                    | Error e -> Error e
                    | Ok intentLsn ->
                        match durableFlush () with
                        | Error e -> Error e
                        | Ok() ->
                            match appendLog volume (encodeCommit intentLsn rope.Content volume.NextLsn) with
                            | Error e -> Error e
                            | Ok commitLsn ->
                                match cls with
                                | Durable ->
                                    match FileSync.fsyncFile (logPath volume) with
                                    | Error e -> Error(FreezeError.Fsync e)
                                    | Ok() ->
                                        match FileSync.fsyncDir (logDir volume) with
                                        | Error e -> Error(FreezeError.Fsync e)
                                        | Ok() -> finish intentLsn commitLsn
                                | _ -> finish intentLsn commitLsn)
