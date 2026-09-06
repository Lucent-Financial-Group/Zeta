namespace Zeta.Core

open System

/// Bounded visual motion estimation over the cross-emulator frame contract.
/// The kernel sees palette cells only: no cart identity, emulator state,
/// reference answer, score, or ARC-specific metadata enters this boundary.
[<RequireQualifiedAccess>]
module FrameMotion =

    [<Struct>]
    type Point =
        { X: int
          Y: int }

    [<RequireQualifiedAccess>]
    type Projection =
        | Observed
        | OneStep

    type Feedback =
        | InvalidFrame of string
        | NoForeground
        | InsufficientHistory
        | ProjectionOutsideFrame of x: int64 * y: int64
        | InsufficientEvaluationFrames
        | IncomparableReceipts of string

    [<Struct>]
    type State =
        { Previous: Point option
          Current: Point option
          Width: int
          Height: int
          Observations: int }

    [<Struct>]
    type StateReceipt =
        { Observations: int
          CoordinatesRetained: int
          LogicalInt32Values: int
          LogicalBytes: int
          MaximumLogicalBytes: int }

    [<Struct>]
    type AccuracyReceipt =
        { Correct: int
          Total: int
          BasisPoints: int
          State: StateReceipt }

    [<Struct>]
    type ProjectionSelection =
        { Selected: Projection
          ObservedBasisPoints: int
          OneStepBasisPoints: int
          DeltaBasisPoints: int }

    let empty: State =
        { Previous = None
          Current = None
          Width = 0
          Height = 0
          Observations = 0 }

    let private validate (frame: GameEnvironment.Frame) : Result<unit, Feedback> =
        let expected = int64 frame.W * int64 frame.H

        if frame.W <= 0 || frame.H <= 0 then
            Error(InvalidFrame "frame dimensions must be positive")
        elif frame.Palette <= 1 || frame.Palette > 256 then
            Error(InvalidFrame "palette size must be in 2..256")
        elif isNull frame.Cells then
            Error(InvalidFrame "frame cells must not be null")
        elif expected > int64 Int32.MaxValue || int64 frame.Cells.Length <> expected then
            Error(InvalidFrame "frame cell count must equal width times height")
        elif frame.Cells |> Array.exists (fun value -> int value >= frame.Palette) then
            Error(InvalidFrame "frame cell exceeds the declared palette")
        else
            Ok()

    let private foregroundCentroid (frame: GameEnvironment.Frame) : Result<Point, Feedback> =
        let histogram = Array.zeroCreate<int> frame.Palette

        for value in frame.Cells do
            let index = int value
            histogram.[index] <- histogram.[index] + 1

        let mutable background = 0

        for index in 1 .. histogram.Length - 1 do
            if histogram.[index] > histogram.[background] then
                background <- index

        let mutable count = 0L
        let mutable sumX = 0L
        let mutable sumY = 0L

        for index in 0 .. frame.Cells.Length - 1 do
            if int frame.Cells.[index] <> background then
                count <- count + 1L
                sumX <- sumX + int64 (index % frame.W)
                sumY <- sumY + int64 (index / frame.W)

        if count = 0L then
            Error NoForeground
        else
            Ok
                { X = int (sumX / count)
                  Y = int (sumY / count) }

    /// Integrate one rendered frame into a constant-size two-observation state.
    let observe (state: State) (frame: GameEnvironment.Frame) : Result<State, Feedback> =
        result {
            do! validate frame
            let! point = foregroundCentroid frame

            let previous =
                if state.Width = frame.W && state.Height = frame.H then
                    state.Current
                else
                    None

            return
                { Previous = previous
                  Current = Some point
                  Width = frame.W
                  Height = frame.H
                  Observations =
                    if state.Observations = Int32.MaxValue then
                        Int32.MaxValue
                    else
                        state.Observations + 1 }
        }

    /// Read either the last observed point or its one-step constant-velocity
    /// projection. Out-of-frame projections are typed refusals.
    let predict (projection: Projection) (state: State) : Result<Point, Feedback> =
        match projection, state.Previous, state.Current with
        | Projection.Observed, _, Some current -> Ok current
        | Projection.OneStep, Some previous, Some current ->
            let x = (2L * int64 current.X) - int64 previous.X
            let y = (2L * int64 current.Y) - int64 previous.Y

            if x < 0L || x >= int64 state.Width || y < 0L || y >= int64 state.Height then
                Error(ProjectionOutsideFrame(x, y))
            else
                Ok { X = int x; Y = int y }
        | _ -> Error InsufficientHistory

    /// Logical payload accounting for the source-owned state schema. This is
    /// not CLR object size or process RSS; it is an exact count of retained
    /// 32-bit values and remains bounded as observations grow.
    let receipt (state: State) : StateReceipt =
        let coordinates =
            (if state.Previous.IsSome then 1 else 0)
            + (if state.Current.IsSome then 1 else 0)

        let words = 3 + (coordinates * 2)

        { Observations = state.Observations
          CoordinatesRetained = coordinates
          LogicalInt32Values = words
          LogicalBytes = words * sizeof<int>
          MaximumLogicalBytes = 7 * sizeof<int> }

    /// Select a projection from comparable measurements. A tie keeps the
    /// observed-position control; a more complex policy must earn promotion.
    let selectProjection
        (observed: AccuracyReceipt)
        (oneStep: AccuracyReceipt)
        : Result<ProjectionSelection, Feedback> =
        if observed.Total <= 0 || oneStep.Total <= 0 then
            Error(IncomparableReceipts "projection receipts must contain observations")
        elif observed.Total <> oneStep.Total then
            Error(IncomparableReceipts "projection receipts must cover the same number of forecasts")
        else
            Ok
                { Selected =
                    if oneStep.BasisPoints > observed.BasisPoints then
                        Projection.OneStep
                    else
                        Projection.Observed
                  ObservedBasisPoints = observed.BasisPoints
                  OneStepBasisPoints = oneStep.BasisPoints
                  DeltaBasisPoints = oneStep.BasisPoints - observed.BasisPoints }

    /// Evaluate next-position predictions over an ordered frame sequence. The
    /// first two frames initialize velocity; every later frame is an unseen
    /// label for the prediction made immediately before it is observed.
    let evaluate (projection: Projection) (frames: GameEnvironment.Frame list) : Result<AccuracyReceipt, Feedback> =
        match frames with
        | first :: second :: rest when not (List.isEmpty rest) ->
            result {
                let! firstState = observe empty first
                let! initial = observe firstState second

                let folder
                    (acc: Result<State * int * int, Feedback>)
                    (actualFrame: GameEnvironment.Frame)
                    : Result<State * int * int, Feedback> =
                    result {
                        let! state, correct, total = acc
                        let! forecast = predict projection state
                        let! nextState = observe state actualFrame
                        let! actual = predict Projection.Observed nextState

                        return nextState, correct + (if forecast = actual then 1 else 0), total + 1
                    }

                let! finalState, correct, total =
                    rest |> List.fold folder (Ok(initial, 0, 0))

                return
                    { Correct = correct
                      Total = total
                      BasisPoints = int (int64 correct * 10_000L / int64 total)
                      State = receipt finalState }
            }
        | _ -> Error InsufficientEvaluationFrames
