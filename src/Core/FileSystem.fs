namespace Zeta.Core

open System
open System.IO
open System.Text
open System.Threading
open System.Threading.Tasks

/// A generic file system interface that can be replaced under simulation testing.
type IFileSystem =
    abstract Exists: path: string -> bool
    abstract Delete: path: string -> unit
    abstract Move: src: string * dest: string * overwrite: bool -> unit
    abstract ReadAllBytes: path: string -> byte[]
    abstract ReadAllBytesAsync: path: string * ct: CancellationToken -> Task<byte[]>
    abstract OpenFile: path: string * mode: FileMode * access: FileAccess * share: FileShare -> Stream
    abstract OpenWrite: path: string * fsync: bool -> Stream
    abstract OpenRead: path: string -> Stream
    abstract GetFiles: path: string * searchPattern: string -> string[]
    abstract CreateDirectory: path: string -> unit

/// Native-volume block *primitive* (one LBA, one call). This is the device,
/// not the IO program. Batch/single/multibatch dispatch is `BlockIoFerry`
/// (Haskell `IO a` interpreted by `FerryThrottler`, including adjacent
/// whole-block coalesce). The polyfill adapter maps a host file through
/// `IFileSystem`. A later device impl must not go through POSIX files.
type IBlockIo =
    abstract BlockSize: int
    abstract Read: lba: uint64 * dst: Memory<byte> -> int
    abstract Write: lba: uint64 * src: ReadOnlyMemory<byte> -> int
    abstract Flush: unit -> unit

module private PhysicalFileSystemLimits =
    let maxReadAllBytes = 256L * 1024L * 1024L

    let checkReadAllBytesCap (path: string) =
        let info = FileInfo(path)
        if info.Exists && info.Length > maxReadAllBytes then
            raise (IOException(sprintf "File exceeds ReadAllBytes cap (%d bytes): %s" maxReadAllBytes path))

    let checkStreamCap (path: string) (stream: Stream) =
        if stream.Length > maxReadAllBytes then
            raise (IOException(sprintf "File exceeds ReadAllBytes cap (%d bytes): %s" maxReadAllBytes path))

    let readAllBytes (path: string) =
        checkReadAllBytesCap path
        use stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 4096, FileOptions.SequentialScan)
        checkStreamCap path stream
        use buffer = new MemoryStream(int stream.Length)
        stream.CopyTo(buffer)
        buffer.ToArray()

    let readAllBytesAsync (path: string) (ct: CancellationToken) = task {
        checkReadAllBytesCap path
        use stream =
            new FileStream(
                path,
                FileMode.Open,
                FileAccess.Read,
                FileShare.Read,
                4096,
                FileOptions.Asynchronous ||| FileOptions.SequentialScan
            )
        checkStreamCap path stream
        use buffer = new MemoryStream(int stream.Length)
        do! stream.CopyToAsync(buffer, ct)
        return buffer.ToArray()
    }

/// The default physical file system wrapper delegating to System.IO.
type PhysicalFileSystem() =
    interface IFileSystem with
        member _.Exists(path) = File.Exists(path)
        member _.Delete(path) = File.Delete(path)
        member _.Move(src, dest, overwrite) = File.Move(src, dest, overwrite)
        member _.ReadAllBytes(path) =
            PhysicalFileSystemLimits.readAllBytes path
        member _.ReadAllBytesAsync(path, ct) =
            PhysicalFileSystemLimits.readAllBytesAsync path ct
        member _.OpenFile(path, mode, access, share) =
            new FileStream(path, mode, access, share, 4096, true) :> Stream
        member _.OpenWrite(path, fsync) =
            let opts = if fsync then FileOptions.WriteThrough else FileOptions.None
            new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None, 4096, opts) :> Stream
        member _.OpenRead(path) =
            new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read) :> Stream
        member _.GetFiles(path, searchPattern) = Directory.GetFiles(path, searchPattern)
        member _.CreateDirectory(path) = Directory.CreateDirectory(path) |> ignore

