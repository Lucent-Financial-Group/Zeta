module Zeta.Tests.FrameSignalsTests

open System
open System.Collections.Generic
open System.IO
open System.Text.Json
open Xunit
open Zeta.Core

module GE = Zeta.Core.GameEnvironment

let private requireOk =
    function
    | Ok value -> value
    | Error feedback -> failwithf "unexpected feedback: %A" feedback

let private repoRoot () =
    let mutable directory =
        DirectoryInfo(Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location))

    while not (isNull directory) && not (File.Exists(Path.Join(directory.FullName, "Zeta.sln"))) do
        directory <- directory.Parent

    if isNull directory then failwith "could not locate repo root" else directory.FullName

let private treatyPath () =
    Path.Join(repoRoot (), "src", "Core", "golden-vectors-frame-signals.json")

let private frameOfJson (element: JsonElement) : GE.Frame =
    { W = element.GetProperty("width").GetInt32()
      H = element.GetProperty("height").GetInt32()
      Palette = element.GetProperty("palette").GetInt32()
      Cells = [| for cell in element.GetProperty("cells").EnumerateArray() -> byte (cell.GetInt32()) |] }

let private assertShape (expected: JsonElement) (actual: FrameSignals.Shape) =
    Assert.Equal(expected.GetProperty("width").GetInt32(), actual.Width)
    Assert.Equal(expected.GetProperty("height").GetInt32(), actual.Height)
    Assert.Equal(expected.GetProperty("area").GetInt32(), actual.Area)
    Assert.Equal(expected.GetProperty("perimeter").GetInt64(), actual.Perimeter)

    let expectedCells =
        [ for cell in expected.GetProperty("cells").EnumerateArray() do
              let coordinates = cell.EnumerateArray() |> Seq.toArray
              yield coordinates.[0].GetInt32(), coordinates.[1].GetInt32() ]

    let actualCells = actual.Cells |> List.map (fun point -> point.X, point.Y)
    Assert.Equal<(int * int) list>(expectedCells, actualCells)

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
    Assert.NotEqual<byte list>(first.ForegroundPalette, movedAndRecoloured.ForegroundPalette)
    Assert.NotEqual<FrameSignals.Point list>(first.ComponentOrigins, movedAndRecoloured.ComponentOrigins)

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
    Assert.False(motion.ColourOccupancyChanged)
    Assert.False(motion.ColourEdgeDensityChanged)
    Assert.True(motion.PlacementChanged)

    let colour = FrameSignals.compare first recoloured |> requireOk
    Assert.Equal(1, colour.ChangedCells)
    Assert.Equal(1, colour.RecolouredForegroundCells)
    Assert.Equal(0, colour.BackgroundCrossings)
    Assert.False(colour.StructureChanged)
    Assert.True(colour.PaletteChanged)
    Assert.True(colour.ColourOccupancyChanged)
    Assert.True(colour.ColourEdgeDensityChanged)
    Assert.False(colour.PlacementChanged)

[<Fact>]
let ``shape and density changes are explicit`` () =
    let first = frame 4 2 3 0uy [ 0, 0, 1uy ]
    let grown = frame 4 2 3 0uy [ 0, 0, 1uy; 1, 0, 1uy ]
    let delta = FrameSignals.compare first grown |> requireOk

    Assert.Equal(1, delta.ChangedCells)
    Assert.Equal(1_250, delta.ChangeDensityBasisPoints)
    Assert.True(delta.StructureChanged)
    Assert.False(delta.PaletteChanged)
    Assert.True(delta.ColourOccupancyChanged)
    Assert.True(delta.ColourEdgeDensityChanged)
    Assert.False(delta.PlacementChanged)
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
        Assert.False(delta.ColourOccupancyChanged)
        Assert.False(delta.ColourEdgeDensityChanged)
        Assert.True(delta.PlacementChanged)
        Assert.Equal(2, delta.BackgroundCrossings)
        Assert.Equal(0, delta.RecolouredForegroundCells)
        Assert.Equal(previous.Cells.Length, delta.Receipt.ComparedCells)

