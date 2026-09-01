module Zeta.Tests.ZetaFsStoreTests

open System
open System.IO
open System.Threading
open global.Xunit
open Zeta.Core
open Zeta.Core.FSharp.Blake3
open Zeta.Cli


let private tempParent () =
    let path =
        Path.Combine(Path.GetTempPath(), sprintf "zetafs-cli-%s" (Guid.NewGuid().ToString("N")))
    Directory.CreateDirectory path |> ignore
    path


[<Fact>]
let ``init creates .zetafs without a git repository`` () =
    let parent = tempParent ()
    try
        let dir = ZetaFsStore.init parent
        Assert.True(Directory.Exists dir)
        Assert.Equal(Path.Combine(parent, ZetaFsStore.DirName), dir)
        Assert.True(File.Exists(Path.Combine(dir, "HEAD")))
        Assert.Equal(
            ZetaFsFormat.render ZetaFsFormat.pr6Default,
            File.ReadAllText(Path.Combine(dir, ZetaFsFormat.FileName))
        )
    finally
        Directory.Delete(parent, true)


[<Fact>]
let ``discover walks parents; nearest .zetafs wins`` () =
    let parent = tempParent ()
    try
        let store = ZetaFsStore.init parent
        let child = Path.Combine(parent, "a", "b")
        Directory.CreateDirectory child |> ignore
        match ZetaFsStore.discover child with
        | Some found -> Assert.Equal(store, found)
        | None -> Assert.Fail("expected to find .zetafs from a nested directory")
        Assert.True(ZetaFsStore.discover (Path.GetTempPath()) <> Some store)
    finally
        Directory.Delete(parent, true)


[<Fact>]
let ``StoreSelect.tryZetaFs opens a log; tryGit is None off the git tree`` () =
    let parent = tempParent ()
    try
        ZetaFsStore.init parent |> ignore
        match StoreSelect.tryZetaFs parent with
        | None -> Assert.Fail("expected ZetaFS store")
        | Some log -> Assert.Equal("refs/heads/main", log.CurrentRef)
        match StoreSelect.tryGit parent with
        | None -> ()
        | Some(_, repo) ->
            repo.Dispose()
            Assert.Fail("temp dir must not resolve a git repo")
    finally
        Directory.Delete(parent, true)


[<Fact>]
let ``DbCommand emit then fold on ZetaFS needs no LibGit2Sharp`` () =
    task {
        let parent = tempParent ()
        try
            ZetaFsStore.init parent |> ignore
            match StoreSelect.tryZetaFs parent with
            | None -> Assert.Fail("expected ZetaFS store")
            | Some log ->
                let key = DvKey.ofValue (DynamicValue.String "k")
                let! emitted =
                    DbCommand.run log CancellationToken.None (DbCommand.Emit(ZSet.ofSeq [ key, 1L ], Map.empty))
                match emitted with
                | Ok(DbCommandResult.Emitted seq) -> Assert.Equal(1L, seq)
                | other -> Assert.Fail(sprintf "expected Emitted, got %A" other)
                let! folded = DbCommand.run log CancellationToken.None (DbCommand.Fold -1L)
                match folded with
                | Ok(DbCommandResult.Folded entries) ->
                    Assert.Equal(1, entries.Length)
                    Assert.Equal(1L, entries.[0].Delta.[key])
                | other -> Assert.Fail(sprintf "expected Folded, got %A" other)
        finally
            Directory.Delete(parent, true)
    }
