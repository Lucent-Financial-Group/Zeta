module Zeta.Tests.CartFixturesTests

open global.Xunit
open Zeta.Core

[<Fact>]
let ``assembler helpers produce inspectable CHIP8 bytes`` () =
    Assert.Equal<byte[]>([| 0x6Auy; 0x0Cuy; 0x12uy; 0x02uy |], CartFixtures.loopRom)
    Assert.Equal<byte[]>([| 0xEAuy; 0x9Euy; 0x12uy; 0x00uy |], CartFixtures.inputForkRom)
    Assert.Equal<byte[]>([| 0xF0uy; 0x0Auy |], CartFixtures.keyWaitRom)

[<Fact>]
let ``classic child carts are source-owned deterministic fixtures`` () =
    let loop = CartFixtures.cart CartFixtures.loop
    let inputFork = CartFixtures.cart CartFixtures.inputFork

    Assert.True(CartFixtures.loopRom = loop.Rom)
    Assert.True(CartFixtures.inputForkRom = inputFork.Rom)
    Assert.Equal(1UL, loop.Seed)
    Assert.Equal(1, loop.CyclesPerTick)
    Assert.True(Map.isEmpty loop.Recording.Crossings)
    Assert.True((GameFingerprint.fingerprint loop.Rom).Sha256 <> (GameFingerprint.fingerprint inputFork.Rom).Sha256)

[<Fact>]
let ``CHIP9 color-dot cart uses the emulator extension directly`` () =
    let cart = CartFixtures.cart CartFixtures.chip9GreenDot
    let final = Cart.playback cart

    Assert.Equal(CartFixtures.Dialect.Chip9, CartFixtures.chip9GreenDot.Dialect)
    Assert.Equal(2uy, final.Plane)
    Assert.False(Chip8Cow.pixel 0 0 final)
    Assert.Equal(2uy, Chip8Cow.colorAt 0 0 final)
    Assert.True(Map.containsKey 0 final.Extra)

[<Fact>]
let ``CHIP9 white-dot cart can light all color planes`` () =
    let final = Cart.playback (CartFixtures.cart CartFixtures.chip9WhiteDot)

    Assert.Equal(7uy, final.Plane)
    Assert.True(Chip8Cow.pixel 0 0 final)
    Assert.Equal(7uy, Chip8Cow.colorAt 0 0 final)

[<Fact>]
let ``motion-dot cart is an inspectable four-instruction frame loop`` () =
    match CartFixtures.motionDotRom 4 8 2 with
    | Error feedback -> failwith feedback
    | Ok rom ->
        Assert.Equal<byte[]>(
            [| 0x60uy; 0x04uy
               0x61uy; 0x08uy
               0xA2uy; 0x0Euy
               0x00uy; 0xE0uy
               0xD0uy; 0x11uy
               0x70uy; 0x02uy
               0x12uy; 0x06uy
               0x80uy |],
            rom
        )

[<Fact>]
let ``motion-dot cart rejects invalid coordinates and zero velocity as values`` () =
    Assert.Equal(Error "motion-dot start X must be inside the CHIP-8 display", CartFixtures.motionDotRom -1 8 1)
    Assert.Equal(Error "motion-dot Y must be inside the CHIP-8 display", CartFixtures.motionDotRom 4 32 1)
    Assert.Equal(Error "motion-dot delta must be in -8..-1 or 1..8", CartFixtures.motionDotRom 4 8 0)