[<Fact>]
let ``FSharp frame signals replay the shared semantic treaty`` () =
    use document = JsonDocument.Parse(File.ReadAllText(treatyPath ()))
    let root = document.RootElement
    Assert.Equal(1, root.GetProperty("schemaVersion").GetInt32())
    Assert.Equal(10_000, root.GetProperty("basisPointScale").GetInt32())
    let frames = Dictionary<string, GE.Frame>(StringComparer.Ordinal)

    for case in root.GetProperty("observations").EnumerateArray() do
        let name = case.GetProperty("name").GetString() |> Option.ofObj |> Option.get
        let input = frameOfJson (case.GetProperty("frame"))
        frames.Add(name, input)
        let expected = case.GetProperty("expected")
        let actual = FrameSignals.observe input |> requireOk
        Assert.Equal(byte (expected.GetProperty("background").GetInt32()), actual.Background)

        let expectedPalette =
            [ for colour in expected.GetProperty("foregroundPalette").EnumerateArray() -> byte (colour.GetInt32()) ]

        Assert.Equal<byte list>(expectedPalette, actual.ForegroundPalette)
        let expectedColours = expected.GetProperty("colours").EnumerateArray() |> Seq.toArray
        Assert.Equal(expectedColours.Length, actual.Colours.Length)

        for expectedColour, actualColour in Array.zip expectedColours (List.toArray actual.Colours) do
            Assert.Equal(byte (expectedColour.GetProperty("colour").GetInt32()), actualColour.Colour)
            Assert.Equal(expectedColour.GetProperty("pixels").GetInt32(), actualColour.Pixels)

            Assert.Equal(
                expectedColour.GetProperty("occupancyBasisPoints").GetInt32(),
                actualColour.OccupancyBasisPoints
            )

            Assert.Equal(expectedColour.GetProperty("componentCount").GetInt32(), actualColour.ComponentCount)

            Assert.Equal(
                expectedColour.GetProperty("edgeDensityBasisPoints").GetInt32(),
                actualColour.EdgeDensityBasisPoints
            )

        let expectedShapes = expected.GetProperty("shapes").EnumerateArray() |> Seq.toArray
        Assert.Equal(expectedShapes.Length, actual.StructuralShapes.Length)
        Array.iter2 assertShape expectedShapes (List.toArray actual.StructuralShapes)

        let expectedOrigins =
            [ for origin in expected.GetProperty("origins").EnumerateArray() do
                  let coordinates = origin.EnumerateArray() |> Seq.toArray
                  yield coordinates.[0].GetInt32(), coordinates.[1].GetInt32() ]

        let actualOrigins = actual.ComponentOrigins |> List.map (fun point -> point.X, point.Y)
        Assert.Equal<(int * int) list>(expectedOrigins, actualOrigins)

    for case in root.GetProperty("comparisons").EnumerateArray() do
        let previousName = case.GetProperty("previous").GetString() |> Option.ofObj |> Option.get
        let currentName = case.GetProperty("current").GetString() |> Option.ofObj |> Option.get
        let expected = case.GetProperty("expected")
        let actual = FrameSignals.compare frames.[previousName] frames.[currentName] |> requireOk
        Assert.Equal(expected.GetProperty("changedCells").GetInt32(), actual.ChangedCells)
        Assert.Equal(expected.GetProperty("changeDensityBasisPoints").GetInt32(), actual.ChangeDensityBasisPoints)

        Assert.Equal(
            expected.GetProperty("recolouredForegroundCells").GetInt32(),
            actual.RecolouredForegroundCells
        )

        Assert.Equal(
            expected.GetProperty("recolourDensityBasisPoints").GetInt32(),
            actual.RecolourDensityBasisPoints
        )

        Assert.Equal(expected.GetProperty("backgroundCrossings").GetInt32(), actual.BackgroundCrossings)
        Assert.Equal(expected.GetProperty("backgroundChanged").GetBoolean(), actual.BackgroundChanged)
        Assert.Equal(expected.GetProperty("structureChanged").GetBoolean(), actual.StructureChanged)
        Assert.Equal(expected.GetProperty("paletteChanged").GetBoolean(), actual.PaletteChanged)

        Assert.Equal(
            expected.GetProperty("colourOccupancyChanged").GetBoolean(),
            actual.ColourOccupancyChanged
        )

        Assert.Equal(
            expected.GetProperty("colourEdgeDensityChanged").GetBoolean(),
            actual.ColourEdgeDensityChanged
        )

        Assert.Equal(expected.GetProperty("placementChanged").GetBoolean(), actual.PlacementChanged)
