namespace Zeta.Core

open System
open System.IO
open System.Runtime.InteropServices


/// Directory and file durability helpers.
///
/// POSIX `fsync` on a file does not make a *new directory entry* durable.
/// `fsyncDir` exists for that. On Darwin, ordinary `fsync` is not a power-loss
/// barrier — Durable callers must use this Result API, which issues
/// `fcntl(F_FULLFSYNC)` on Darwin.
///
/// **Platform honesty:**
///   - Linux: `fsync`.
///   - Darwin: `fcntl(F_FULLFSYNC)`.
///   - Windows directory: documented no-op (`Ok ()`). Do not claim Durable.
///   - Windows file: `Flush(flushToDisk=true)` (FlushFileBuffers). Still no
///     Durable claim for the volume.
///
/// Durable ZetaFS (PR7) must use `fsyncFile` / `fsyncDir` and fail Freeze on
/// Error. Do not call `fsyncDirBestEffort` on that path — that helper still
/// prints and continues, which is a lie if you then ack Durable.
module FileSync =

    [<DllImport("libc", EntryPoint = "open", SetLastError = true)>]
    extern int private posixOpen(string pathname, int flags)

    [<DllImport("libc", EntryPoint = "fsync", SetLastError = true)>]
    extern int private posixFsync(int fd)

    [<DllImport("libc", EntryPoint = "fcntl", SetLastError = true)>]
    extern int private posixFcntl(int fd, int cmd)

    [<DllImport("libc", EntryPoint = "close", SetLastError = true)>]
    extern int private posixClose(int fd)

    [<Literal>]
    let private O_RDONLY = 0

    /// Darwin `fcntl` command. Not valid on Linux (cmd 51 is something else).
    [<Literal>]
    let private F_FULLFSYNC = 51

    type FileSyncError =
        | OpenFailed of path: string * errno: int
        | FlushFailed of path: string * errno: int

    let errorName (e: FileSyncError) : string =
        match e with
        | FileSyncError.OpenFailed _ -> "OpenFailed"
        | FileSyncError.FlushFailed _ -> "FlushFailed"

    let describe (e: FileSyncError) : string =
        match e with
        | FileSyncError.OpenFailed(path, errno) ->
            String.Format(
                Globalization.CultureInfo.InvariantCulture,
                "FileSync open({0}) failed (errno {1})",
                path,
                errno
            )
        | FileSyncError.FlushFailed(path, errno) ->
            String.Format(
                Globalization.CultureInfo.InvariantCulture,
                "FileSync flush({0}) failed (errno {1})",
                path,
                errno
            )

    let private lastErrno () : int = Marshal.GetLastWin32Error()

    let private flushFd (path: string) (fd: int) : Result<unit, FileSyncError> =
        let rc =
            if OperatingSystem.IsMacOS() then
                posixFcntl (fd, F_FULLFSYNC)
            else
                posixFsync fd

        if rc = 0 then
            Ok()
        else
            Error(FileSyncError.FlushFailed(path, lastErrno ()))

    let private flushPath (path: string) : Result<unit, FileSyncError> =
        if OperatingSystem.IsWindows() then
            Ok()
        else
            let fd = posixOpen (path, O_RDONLY)

            if fd < 0 then
                Error(FileSyncError.OpenFailed(path, lastErrno ()))
            else
                try
                    flushFd path fd
                finally
                    posixClose fd |> ignore

    /// fsync the directory at `dir` so newly-created entries are durable.
    /// Windows: `Ok ()` (documented no-op, not an equivalence).
    let fsyncDir (dir: string) : Result<unit, FileSyncError> = flushPath dir

    /// fsync the file at `path`. Darwin uses `F_FULLFSYNC`.
    /// Windows: FlushFileBuffers via `FileStream.Flush(true)`.
    let fsyncFile (path: string) : Result<unit, FileSyncError> =
        if OperatingSystem.IsWindows() then
            try
                use fs =
                    new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite, 1, FileOptions.None)

                fs.Flush(true)
                Ok()
            with
            | :? IOException as ex ->
                Error(FileSyncError.FlushFailed(path, ex.HResult))
            | :? UnauthorizedAccessException as ex ->
                Error(FileSyncError.OpenFailed(path, ex.HResult))
        else
            flushPath path

    /// Old eprintfn helper. Existing DiskDeltaLog / DiskSpine callers keep
    /// best-effort semantics. Durable Freeze must not call this.
    let fsyncDirBestEffort (dir: string) : unit =
        match fsyncDir dir with
        | Ok() -> ()
        | Error e -> eprintfn "%s" (describe e)
