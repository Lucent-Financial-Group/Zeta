namespace Zeta.Core

open System
open System.Collections.Generic

/// Deterministic visual signals over the cross-emulator frame contract.
/// Only rendered palette cells cross this boundary; game identity, rewards,
/// emulator state, and reference answers are deliberately absent.
[<RequireQualifiedAccess>]
module FrameSignals =

    [<Struct; StructuralEquality; StructuralComparison>]
    type Point =
        { X: int
          Y: int }

    /// Translation- and palette-invariant connected-component shape.
    [<StructuralEquality; StructuralComparison>]
    type Shape =
        { Width: int
          Height: int
          Area: int
          Perimeter: int64
          Cells: Point list }

    [<StructuralEquality; StructuralComparison>]
    type Component =
        { Colour: byte
          Origin: Point
          CentroidXNumerator: int64
          CentroidYNumerator: int64
          CentroidDenominator: int
          Shape: Shape }

    [<Struct; StructuralEquality; StructuralComparison>]
    type ColourSignal =
        { Colour: byte
          Pixels: int
          OccupancyBasisPoints: int
          ComponentCount: int
          EdgeDensityBasisPoints: int }

    [<StructuralEquality; StructuralComparison>]
    type PaletteShape =
        { Colour: byte
          Shape: Shape }

    [<StructuralEquality; StructuralComparison>]
    type PlacedShape =
        { Origin: Point
          Shape: Shape }

    /// Exact algorithmic accounting. Coordinates are logical retained values,
    /// not CLR heap size; neighbor probes include out-of-frame boundaries.
    [<Struct>]
    type ObservationReceipt =
        { FrameCells: int
          HistogramUpdates: int
          NeighborProbes: int64
          Components: int
          ForegroundCoordinatesRetained: int }

    type Observation =
        { Width: int
          Height: int
          Background: byte
          Components: Component list
          Colours: ColourSignal list
          StructuralShapes: Shape list
          PaletteShapes: PaletteShape list
          PlacedShapes: PlacedShape list
          Receipt: ObservationReceipt }

    [<Struct>]
    type ComparisonReceipt =
        { ComparedCells: int
          Previous: ObservationReceipt
          Current: ObservationReceipt }

    type Delta =
        { ChangedCells: int
          ChangeDensityBasisPoints: int
          RecolouredForegroundCells: int
          RecolourDensityBasisPoints: int
          BackgroundCrossings: int
          BackgroundChanged: bool
          StructureChanged: bool
          PaletteChanged: bool
          PlacementChanged: bool
          Receipt: ComparisonReceipt }

    type Feedback =
        | InvalidFrame of string
        | DimensionMismatch of previousWidth: int * previousHeight: int * currentWidth: int * currentHeight: int

    let private basisPoints (part: int64) (whole: int64) : int =
        if whole = 0L then 0 else int (part * 10_000L / whole)

    let private validate (frame: GameEnvironment.Frame) : Result<unit, Feedback> =
        let expected = int64 frame.W * int64 frame.H

        if frame.W <= 0 || frame.H <= 0 then
            Error(InvalidFrame "frame dimensions must be positive")
        elif frame.Palette <= 0 || frame.Palette > 256 then
            Error(InvalidFrame "palette size must be in 1..256")
        elif isNull frame.Cells then
            Error(InvalidFrame "frame cells must not be null")
        elif expected > int64 Int32.MaxValue || int64 frame.Cells.Length <> expected then
            Error(InvalidFrame "frame cell count must equal width times height")
        elif frame.Cells |> Array.exists (fun value -> int value >= frame.Palette) then
            Error(InvalidFrame "frame cell exceeds the declared palette")
        else
            Ok()

    let private dominantColour (histogram: int[]) : int =
        let mutable dominant = 0

        for colour in 1 .. histogram.Length - 1 do
            if histogram.[colour] > histogram.[dominant] then
                dominant <- colour

        dominant

    let private observeValidated (frame: GameEnvironment.Frame) : Observation =
        let histogram = Array.zeroCreate<int> frame.Palette

        for colour in frame.Cells do
            let index = int colour
            histogram.[index] <- histogram.[index] + 1

        let background = dominantColour histogram
        let visited = Array.zeroCreate<bool> frame.Cells.Length
        let components = ResizeArray<Component>()
        let componentCounts = Array.zeroCreate<int> frame.Palette
        let colourPerimeters = Array.zeroCreate<int64> frame.Palette
        let mutable neighborProbes = 0L

        for start in 0 .. frame.Cells.Length - 1 do
            let colour = int frame.Cells.[start]

            if colour <> background && not visited.[start] then
                let pending = Stack<int>()
                let cells = ResizeArray<Point>()
                let mutable minX = Int32.MaxValue
                let mutable minY = Int32.MaxValue
                let mutable maxX = Int32.MinValue
                let mutable maxY = Int32.MinValue
                let mutable sumX = 0L
                let mutable sumY = 0L
                let mutable perimeter = 0L

                visited.[start] <- true
                pending.Push start

                while pending.Count > 0 do
                    let index = pending.Pop()
                    let x = index % frame.W
                    let y = index / frame.W
                    cells.Add { X = x; Y = y }
                    minX <- min minX x
                    minY <- min minY y
                    maxX <- max maxX x
                    maxY <- max maxY y
                    sumX <- sumX + int64 x
                    sumY <- sumY + int64 y

                    let probe nx ny =
                        neighborProbes <- neighborProbes + 1L

                        if nx < 0 || nx >= frame.W || ny < 0 || ny >= frame.H then
                            perimeter <- perimeter + 1L
                        else
                            let neighbor = (ny * frame.W) + nx

                            if int frame.Cells.[neighbor] <> colour then
                                perimeter <- perimeter + 1L
                            elif not visited.[neighbor] then
                                visited.[neighbor] <- true
                                pending.Push neighbor

                    probe (x - 1) y
                    probe (x + 1) y
                    probe x (y - 1)
                    probe x (y + 1)

                let normalizedCells =
                    cells
                    |> Seq.map (fun point ->
                        { X = point.X - minX
                          Y = point.Y - minY })
                    |> Seq.sortBy (fun point -> point.Y, point.X)
                    |> Seq.toList

                let shape =
                    { Width = maxX - minX + 1
                      Height = maxY - minY + 1
                      Area = cells.Count
                      Perimeter = perimeter
                      Cells = normalizedCells }

                components.Add
                    { Colour = byte colour
                      Origin = { X = minX; Y = minY }
                      CentroidXNumerator = sumX
                      CentroidYNumerator = sumY
                      CentroidDenominator = cells.Count
                      Shape = shape }

                componentCounts.[colour] <- componentCounts.[colour] + 1
                colourPerimeters.[colour] <- colourPerimeters.[colour] + perimeter

        let componentList = components |> Seq.toList

        let colours =
            [ for colour in 0 .. frame.Palette - 1 do
                  let pixels = histogram.[colour]

                  if colour <> background && pixels > 0 then
                      yield
                          { Colour = byte colour
                            Pixels = pixels
                            OccupancyBasisPoints = basisPoints (int64 pixels) (int64 frame.Cells.Length)
                            ComponentCount = componentCounts.[colour]
                            EdgeDensityBasisPoints =
                                basisPoints colourPerimeters.[colour] (4L * int64 pixels) } ]

        let structuralShapes = componentList |> List.map _.Shape |> List.sort

        let paletteShapes =
            componentList
            |> List.map (fun item ->
                { Colour = item.Colour
                  Shape = item.Shape })
            |> List.sort

        let placedShapes =
            componentList
            |> List.map (fun item ->
                { Origin = item.Origin
                  Shape = item.Shape })
            |> List.sort

        { Width = frame.W
          Height = frame.H
          Background = byte background
          Components = componentList
          Colours = colours
          StructuralShapes = structuralShapes
          PaletteShapes = paletteShapes
          PlacedShapes = placedShapes
          Receipt =
            { FrameCells = frame.Cells.Length
              HistogramUpdates = frame.Cells.Length
              NeighborProbes = neighborProbes
              Components = componentList.Length
              ForegroundCoordinatesRetained = componentList |> List.sumBy _.Shape.Area } }

    /// Reduce one rendered frame to reusable visual signals.
    let observe (frame: GameEnvironment.Frame) : Result<Observation, Feedback> =
        validate frame |> Result.map (fun () -> observeValidated frame)

    let private compareValidated (previous: GameEnvironment.Frame) (current: GameEnvironment.Frame) : Delta =
        let previousObservation = observeValidated previous
        let currentObservation = observeValidated current
        let previousBackground = previousObservation.Background
        let currentBackground = currentObservation.Background
        let mutable changed = 0
        let mutable recoloured = 0
        let mutable backgroundCrossings = 0

        for index in 0 .. previous.Cells.Length - 1 do
            let before = previous.Cells.[index]
            let after = current.Cells.[index]

            if before <> after then
                changed <- changed + 1
                let beforeForeground = before <> previousBackground
                let afterForeground = after <> currentBackground

                if beforeForeground && afterForeground then
                    recoloured <- recoloured + 1
                elif beforeForeground <> afterForeground then
                    backgroundCrossings <- backgroundCrossings + 1

        { ChangedCells = changed
          ChangeDensityBasisPoints = basisPoints (int64 changed) (int64 previous.Cells.Length)
          RecolouredForegroundCells = recoloured
          RecolourDensityBasisPoints = basisPoints (int64 recoloured) (int64 previous.Cells.Length)
          BackgroundCrossings = backgroundCrossings
          BackgroundChanged = previousBackground <> currentBackground
          StructureChanged = previousObservation.StructuralShapes <> currentObservation.StructuralShapes
          PaletteChanged = previousObservation.PaletteShapes <> currentObservation.PaletteShapes
          PlacementChanged = previousObservation.PlacedShapes <> currentObservation.PlacedShapes
          Receipt =
            { ComparedCells = previous.Cells.Length
              Previous = previousObservation.Receipt
              Current = currentObservation.Receipt } }

    /// Compare two compatible frames. A background crossing means exactly one
    /// cell is foreground, while a recolor means both cells remain foreground.
    let compare (previous: GameEnvironment.Frame) (current: GameEnvironment.Frame) : Result<Delta, Feedback> =
        result {
            do! validate previous
            do! validate current

            if previous.W <> current.W || previous.H <> current.H then
                return! Error(DimensionMismatch(previous.W, previous.H, current.W, current.H))

            return compareValidated previous current
        }
