module Zeta.Tests.ControlSchemeTests

// Devices are SECOND to the grammar: schemes are ZetaId'd total maps INTO the canonical action set;
// portability is the theorem (dpad-up ≡ 'w' ≡ pad-5 — different fingers, one meaning, one wire form).

open global.Xunit
open Zeta.Core

[<Fact>]
let ``every scheme is ZetaId-addressed and resolvable by id (the cartridge's direction)`` () =
    for s in ControlScheme.known do
        Assert.Equal(32, s.ZetaId.Length)
        Assert.Equal(Some s.Name, ControlScheme.byId s.ZetaId |> Option.map (fun x -> x.Name))
    // distinct schemes, distinct ids
    let ids = ControlScheme.known |> List.map (fun s -> s.ZetaId)
    Assert.Equal(List.length ids, List.distinct ids |> List.length)

[<Fact>]
let ``PORTABILITY: dpad-up, 'w', and pad-5 all mean the SAME grammar action and the SAME wire crossing`` () =
    let viaPad = ControlScheme.crossing ControlScheme.chip9Pad "5"
    let viaKbd = ControlScheme.crossing ControlScheme.keyboardWasd "w"
    let viaPadlt = ControlScheme.crossing ControlScheme.gamepadStandard "dpad-up"
    Assert.Equal(Some "go:n", viaPad)
    Assert.Equal(viaPad, viaKbd)
    Assert.Equal(viaKbd, viaPadlt) // one meaning, three fingers

[<Fact>]
let ``the grammar owns the wire: actions encode to the crossing payloads the rooms already speak`` () =
    Assert.Equal("go:hottest", ControlScheme.payload (ControlScheme.Go "hottest"))
    Assert.Equal("ui:conference", ControlScheme.payload ControlScheme.Conference)
    Assert.Equal("key:10:1", ControlScheme.payload (ControlScheme.Pad 0xA)) // the chip9 pad pass-through
    Assert.Equal("point:17:42", ControlScheme.payload (ControlScheme.Point(17, 42)))

[<Fact>]
let ``unmapped inputs are honest Nones — a scheme never invents meaning`` () =
    Assert.True(ControlScheme.translate ControlScheme.keyboardWasd "f13" |> Option.isNone)
    Assert.True(ControlScheme.crossing ControlScheme.gamepadStandard "select-plus-start" |> Option.isNone)

[<Fact>]
let ``ARC-AGI-3 maps all simple actions and canonical in-bounds ACTION6 points`` () =
    Assert.Equal(Some ControlScheme.Conference, ControlScheme.translate ControlScheme.arcAgi3 "RESET")
    Assert.Equal(Some(ControlScheme.Go "n"), ControlScheme.translate ControlScheme.arcAgi3 "ACTION1")
    Assert.Equal(Some ControlScheme.Select, ControlScheme.translate ControlScheme.arcAgi3 "ACTION5")
    Assert.Equal(Some(ControlScheme.Point(0, 0)), ControlScheme.translate ControlScheme.arcAgi3 "ACTION6:0:0")
    Assert.Equal(Some(ControlScheme.Point(63, 63)), ControlScheme.translate ControlScheme.arcAgi3 "ACTION6:63:63")
    Assert.Equal(Some "point:17:42", ControlScheme.crossing ControlScheme.arcAgi3 "ACTION6:17:42")
    Assert.Equal(Some ControlScheme.Back, ControlScheme.translate ControlScheme.arcAgi3 "ACTION7")

[<Fact>]
let ``ARC-AGI-3 refuses missing malformed non-canonical and out-of-bounds inputs`` () =
    let refused =
        [ "ACTION6"
          "ACTION6:1"
          "ACTION6:01:2"
          "ACTION6:-1:0"
          "ACTION6:64:0"
          "ACTION6:0:64"
          "ACTION8"
          "action1" ]

    for input in refused do
        Assert.True(ControlScheme.translate ControlScheme.arcAgi3 input |> Option.isNone, input)

    Assert.True(
        ControlScheme.translate ControlScheme.arcAgi3 (Unchecked.defaultof<string>) |> Option.isNone,
        "null"
    )

[<Fact>]
let ``ARC-AGI-3's 4103 actions remain distinct in the shared meaning space`` () =
    let simpleInputs = [ "RESET"; "ACTION1"; "ACTION2"; "ACTION3"; "ACTION4"; "ACTION5"; "ACTION7" ]

    let actions =
        [ yield! simpleInputs |> List.choose (ControlScheme.translate ControlScheme.arcAgi3)

          for y in 0..63 do
              for x in 0..63 do
                  yield ControlScheme.Point(x, y) ]

    Assert.Equal(4103, List.length actions)
    Assert.Equal(4103, actions |> Set.ofList |> Set.count)

[<Fact>]
let ``Atari's complete 18-action set embeds without collisions`` () =
    let inputs =
        [ "NOOP"
          "FIRE"
          "UP"
          "RIGHT"
          "LEFT"
          "DOWN"
          "UPRIGHT"
          "UPLEFT"
          "DOWNRIGHT"
          "DOWNLEFT"
          "UPFIRE"
          "RIGHTFIRE"
          "LEFTFIRE"
          "DOWNFIRE"
          "UPRIGHTFIRE"
          "UPLEFTFIRE"
          "DOWNRIGHTFIRE"
          "DOWNLEFTFIRE" ]

    let actions = inputs |> List.choose (ControlScheme.translate ControlScheme.atari2600)
    Assert.Equal(18, List.length actions)
    Assert.Equal(18, actions |> Set.ofList |> Set.count)

[<Fact>]
let ``a 64x64 Point cannot round-trip through the 4x4 GridBinding without loss`` () =
    let near = ControlScheme.Point(3, 3)
    let far = ControlScheme.Point(63, 63)
    let nearCell = ActionGrammar.ofGrid 3 3
    let farCell = ActionGrammar.ofGrid 63 63

    Assert.NotEqual(near, far)
    Assert.Equal(nearCell, farCell)

    let projected =
        GridBinding.empty
        |> GridBinding.bind nearCell near
        |> GridBinding.bind farCell far

    Assert.Equal(Some far, GridBinding.labelAt farCell projected)
    Assert.DoesNotContain(near, projected |> GridBinding.bound |> List.map snd)