/// Byte helpers over `IFileSystem`. Temp+rename so a crash cannot leave a
/// half-written FORMAT / object / ref. Dispose the write stream *before*
/// Move: `InMemoryFileSystem` commits on Dispose (prefix + throw if armed).
[<RequireQualifiedAccess>]
module FileSystemIo =
    let writeAllBytes (fs: IFileSystem) (path: string) (bytes: byte[]) =
        let tmp = path + ".tmp"

        do
            use stream = fs.OpenWrite(tmp, false)
            stream.Write(bytes, 0, bytes.Length)
            stream.Flush()

        fs.Move(tmp, path, true)

    let writeAllText (fs: IFileSystem) (path: string) (text: string) =
        writeAllBytes fs path (Encoding.UTF8.GetBytes text)

    let tryReadBytesCapped (fs: IFileSystem) (maxBytes: int64) (path: string) : byte[] option =
        if not (fs.Exists path) then
            None
        else
            use stream = fs.OpenRead path

            if stream.Length > maxBytes then
                None
            else
                let bytes = Array.zeroCreate<byte> (int stream.Length)
                let mutable offset = 0
                let mutable eof = false

                while offset < bytes.Length && not eof do
                    let read = stream.Read(bytes, offset, bytes.Length - offset)

                    if read = 0 then
                        eof <- true
                    else
                        offset <- offset + read

                if offset = bytes.Length then
                    Some bytes
                else
                    Some(Array.take offset bytes)

/// DST: write committed a prefix, then the process died. Not a FreezeError.
[<Sealed>]
type CrashMidWriteException(path: string, committedBytes: int, attemptedBytes: int) =
    inherit IOException(
        sprintf
            "crash-mid-write: committed %d of %d bytes at %s"
            committedBytes
            attemptedBytes
            path)

    member _.Path = path
    member _.CommittedBytes = committedBytes
    member _.AttemptedBytes = attemptedBytes

/// DST: reclaim Delete committed, then the process died. Extra garbage may
/// remain; a live object must not be missing.
[<Sealed>]
type CrashMidSweepException(path: string) =
    inherit IOException(sprintf "crash-mid-sweep at %s" path)
    member _.Path = path

/// A mock FileStream that commits its MemoryStream buffer to the InMemoryFileSystem registry upon disposal.
/// `Flush` publishes the current buffer without firing crash/corrupt/reorder
/// arms. Those arms stay on Dispose (`commitWrite`). A Flush that used
/// `commitWrite` would let a later Dispose republish the full buffer and
/// undo a tear.
type SimulatedFileStream
    (
        path: string,
        mode: FileMode,
        access: FileAccess,
        files: System.Collections.Concurrent.ConcurrentDictionary<string, byte[]>,
        checkFault: unit -> unit,
        applyLatency: unit -> unit,
        commitWrite: string -> byte[] -> unit,
        flushPublish: string -> byte[] -> unit
    ) =
    inherit MemoryStream()
    let mutable isDisposed = false
    do
        checkFault()
        applyLatency()
        let exists = files.ContainsKey(path)
        if exists && (mode = FileMode.Open || mode = FileMode.OpenOrCreate || mode = FileMode.Append) then
            let bytes = files.[path]
            base.Write(bytes, 0, bytes.Length)
            if mode = FileMode.Append then
                base.Seek(0L, SeekOrigin.End) |> ignore
            else
                base.Seek(0L, SeekOrigin.Begin) |> ignore
        elif not exists && mode = FileMode.Open then
            raise (FileNotFoundException(path))

    override this.Flush() =
        if (not isDisposed) && access.HasFlag(FileAccess.Write) then
            flushPublish path (this.ToArray())

        base.Flush()

    override this.FlushAsync(cancellationToken) =
        if cancellationToken.IsCancellationRequested then
            Task.FromCanceled cancellationToken
        elif isDisposed then
            Task.CompletedTask
        else
            try
                this.Flush()
                Task.CompletedTask
            with ex ->
                Task.FromException ex

    override this.Dispose(disposing) =
        if disposing && not isDisposed then
            isDisposed <- true
            checkFault()
            applyLatency()
            if access.HasFlag(FileAccess.Write) then
                commitWrite path (this.ToArray())
        base.Dispose(disposing)

