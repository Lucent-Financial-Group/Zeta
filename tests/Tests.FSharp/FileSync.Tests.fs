module Zeta.Tests.FileSyncTests

open System
open System.IO
open global.Xunit
open Zeta.Core

let private tempDir () =
    let path = Path.Combine(Path.GetTempPath(), sprintf "filesync-%s" (Guid.NewGuid().ToString("N")))
    Directory.CreateDirectory path |> ignore
    path

[<Fact>]
let ``fsyncDir of a missing path is Error not a throw`` () =
    let missing = Path.Combine(Path.GetTempPath(), sprintf "filesync-missing-%s" (Guid.NewGuid().ToString("N")))

    if OperatingSystem.IsWindows() then
        match FileSync.fsyncDir missing with
        | Ok() -> ()
        | Error e -> Assert.Fail(FileSync.describe e)
    else
        match FileSync.fsyncDir missing with
        | Ok() -> Assert.Fail("missing directory must not succeed on POSIX")
        | Error e -> Assert.Equal("OpenFailed", FileSync.errorName e)

[<Fact>]
let ``fsyncDir of a real directory is Ok on this host`` () =
    let dir = tempDir ()

    try
        match FileSync.fsyncDir dir with
        | Ok() -> ()
        | Error e -> Assert.Fail(FileSync.describe e)
    finally
        Directory.Delete dir

[<Fact>]
let ``fsyncFile of a real file is Ok on this host`` () =
    let dir = tempDir ()

    try
        let path = Path.Combine(dir, "f")
        File.WriteAllBytes(path, [| 1uy; 2uy; 3uy |])

        match FileSync.fsyncFile path with
        | Ok() -> ()
        | Error e -> Assert.Fail(FileSync.describe e)
    finally
        Directory.Delete(dir, true)

[<Fact>]
let ``fsyncDirBestEffort does not throw on a missing path`` () =
    let missing = Path.Combine(Path.GetTempPath(), sprintf "filesync-be-%s" (Guid.NewGuid().ToString("N")))
    FileSync.fsyncDirBestEffort missing
