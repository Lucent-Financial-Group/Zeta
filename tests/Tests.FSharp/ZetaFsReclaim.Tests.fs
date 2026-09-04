[<global.Xunit.Collection("ZetaFsAmbientFileSystem")>]
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
    // D3: Regen stays Singleton until a generator is metered. Phase-2 reclaim
    // of the original bytes is a later PR; this mapping must not silently
    // become Transient.
    Assert.Equal(
        ZetaFsReclaim.Lifetime.Singleton,
        ZetaFsReclaim.lifetimeOf (ZetaFsPolicy.HistoryPolicy.Regen("gen", [])))

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
let ``rolling window of 2 after 5 versions leaves 3 reclaim-eligible`` () =
    // D11: policies exist so a DB freeze storm cannot 10× the volume.
    // keep-all would pin all five; rolling(N=2) pins the last two and the
    // older three must be eligible. The window fold that *computes*
    // RollingLive from N is not this ferry — this is the bound once that
    // pin set is supplied.
    let versions = [| for n in 1uy .. 5uy -> obj n 8UL [||] |]
    let pinLastTwo = versions.[3..] |> Array.map (fun v -> ZetaFsReclaim.hex v.Id)
    let r = roots [||] [||] [||] pinLastTwo [||]
    let got = ZetaFsReclaim.propose r versions { Bytes = 1000UL; Count = 10 }
    Assert.Equal(3, got.Length)
    let eligible = got |> Array.map ZetaFsReclaim.hex |> Set.ofArray
    Assert.True(eligible.Contains(ZetaFsReclaim.hex versions.[0].Id))
    Assert.True(eligible.Contains(ZetaFsReclaim.hex versions.[1].Id))
    Assert.True(eligible.Contains(ZetaFsReclaim.hex versions.[2].Id))
    Assert.False(eligible.Contains(ZetaFsReclaim.hex versions.[3].Id))
    Assert.False(eligible.Contains(ZetaFsReclaim.hex versions.[4].Id))

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
        let root = "reclaim"
        let live = Path.Combine(root, "live")
        let garbage = Path.Combine(root, "garbage")
        fs.CreateDirectory root
        FileSystemIo.writeAllBytes fs live [| 1uy |]
        FileSystemIo.writeAllBytes fs garbage [| 2uy |]
        let n =
            ZetaFsReclaim.apply
                fs
                [| cid 9uy, garbage |]
                { Bytes = 100UL; Count = 1 }
        Assert.Equal(1, n)
        Assert.False(fs.Exists garbage)
        Assert.True(fs.Exists live)
    finally
        FileSystem.Reset()

[<Fact>]
let ``crash-mid-sweep deletes the matching path then leaves remaining garbage and live files`` () =
    let mock = InMemoryFileSystem()
    FileSystem.Register(mock)

    try
        let fs = FileSystem.Current
        let root = "reclaim-crash"
        let live = Path.Combine(root, "live")
        let g1 = Path.Combine(root, "g1")
        let g2 = Path.Combine(root, "g2")
        let g3 = Path.Combine(root, "g3")
        fs.CreateDirectory root
        FileSystemIo.writeAllBytes fs live [| 1uy |]
        FileSystemIo.writeAllBytes fs g1 [| 2uy |]
        FileSystemIo.writeAllBytes fs g2 [| 3uy |]
        FileSystemIo.writeAllBytes fs g3 [| 4uy |]
        mock.ArmCrashOnDelete("g2")
        let ex =
            Assert.Throws<CrashMidSweepException>(fun () ->
                ZetaFsReclaim.apply
                    fs
                    [| cid 1uy, g1; cid 2uy, g2; cid 3uy, g3 |]
                    { Bytes = 100UL; Count = 10 }
                |> ignore)

        Assert.Equal(g2, ex.Path)
        Assert.False(fs.Exists g1)
        Assert.False(fs.Exists g2)
        Assert.True(fs.Exists g3)
        Assert.True(fs.Exists live)
    finally
        FileSystem.Reset()