/// An in-memory mock file system that supports simulating latency, read/write sector corruption exceptions,
/// file creation/modification tracking, and one-shot crash-mid-write /
/// corrupt-last-write / reorder (D12 door).
type InMemoryFileSystem() =
    let files = System.Collections.Concurrent.ConcurrentDictionary<string, byte[]>()
    let mutable latencyMs = 0L
    let mutable virtualElapsedMs = 0L
    let mutable errorRate = 0.0
    let mutable rngState = 12345L
    let mutable crashArm: (string * int) option = None
    let mutable corruptArm: (string * int) option = None
    let mutable reorderNeedle: string option = None
    let mutable heldWrite: (string * byte[]) option = None
    let mutable deleteCrashArm: string option = None
    let commitOrder = ResizeArray<string>()
    let lockObj = obj ()

    let corruptXor = 0xA5uy

    let pathMatches (needle: string) (path: string) =
        path.IndexOf(needle, StringComparison.Ordinal) >= 0

    let publish (path: string) (bytes: byte[]) =
        files.[path] <- bytes
        commitOrder.Add path

    let splitMix () =
        rngState <- rngState + 0x9E3779B97F4A7C15L
        let mutable z = rngState
        z <- (z ^^^ (z >>> 30)) * 0xBF58476D1CE4E5B9L
        z <- (z ^^^ (z >>> 27)) * 0x94D049BB133111EBL
        z ^^^ (z >>> 31)

    let checkFault () =
        if errorRate > 0.0 then
            let roll = lock lockObj (fun () -> (splitMix() &&& 0xFFFF_FFFFL |> float) / 4294967295.0)
            if roll < errorRate then
                failwith "BUGGIFY: Simulated disk read/write fault"

    let applyLatency () =
        if latencyMs > 0L then
            lock lockObj (fun () -> virtualElapsedMs <- virtualElapsedMs + latencyMs)

    let flushPublish (path: string) (bytes: byte[]) =
        lock lockObj (fun () -> publish path bytes)

    let commitWrite (path: string) (bytes: byte[]) =
        lock lockObj (fun () ->
            match crashArm with
            | Some(needle, afterBytes) when pathMatches needle path && bytes.Length > afterBytes ->
                crashArm <- None
                let prefix = Array.sub bytes 0 afterBytes
                publish path prefix
                raise (CrashMidWriteException(path, afterBytes, bytes.Length))
            | _ ->
                match corruptArm with
                | Some(needle, lastBytes) when
                    pathMatches needle path && bytes.Length > 0 && lastBytes > 0
                    ->
                    corruptArm <- None
                    let copy = Array.copy bytes
                    let n = min lastBytes copy.Length
                    let start = copy.Length - n

                    for i in start .. copy.Length - 1 do
                        copy.[i] <- copy.[i] ^^^ corruptXor

                    publish path copy
                | _ ->
                    match reorderNeedle, heldWrite with
                    | Some needle, None when pathMatches needle path ->
                        heldWrite <- Some(path, bytes)
                    | Some needle, Some(heldPath, heldBytes) when pathMatches needle path ->
                        reorderNeedle <- None
                        heldWrite <- None
                        publish path bytes
                        publish heldPath heldBytes
                    | _ -> publish path bytes)

    member _.Files = files

    /// One-shot: next matching write Dispose commits `afterBytes` then throws.
    /// `ISimulatedFs` stays flush-only; this is the crash-mid-write intercept.
    member _.ArmCrashMidWrite(pathContains: string, afterBytes: int) =
        if String.IsNullOrEmpty pathContains then
            invalidArg (nameof pathContains) "pathContains must be non-empty"

        if afterBytes < 0 then
            invalidArg (nameof afterBytes) "afterBytes must be >= 0"

        lock lockObj (fun () -> crashArm <- Some(pathContains, afterBytes))

    /// One-shot: next matching write Dispose XORs the last `lastBytes` with 0xA5
    /// and commits. The write acks; recovery must not trust the tail.
    member _.ArmCorruptLastWrite(pathContains: string, lastBytes: int) =
        if String.IsNullOrEmpty pathContains then
            invalidArg (nameof pathContains) "pathContains must be non-empty"

        if lastBytes < 1 then
            invalidArg (nameof lastBytes) "lastBytes must be >= 1"

        lock lockObj (fun () -> corruptArm <- Some(pathContains, lastBytes))

    /// One-shot: hold the first matching Dispose (file not yet visible), then
    /// the second matching Dispose commits itself first and flushes the held
    /// write. Flush-publish does not arm this door. Freeze writes intent
    /// (Flush), then leaves (object Dispose), then commit (log Dispose).
    member _.ArmReorderNextTwo(pathContains: string) =
        if String.IsNullOrEmpty pathContains then
            invalidArg (nameof pathContains) "pathContains must be non-empty"

        lock lockObj (fun () ->
            reorderNeedle <- Some pathContains
            heldWrite <- None)

    /// One-shot: next matching Delete removes the file then throws.
    member _.ArmCrashOnDelete(pathContains: string) =
        if String.IsNullOrEmpty pathContains then
            invalidArg (nameof pathContains) "pathContains must be non-empty"

        lock lockObj (fun () -> deleteCrashArm <- Some pathContains)

    /// Paths in the order they became visible. Held writes are absent until flushed.
    member _.CommitOrder = lock lockObj (fun () -> commitOrder.ToArray())

    /// Injected latency in virtual milliseconds. Never wall-clock sleep.
    member _.VirtualElapsedMs = lock lockObj (fun () -> virtualElapsedMs)

    /// Set simulated latency (in milliseconds) and probabilistic error rate [0.0, 1.0].
    member _.SetFaults(rate: float, latency: int64, seed: int64) =
        lock lockObj (fun () ->
            errorRate <- rate
            latencyMs <- latency
            rngState <- seed)

    interface IFileSystem with
        member _.Exists(path) =
            checkFault()
            files.ContainsKey(path)

        member _.Delete(path) =
            checkFault()
            let crash =
                lock lockObj (fun () ->
                    match deleteCrashArm with
                    | Some needle when pathMatches needle path ->
                        deleteCrashArm <- None
                        true
                    | _ -> false)

            files.TryRemove(path) |> ignore

            if crash then
                raise (CrashMidSweepException path)

        member _.Move(src, dest, _overwrite) =
            checkFault()
            match files.TryRemove(src) with
            | true, bytes -> files.[dest] <- bytes
            | false, _ -> raise (FileNotFoundException(src))

        member _.ReadAllBytes(path) =
            checkFault()
            applyLatency()
            match files.TryGetValue(path) with
            | true, bytes -> bytes
            | false, _ -> raise (FileNotFoundException(path))

        member _.ReadAllBytesAsync(path, ct) = task {
            ct.ThrowIfCancellationRequested()
            checkFault()
            applyLatency()
            match files.TryGetValue(path) with
            | true, bytes -> return bytes
            | false, _ -> return raise (FileNotFoundException(path))
        }

        member _.OpenFile(path, mode, access, _share) =
            new SimulatedFileStream(path, mode, access, files, checkFault, applyLatency, commitWrite, flushPublish) :> Stream

        member _.OpenWrite(path, _fsync) =
            new SimulatedFileStream(path, FileMode.Create, FileAccess.Write, files, checkFault, applyLatency, commitWrite, flushPublish) :> Stream

        member _.OpenRead(path) =
            new SimulatedFileStream(path, FileMode.Open, FileAccess.Read, files, checkFault, applyLatency, commitWrite, flushPublish) :> Stream

        member _.GetFiles(path, searchPattern) =
            checkFault()
            let suffix = searchPattern.Replace("*", "")
            files.Keys
            |> Seq.filter (fun k -> k.StartsWith(path) && k.EndsWith(suffix))
            |> Seq.toArray

        member _.CreateDirectory(_path) =
            checkFault()
            ()

