module Zeta.Tests.ZetaFsReclaimTests

open System
open System.IO
open global.Xunit
open Zeta.Core
open Zeta.Core.FSharp.Blake3

let private cid (n: byte) : ContentHash256 =
    { Raw = Array.init 32 (fun i -> if i = 0 then n else 0uy) }

let private obj (n: byte) (size: uint64) (refs: byte[]) : ZetaFsReclaim.Object =
    { Id = cid n
      Size = size
      Refs = [| for r in refs -> cid r |] }

let private roots live openFiles keepAll rolling freeze : ZetaFsReclaim.Roots =
    { LiveRefs = live
      OpenFiles = openFiles
      KeepAll = keepAll
      RollingLive = rolling
      FreezeInFlight = freeze }

[<Fact>]
let ``lifetime maps keep-all rolling none onto Singleton Scoped Transient`` () =
    Assert.Equal(ZetaFsReclaim.Lifetime.Singleton, ZetaFsReclaim.lifetimeOf ZetaFsPolicy.HistoryPolicy.KeepAll)
    Assert.Equal(ZetaFsReclaim.Lifetime.Scoped, ZetaFsReclaim.lifetimeOf (ZetaFsPolicy.HistoryPolicy.Rolling(Some 32, None, None)))
    Assert.Equal(ZetaFsReclaim.Lifetime.Transient, ZetaFsReclaim.lifetimeOf ZetaFsPolicy.HistoryPolicy.KeepNone)

[<Fact>]
let ``live ref and jumprope edge are not reclaim-eligible`` () =
    let a = obj 1uy 10UL [| 2uy |]
    let b = obj 2uy 10UL [||]
    let r = roots [| ZetaFsReclaim.hex a.Id |] [||] [||] [||] [||]
    let got = ZetaFsReclaim.propose r [| a; b |] { Bytes = 1000UL; Count = 10 }
    Assert.Equal(0, got.Length)

[<Fact>]
let ``open-file nested scope protects mutbuf content until last-close`` () =
    let x = obj 3uy 8UL [||]
    let pinned = roots [||] [| ZetaFsReclaim.hex x.Id |] [||] [||] [||]
    let closed = roots [||] [||] [||] [||] [||]
    Assert.Equal(0, (ZetaFsReclaim.propose pinned [| x |] { Bytes = 100UL; Count = 4 }).Length)
    Assert.Equal(1, (ZetaFsReclaim.propose closed [| x |] { Bytes = 100UL; Count = 4 }).Length)

[<Fact>]
let ``keep-all Singleton is never eligible; Transient is after last-close`` () =
    let x = obj 4uy 8UL [||]
    let keep = roots [||] [||] [| ZetaFsReclaim.hex x.Id |] [||] [||]
    Assert.Equal(0, (ZetaFsReclaim.propose keep [| x |] { Bytes = 100UL; Count = 4 }).Length)

[<Fact>]
let ``rolling Scoped survivors stay pinned`` () =
    let x = obj 8uy 8UL [||]
    let r = roots [||] [||] [||] [| ZetaFsReclaim.hex x.Id |] [||]
    Assert.Equal(0, (ZetaFsReclaim.propose r [| x |] { Bytes = 100UL; Count = 4 }).Length)

[<Fact>]
let ``pacer budget is freeze bytes, not a clock, and skips objects larger than remaining`` () =
    Assert.Equal(0UL, (ZetaFsReclaim.pacer 0UL).Bytes)
    Assert.Equal(40UL, (ZetaFsReclaim.pacer 40UL).Bytes)
    let a = obj 5uy 30UL [||]
    let b = obj 6uy 30UL [||]
    let r = roots [||] [||] [||] [||] [||]
    let got = ZetaFsReclaim.propose r [| a; b |] (ZetaFsReclaim.pacer 40UL)
    Assert.Equal(1, got.Length)
    Assert.Equal(ZetaFsReclaim.hex a.Id, ZetaFsReclaim.hex got.[0])

[<Fact>]
let ``freeze-in-flight LSN pins the new ContentId during a concurrent sweep`` () =
    let x = obj 7uy 8UL [||]
    let r = roots [||] [||] [||] [||] [| ZetaFsReclaim.hex x.Id |]
    Assert.Equal(0, (ZetaFsReclaim.propose r [| x |] { Bytes = 100UL; Count = 4 }).Length)

[<Fact>]
let ``partial apply deletes only the minted paths; live files stay`` () =
    FileSystem.Register(InMemoryFileSystem())

    try
        let fs = FileSystem.Current
        fs.CreateDirectory "/reclaim"
        FileSystemIo.writeAllBytes fs "/reclaim/live" [| 1uy |]
        FileSystemIo.writeAllBytes fs "/reclaim/garbage" [| 2uy |]
        let n =
            ZetaFsReclaim.apply
                fs
                [| cid 9uy, "/reclaim/garbage" |]
                { Bytes = 100UL; Count = 1 }
        Assert.Equal(1, n)
        Assert.False(fs.Exists "/reclaim/garbage")
        Assert.True(fs.Exists "/reclaim/live")
    finally
        FileSystem.Reset()
