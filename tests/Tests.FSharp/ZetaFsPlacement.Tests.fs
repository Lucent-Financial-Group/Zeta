module Zeta.Tests.ZetaFsPlacementTests

open System
open global.Xunit
open Zeta.Core
open Zeta.Core.FSharp.Blake3

let private ensureHasher () =
    System.Runtime.CompilerServices.RuntimeHelpers.RunClassConstructor(typeof<OwnBlake3Hasher>.TypeHandle)

let private content (s: string) =
    ensureHasher ()
    ContentHash256.ofBytes (Text.Encoding.UTF8.GetBytes s)

let private dev (n: uint64) =
    ZetaFsPlacement.DeviceId.ofRaw(System.UInt128(0UL, n))

let private two = [| dev 1UL; dev 2UL |]

[<Fact>]
let ``same ContentId profile epoch yields the same assignment`` () =
    let c = content "object-a"
    let a = ZetaFsPlacement.assign c ZetaFsPolicy.PlacementProfile.Mirror two
    let b = ZetaFsPlacement.assign c ZetaFsPolicy.PlacementProfile.Mirror two
    match a, b with
    | Ok x, Ok y ->
        Assert.Equal(x.Extents.[0].Device.Raw, y.Extents.[0].Device.Raw)
        Assert.Equal(x.Extents.[1].Device.Raw, y.Extents.[1].Device.Raw)
    | _ -> Assert.Fail("assign failed")

[<Fact>]
let ``polyfill profile is single — not RAID on a host directory`` () =
    Assert.Equal(ZetaFsPolicy.PlacementProfile.Single, ZetaFsPlacement.polyfillProfile)

[<Fact>]
let ``HRW does not call RendezvousHash.Pick integer slots`` () =
    // Named-bucket score: two devices, ContentId mix. Integer Pick(key, n)
    // would ignore device identity and only see n=2. Changing device ids
    // must be able to change the winner.
    let c = content "key"
    let a = ZetaFsPlacement.assign c ZetaFsPolicy.PlacementProfile.Single [| dev 1UL; dev 2UL |]
    let b = ZetaFsPlacement.assign c ZetaFsPolicy.PlacementProfile.Single [| dev 99UL; dev 100UL |]
    match a, b with
    | Ok x, Ok y ->
        Assert.NotEqual<System.UInt128>(x.Extents.[0].Device.Raw, y.Extents.[0].Device.Raw)
    | _ -> Assert.Fail("assign failed")

[<Fact>]
let ``mirror survives loss of one device; stripe does not`` () =
    let c = content "payload"
    let payload = Text.Encoding.UTF8.GetBytes "abcdefghijklmnop"
    match
        ZetaFsPlacement.assign c ZetaFsPolicy.PlacementProfile.Mirror two,
        ZetaFsPlacement.assign c ZetaFsPolicy.PlacementProfile.Stripe two
    with
    | Ok mirror, Ok stripe ->
        Assert.Equal(2, mirror.Extents.Length)
        Assert.Equal(2, stripe.Extents.Length)
        Assert.NotEqual<System.UInt128>(mirror.Extents.[0].Device.Raw, mirror.Extents.[1].Device.Raw)
        // Mirror: both extents are full replicas (Data 0). One remains => object remains.
        match mirror.Extents.[0].Role, mirror.Extents.[1].Role with
        | ZetaFsPlacement.Role.Data 0, ZetaFsPlacement.Role.Data 0 -> ()
        | r -> Assert.Fail(sprintf "mirror roles %A" r)
        // Stripe: Data 0 and Data 1. Losing either loses the object.
        match stripe.Extents.[0].Role, stripe.Extents.[1].Role with
        | ZetaFsPlacement.Role.Data i, ZetaFsPlacement.Role.Data j -> Assert.NotEqual(i, j)
        | r -> Assert.Fail(sprintf "stripe roles %A" r)
        Assert.True(payload.Length > 0)
    | _ -> Assert.Fail("assign failed")

[<Fact>]
let ``single+parity: a punched data region reconstructs; whole-device loss does not`` () =
    let bytes = Array.init 100 (fun i -> byte i)
    let d0, d1 = ZetaFsPlacement.split2 bytes
    let parity = Array.copy d0
    ZetaFsPlacement.xorInto parity d1
    match ZetaFsPlacement.tryXorRepair None (Some d1) (Some parity) with
    | Some a, Some b ->
        let got = ZetaFsPlacement.join2 a b bytes.Length
        Assert.Equal<byte>(bytes, got)
    | _ -> Assert.Fail("sector hole should reconstruct")

    match ZetaFsPlacement.tryXorRepair None None None with
    | None, None -> ()
    | _ -> Assert.Fail("whole-device loss must not reconstruct")

[<Fact>]
let ``assign is deterministic across device-array permutation`` () =
    let c = content "perm"
    let a = [| dev 3UL; dev 7UL; dev 9UL |]
    let b = [| dev 9UL; dev 3UL; dev 7UL |]
    match
        ZetaFsPlacement.assign c ZetaFsPolicy.PlacementProfile.Single a,
        ZetaFsPlacement.assign c ZetaFsPolicy.PlacementProfile.Single b
    with
    | Ok x, Ok y -> Assert.Equal(x.Extents.[0].Device.Raw, y.Extents.[0].Device.Raw)
    | _ -> Assert.Fail("assign failed")
