module Zeta.Tests.ZetaFsCliTests

open System
open System.IO
open global.Xunit
open Zeta.Core
open Zeta.Core.FSharp.Blake3

let private hasher () =
    System.Runtime.CompilerServices.RuntimeHelpers.RunClassConstructor(typeof<OwnBlake3Hasher>.TypeHandle)

let private hex64 = String('a', 64)

let private mintedEntity () =
    let e = Environment.createVirtual 3L :> Zeta.Core.ISimulationEnvironment
    ZetaFsNamespace.EntityId.mint (ZetaFsNamespace.Entropy(fun () -> e.NextInt64()))

[<Fact>]
let ``64-hex without prefix is a path, not ContentId`` () =
    match ZetaFsCli.parse hex64 with
    | Ok(ZetaFsCli.Token.Path p) ->
        Assert.Equal(hex64, p)
        match ZetaFsCli.hexFilenameWarning (ZetaFsCli.Token.Path p) with
        | Some _ -> ()
        | None -> Assert.Fail("64-hex path must warn")
    | other -> Assert.Fail(sprintf "expected Path, got %A" other)

[<Fact>]
let ``blake3 prefix is ContentId`` () =
    match ZetaFsCli.parse ("blake3:" + hex64) with
    | Ok(ZetaFsCli.Token.Content h) -> Assert.Equal(hex64, h.ToHex())
    | other -> Assert.Fail(sprintf "expected Content, got %A" other)

[<Fact>]
let ``uppercase BLAKE3 prefix is a path, never guessed as ContentId`` () =
    let token = "BLAKE3:" + hex64
    match ZetaFsCli.parse token with
    | Ok(ZetaFsCli.Token.Path p) -> Assert.Equal(token, p)
    | other -> Assert.Fail(sprintf "expected Path, got %A" other)

[<Fact>]
let ``entity prefix is EntityId Crockford-26`` () =
    let id = mintedEntity ()
    let token = "entity:" + id.Format()
    match ZetaFsCli.parse token with
    | Ok(ZetaFsCli.Token.Entity got) -> Assert.Equal(id.Raw, got.Raw)
    | other -> Assert.Fail(sprintf "expected Entity, got %A" other)

[<Fact>]
let ``ordinary path stays a path`` () =
    match ZetaFsCli.parse "src/Core/ZetaFs.fs" with
    | Ok(ZetaFsCli.Token.Path p) -> Assert.Equal("src/Core/ZetaFs.fs", p)
    | other -> Assert.Fail(sprintf "%A" other)

[<Fact>]
let ``empty and truncated prefixes are errors, not paths`` () =
    match ZetaFsCli.parse "" with
    | Error ZetaFsCli.ParseError.Empty -> ()
    | other -> Assert.Fail(sprintf "%A" other)

    match ZetaFsCli.parse "blake3:deadbeef" with
    | Error(ZetaFsCli.ParseError.BadBlake3 rest) -> Assert.Equal("deadbeef", rest)
    | other -> Assert.Fail(sprintf "%A" other)

    match ZetaFsCli.parse "entity:not-crockford-26-chars!!" with
    | Error(ZetaFsCli.ParseError.BadEntity _) -> ()
    | other -> Assert.Fail(sprintf "%A" other)

[<Fact>]
let ``describe round-trips Content and Entity prefixes`` () =
    match ZetaFsCli.parse ("blake3:" + hex64) with
    | Ok t -> Assert.Equal("blake3:" + hex64, ZetaFsCli.describe t)
    | other -> Assert.Fail(sprintf "%A" other)

    let id = mintedEntity ()
    match ZetaFsCli.parse ("entity:" + id.Format()) with
    | Ok t -> Assert.Equal("entity:" + id.Format(), ZetaFsCli.describe t)
    | other -> Assert.Fail(sprintf "%A" other)

[<Fact>]
let ``ASCII skeleton flags 0/O lookalikes as a fact, not a merge`` () =
    Assert.True(ZetaFsCli.confusable "file0" "fileO")
    Assert.False(ZetaFsCli.confusable "file0" "file0")
    Assert.False(ZetaFsCli.confusable "alpha" "beta")
    Assert.Equal("fileo", ZetaFsCli.asciiSkeleton "file0")
    Assert.Equal("fileo", ZetaFsCli.asciiSkeleton "fileO")

[<Fact>]
let ``identify of a 64-hex filename warns and still hashes as a path`` () =
    hasher ()
    let pathBytes = Text.Encoding.UTF8.GetBytes "path-bytes"
    match ZetaFsCli.identify hex64 (fun p -> if p = hex64 then Some pathBytes else None) with
    | Ok id ->
        match id.Kind with
        | ZetaFsCli.Token.Path p -> Assert.Equal(hex64, p)
        | other -> Assert.Fail(sprintf "kind %A" other)

        Assert.True(id.Warning.IsSome)
        match id.ContentLine with
        | Some line ->
            Assert.StartsWith("blake3:", line, StringComparison.Ordinal)
            Assert.Equal("blake3:" + (ContentHash256.ofBytes pathBytes).ToHex(), line)
        | None -> Assert.Fail("readable path must also print ContentId")
    | Error e -> Assert.Fail(sprintf "%A" e)

[<Fact>]
let ``cat of 64-hex token uses the path resolver, not ContentId`` () =
    let pathBytes = [| 1uy; 2uy |]
    let contentBytes = [| 9uy |]
    let r: ZetaFsCli.Resolve =
        { ReadPath = fun p -> if p = hex64 then Some pathBytes else None
          ReadContent = fun _ -> Some contentBytes
          ReadEntity = fun _ -> Some contentBytes }

    match ZetaFsCli.cat hex64 r with
    | Ok got -> Assert.Equal<byte[]>(pathBytes, got)
    | Error e -> Assert.Fail(sprintf "%A" e)

    match ZetaFsCli.cat ("blake3:" + hex64) r with
    | Ok got -> Assert.Equal<byte[]>(contentBytes, got)
    | Error e -> Assert.Fail(sprintf "%A" e)

[<Fact>]
let ``cat entity uses the entity resolver`` () =
    let id = mintedEntity ()
    let entityBytes = [| 7uy |]
    let r: ZetaFsCli.Resolve =
        { ReadPath = fun _ -> Some [| 1uy |]
          ReadContent = fun _ -> Some [| 2uy |]
          ReadEntity = fun e -> if e.Raw = id.Raw then Some entityBytes else None }

    match ZetaFsCli.cat ("entity:" + id.Format()) r with
    | Ok got -> Assert.Equal<byte[]>(entityBytes, got)
    | Error e -> Assert.Fail(sprintf "%A" e)

[<Fact>]
let ``content object path is 256-bit fan-out, not a 128-bit truncation`` () =
    match ZetaFsCli.parse ("blake3:" + hex64) with
    | Ok(ZetaFsCli.Token.Content h) ->
        let path = ZetaFsCli.contentObjectPath "/store" h
        let leaf = Path.GetFileName path
        let slash = Path.DirectorySeparatorChar.ToString()
        Assert.Equal(hex64.Substring(2), leaf)
        Assert.Equal(62, leaf.Length)
        Assert.Contains(slash + "objects" + slash + hex64.Substring(0, 2) + slash, path, StringComparison.Ordinal)
    | other -> Assert.Fail(sprintf "%A" other)
