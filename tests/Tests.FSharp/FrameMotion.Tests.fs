module Zeta.Tests.FrameMotionTests

open Xunit
open Zeta.Core

module GE = Zeta.Core.GameEnvironment

let private requireOk =
    function
    | Ok value -> value
    | Error feedback -> failwithf "unexpected feedback: %A" feedback

let private renderedFrames (fixture: CartFixtures.Fixture) (count: int) : GE.Frame list =
    let environment =
        GE.Chip8Adapter(fixture.Cart.Rom, fixture.Cart.Seed, fixture.Cart.CyclesPerTick)
        :> GE.IEnvironment<Chip8Cow.Frame>

    let mutable state = environment.Reset() |> requireOk |> Chip8Cow.run 3

    [ for _ in 1 .. count do
          state <- environment.Step(state, ControlScheme.Go "stay") |> requireOk
          yield environment.Frame state |> requireOk ]

let private litPoint (frame: GE.Frame) : int * int =
    frame.Cells
    |> Array.findIndex ((<>) 0uy)
    |> fun index -> index % frame.W, index / frame.W

[<Fact>]
let ``source-owned CHIP8 cart renders a moving pixel without exposing registers to the predictor`` () =
    let points =
        renderedFrames CartFixtures.motionDotFast 4
        |> List.map litPoint

    Assert.Equal<(int * int) list>([ (4, 8); (6, 8); (8, 8); (10, 8) ], points)

[<Theory>]
[<InlineData("forward")>]
[<InlineData("reverse")>]
[<InlineData("fast")>]
[<InlineData("fast-reverse")>]
let ``one-step motion beats current-position control across direction and speed variants`` variant =
    let fixture =
        match variant with
        | "forward" -> CartFixtures.motionDotForward
        | "reverse" -> CartFixtures.motionDotReverse
        | "fast" -> CartFixtures.motionDotFast
        | "fast-reverse" -> CartFixtures.motionDotFastReverse
        | unknown -> failwithf "unknown test variant %s" unknown

    let frames = renderedFrames fixture 8
    let observed = FrameMotion.evaluate FrameMotion.Projection.Observed frames |> requireOk
    let projected = FrameMotion.evaluate FrameMotion.Projection.OneStep frames |> requireOk

    Assert.Equal(0, observed.Correct)
    Assert.Equal(6, observed.Total)
    Assert.Equal(0, observed.BasisPoints)
    Assert.Equal(6, projected.Correct)
    Assert.Equal(6, projected.Total)
    Assert.Equal(10_000, projected.BasisPoints)
    Assert.Equal(observed.State.MaximumLogicalBytes, projected.State.MaximumLogicalBytes)
    Assert.Equal(28, projected.State.LogicalBytes)

[<Fact>]
let ``frame motion is palette-label agnostic`` () =
    let frame x colour : GE.Frame =
        let cells = Array.create 12 3uy
        cells.[4 + x] <- colour

        { W = 4
          H = 3
          Palette = 8
          Cells = cells }

    let frames = [ frame 0 6uy; frame 1 2uy; frame 2 7uy; frame 3 1uy ]
    let receipt = FrameMotion.evaluate FrameMotion.Projection.OneStep frames |> requireOk

    Assert.Equal(2, receipt.Correct)
    Assert.Equal(2, receipt.Total)

[<Fact>]
let ``retained motion state stays bounded as observation count grows`` () =
    let frames = renderedFrames CartFixtures.motionDotForward 20

    let final =
        frames
        |> List.fold (fun state frame -> FrameMotion.observe state frame |> requireOk) FrameMotion.empty

    let receipt = FrameMotion.receipt final
    Assert.Equal(20, receipt.Observations)
    Assert.Equal(2, receipt.CoordinatesRetained)
    Assert.Equal(7, receipt.LogicalInt32Values)
    Assert.Equal(28, receipt.LogicalBytes)
    Assert.Equal(28, receipt.MaximumLogicalBytes)

[<Fact>]
let ``invalid or empty frames return typed feedback`` () =
    let emptyFrame: GE.Frame =
        { W = 2
          H = 2
          Palette = 2
          Cells = Array.zeroCreate 4 }

    let malformed = { emptyFrame with Cells = Array.zeroCreate 3 }

    Assert.Equal(Error FrameMotion.NoForeground, FrameMotion.observe FrameMotion.empty emptyFrame)

    Assert.Equal(
        Error(FrameMotion.InvalidFrame "frame cell count must equal width times height"),
        FrameMotion.observe FrameMotion.empty malformed
    )

    Assert.Equal(Error FrameMotion.InsufficientEvaluationFrames, FrameMotion.evaluate FrameMotion.Projection.OneStep [ emptyFrame ])

[<Fact>]
let ``projection outside the display returns typed feedback`` () =
    let state: FrameMotion.State =
        { Previous = Some { X = 0; Y = 1 }
          Current = Some { X = 1; Y = 1 }
          Width = 2
          Height = 2
          Observations = 2 }

    Assert.Equal(
        Error(FrameMotion.ProjectionOutsideFrame(2L, 1L)),
        FrameMotion.predict FrameMotion.Projection.OneStep state
    )

[<Fact>]
let ``observation counter saturates without changing bounded state`` () =
    let frame = renderedFrames CartFixtures.motionDotForward 1 |> List.head

    let state: FrameMotion.State =
        { FrameMotion.empty with
            Observations = System.Int32.MaxValue }

    let observed = FrameMotion.observe state frame |> requireOk
    let receipt = FrameMotion.receipt observed

    Assert.Equal(System.Int32.MaxValue, observed.Observations)
    Assert.Equal(20, receipt.LogicalBytes)
    Assert.Equal(28, receipt.MaximumLogicalBytes)
