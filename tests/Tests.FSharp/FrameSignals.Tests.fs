module Zeta.Tests.FrameSignalsTests

open Xunit
open Zeta.Core

module GE = Zeta.Core.GameEnvironment

let private requireOk =
    function
    | Ok value -> value
    | Error feedback -> failwithf "unexpected feedback: %A" feedback

let private frame width height palette background (points: (int * int * byte) list) : GE.Frame =
    let cells = Array.create (width * height) background

    for x, y, colour in points do
        cells.[(y * width) + x] <- colour

    { W = width
      H = height
      Palette = palette
      Cells = cells }

let private renderedFrames (fixture: CartFixtures.Fixture) (count: int) : GE.Frame list =
    let environment =
        GE.Chip8Adapter(fixture.Cart.Rom, fixture.Cart.Seed, fixture.Cart.CyclesPerTick)
        :> GE.IEnvironment<Chip8Cow.Frame>

    let mutable state = environment.Reset() |> requireOk |> Chip8Cow.run 3

    [ for _ in 1 .. count do
          state <- environment.Step(state, ControlScheme.Go "stay") |> requireOk
          yield environment.Frame state |> requireOk ]

[<Fact>]
let ``observation measures occupancy components edges and exact work`` () =
    let observed =
        frame 5 4 4 0uy [ 0, 0, 1uy; 1, 0, 1uy; 0, 1, 1uy; 1, 1, 1uy; 4, 3, 2uy ]
        |> FrameSignals.observe
        |> requireOk

    Assert.Equal(0uy, observed.Background)
    Assert.Equal(2, observed.Components.Length)
    Assert.Equal(2, observed.Colours.Length)
    Assert.Equal(4, observed.Colours.[0].Pixels)
    Assert.Equal(2_000, observed.Colours.[0].OccupancyBasisPoints)
    Assert.Equal(1, observed.Colours.[0].ComponentCount)
    Assert.Equal(5_000, observed.Colours.[0].EdgeDensityBasisPoints)
    Assert.Equal(1, observed.Colours.[1].Pixels)
    Assert.Equal(500, observed.Colours.[1].OccupancyBasisPoints)
    Assert.Equal(10_000, observed.Colours.[1].EdgeDensityBasisPoints)
    Assert.Equal(20, observed.Receipt.FrameCells)
    Assert.Equal(20, observed.Receipt.HistogramUpdates)
    Assert.Equal(20L, observed.Receipt.NeighborProbes)
    Assert.Equal(5, observed.Receipt.ForegroundCoordinatesRetained)

[<Fact>]
let ``normalized structure survives translation and palette relabeling`` () =
    let first =
        frame 6 4 8 0uy [ 0, 0, 2uy; 1, 0, 2uy; 0, 1, 2uy ]
        |> FrameSignals.observe
        |> requireOk

    let movedAndRecoloured =
        frame 6 4 8 7uy [ 3, 2, 5uy; 4, 2, 5uy; 3, 3, 5uy ]
        |> FrameSignals.observe
        |> requireOk

    Assert.Equal<FrameSignals.Shape list>(first.StructuralShapes, movedAndRecoloured.StructuralShapes)
    Assert.NotEqual<FrameSignals.PaletteShape list>(first.PaletteShapes, movedAndRecoloured.PaletteShapes)
    Assert.NotEqual<FrameSignals.PlacedShape list>(first.PlacedShapes, movedAndRecoloured.PlacedShapes)