/// Polyfill `IBlockIo`: one host file, LBA * BlockSize offset, through `IFileSystem`.
[<Sealed>]
type FileSystemBlockIo(fs: IFileSystem, path: string, blockSize: int) =
    do
        if blockSize <= 0 || (blockSize &&& (blockSize - 1)) <> 0 then
            invalidArg "blockSize" "block size must be a positive power of two"

        if not (fs.Exists path) then
            use stream = fs.OpenWrite(path, false)
            ()

    interface IBlockIo with
        member _.BlockSize = blockSize

        member _.Read(lba, dst) =
            use stream = fs.OpenFile(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite)
            let offset = int64 lba * int64 blockSize

            if offset >= stream.Length then
                0
            else
                stream.Seek(offset, SeekOrigin.Begin) |> ignore
                let remaining = int (stream.Length - offset)
                let toRead = min dst.Length remaining
                stream.Read(dst.Span.Slice(0, toRead))

        member _.Write(lba, src) =
            use stream =
                fs.OpenFile(path, FileMode.OpenOrCreate, FileAccess.ReadWrite, FileShare.Read)

            let offset = int64 lba * int64 blockSize
            stream.Seek(offset, SeekOrigin.Begin) |> ignore
            stream.Write(src.Span)
            src.Length

        member _.Flush() =
            use stream = fs.OpenFile(path, FileMode.Open, FileAccess.ReadWrite, FileShare.Read)
            stream.Flush()