[<Fact>]
let ``translation is separated from direct foreground recoloring`` () =
    let first = frame 4 2 4 0uy [ 0, 0, 1uy ]
    let translated = frame 4 2 4 0uy [ 1, 0, 1uy ]
    let recoloured = frame 4 2 4 0uy [ 0, 0, 2uy ]

    let motion = FrameSignals.compare first translated |> requireOk
    Assert.Equal(2, motion.ChangedCells)
    Assert.Equal(2_500, motion.ChangeDensityBasisPoints)
    Assert.Equal(0, motion.RecolouredForegroundCells)
    Assert.Equal(2, motion.BackgroundCrossings)
    Assert.False(motion.StructureChanged)
    Assert.False(motion.PaletteChanged)
    Assert.True(motion.PlacementChanged)

    let colour = FrameSignals.compare first recoloured |> requireOk
    Assert.Equal(1, colour.ChangedCells)
    Assert.Equal(1, colour.RecolouredForegroundCells)
    Assert.Equal(0, colour.BackgroundCrossings)
    Assert.False(colour.StructureChanged)
    Assert.True(colour.PaletteChanged)
    Assert.False(colour.PlacementChanged)

[<Fact>]
let ``shape and density changes are explicit`` () =
    let first = frame 4 2 3 0uy [ 0, 0, 1uy ]
    let grown = frame 4 2 3 0uy [ 0, 0, 1uy; 1, 0, 1uy ]
    let delta = FrameSignals.compare first grown |> requireOk

    Assert.Equal(1, delta.ChangedCells)
    Assert.Equal(1_250, delta.ChangeDensityBasisPoints)
    Assert.True(delta.StructureChanged)
    Assert.True(delta.PaletteChanged)
    Assert.True(delta.PlacementChanged)
    Assert.Equal(8, delta.Receipt.ComparedCells)

[<Fact>]
let ``dominant-colour ties select the lower palette index`` () =
    let observed =
        frame 2 2 4 3uy [ 0, 0, 1uy; 1, 0, 1uy ]
        |> FrameSignals.observe
        |> requireOk

    Assert.Equal(1uy, observed.Background)
    Assert.Single(observed.Colours) |> ignore
    Assert.Equal(3uy, observed.Colours.Head.Colour)

[<Fact>]
let ``all-background frames produce a cold bounded observation`` () =
    let observed =
        frame 3 2 2 0uy []
        |> FrameSignals.observe
        |> requireOk

    Assert.Empty(observed.Components)
    Assert.Empty(observed.Colours)
    Assert.Empty(observed.StructuralShapes)
    Assert.Equal(0L, observed.Receipt.NeighborProbes)
    Assert.Equal(0, observed.Receipt.ForegroundCoordinatesRetained)

[<Fact>]
let ``invalid and incompatible frames return typed feedback`` () =
    let valid = frame 2 2 2 0uy [ 0, 0, 1uy ]
    let malformed = { valid with Cells = Array.zeroCreate 3 }
    let invalidCell = { valid with Cells = [| 0uy; 0uy; 0uy; 2uy |] }
    let resized = frame 3 2 2 0uy [ 0, 0, 1uy ]

    Assert.Equal(
        Error(FrameSignals.InvalidFrame "frame cell count must equal width times height"),
        FrameSignals.observe malformed
    )

    Assert.Equal(
        Error(FrameSignals.InvalidFrame "frame cell exceeds the declared palette"),
        FrameSignals.observe invalidCell
    )

    Assert.Equal(
        Error(FrameSignals.DimensionMismatch(2, 2, 3, 2)),
        FrameSignals.compare valid resized
    )

[<Fact>]
let ``source-owned CHIP8 motion cart keeps structure while placement changes`` () =
    let frames = renderedFrames CartFixtures.motionDotFast 4
    let observations = frames |> List.map (FrameSignals.observe >> requireOk)

    Assert.True(observations |> List.pairwise |> List.forall (fun (left, right) -> left.StructuralShapes = right.StructuralShapes))

    for previous, current in frames |> List.pairwise do
        let delta = FrameSignals.compare previous current |> requireOk
        Assert.False(delta.StructureChanged)
        Assert.False(delta.PaletteChanged)
        Assert.True(delta.PlacementChanged)
        Assert.Equal(2, delta.BackgroundCrossings)
        Assert.Equal(0, delta.RecolouredForegroundCells)
        Assert.Equal(previous.Cells.Length, delta.Receipt.ComparedCells)