/// DST block device: LBA → sparse blocks in memory. Not POSIX, not NVMe.
/// Write is visible immediately. `ArmCrashMidWrite` tears the next Write
/// that is longer than `afterBytes`. Crash recovery of a volume on this
/// door stays `toy` until freeze/CAS speak `IBlockIo` instead of files.
[<Sealed>]
type SimulatedBlockIo(blockSize: int) =
    do
        if blockSize <= 0 || (blockSize &&& (blockSize - 1)) <> 0 then
            invalidArg "blockSize" "block size must be a positive power of two"

    let blocks = System.Collections.Concurrent.ConcurrentDictionary<uint64, byte[]>()
    let lockObj = obj ()
    let mutable crashArm: int option = None
    let mutable writes = 0

    let writeRange (startLba: uint64) (src: ReadOnlySpan<byte>) =
        let mutable offset = 0

        while offset < src.Length do
            let lba = startLba + uint64 (offset / blockSize)
            let within = offset % blockSize
            let n = min (blockSize - within) (src.Length - offset)
            let block = blocks.GetOrAdd(lba, fun _ -> Array.zeroCreate blockSize)
            src.Slice(offset, n).CopyTo(Span(block, within, n))
            offset <- offset + n

    /// One-shot: next Write longer than `afterBytes` commits that prefix then throws.
    member _.ArmCrashMidWrite(afterBytes: int) =
        if afterBytes < 0 then
            invalidArg (nameof afterBytes) "afterBytes must be >= 0"

        lock lockObj (fun () -> crashArm <- Some afterBytes)

    member _.Writes = lock lockObj (fun () -> writes)

    interface IBlockIo with
        member _.BlockSize = blockSize

        member _.Read(lba, dst) =
            if dst.Length = 0 then
                0
            else
                let mutable copied = 0
                let mutable offset = 0

                while offset < dst.Length do
                    let cur = lba + uint64 (offset / blockSize)
                    let within = offset % blockSize
                    let n = min (blockSize - within) (dst.Length - offset)

                    match blocks.TryGetValue cur with
                    | true, block -> Span(block, within, n).CopyTo(dst.Span.Slice(offset, n))
                    | false, _ -> dst.Span.Slice(offset, n).Clear()

                    copied <- copied + n

                    offset <- offset + n

                copied

        member _.Write(lba, src) =
            lock lockObj (fun () ->
                writes <- writes + 1

                match crashArm with
                | Some afterBytes when src.Length > afterBytes ->
                    crashArm <- None
                    writeRange lba (src.Span.Slice(0, afterBytes))
                    raise (
                        CrashMidWriteException(
                            "lba:"
                            + lba.ToString(System.Globalization.CultureInfo.InvariantCulture),
                            afterBytes,
                            src.Length
                        ))
                | _ ->
                    writeRange lba src.Span
                    src.Length)

        member _.Flush() = ()


/// The global file system registry containing the active IFileSystem implementation.
[<AbstractClass; Sealed>]
type FileSystem =
    static member val private defaultFs = PhysicalFileSystem() :> IFileSystem
    static member val private localFs = System.Threading.AsyncLocal<IFileSystem>()

    /// Gets the current filesystem provider.
    static member Current =
        let localVal = FileSystem.localFs.Value
        if obj.ReferenceEquals(localVal, null) then FileSystem.defaultFs
        else localVal

    /// Registers a custom filesystem provider (e.g. InMemoryFileSystem).
    static member Register(fs: IFileSystem) = FileSystem.localFs.Value <- fs

    /// Resets the filesystem provider back to PhysicalFileSystem.
    static member Reset() = FileSystem.localFs.Value <- Unchecked.defaultof<IFileSystem>
