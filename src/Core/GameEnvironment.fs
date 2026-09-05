namespace Zeta.Core

open System
open System.Text.Json

/// Cross-emulator execution contract. This is intentionally separate from
/// `ISimulationEnvironment`, which supplies deterministic time and entropy.
[<RequireQualifiedAccess>]
module GameEnvironment =

    /// A row-major, palette-indexed observation frame.
    [<Struct>]
    type Frame =
        { W: int
          H: int
          Palette: int
          Cells: byte[] }

    /// Environment metadata that does not belong in the pixel frame.
    [<Struct>]
    type Info =
        { SchemeId: string
          AvailableInputs: string list
          EpisodeId: string option
          Status: string
          Detail: string option }

    /// Typed failures at the cross-emulator boundary.
    type Feedback =
        | InvalidConfiguration of string
        | UnsupportedAction of string
        | InvalidFrame of string
        | InvalidInfo of string
        | AdapterFailure of string

    /// Pure transition port for an interactive environment.
    ///
    /// The state is explicit so implementations can remain deterministic and
    /// replayable. Network, process, and toolkit effects stay behind adapters.
    type IEnvironment<'State> =
        abstract Scheme: ControlScheme.Scheme
        abstract Reset: unit -> Result<'State, Feedback>
        abstract Step: state: 'State * action: ControlScheme.Action -> Result<'State, Feedback>
        abstract Frame: state: 'State -> Result<Frame, Feedback>
        abstract Info: state: 'State -> Info

    /// The result of one environment-independent agent decision.
    [<Struct>]
    type StepResult<'State> =
        { State: 'State
          Action: ControlScheme.Action
          Frame: Frame
          Info: Info }

    let private validateFrame (frame: Frame) : Result<Frame, Feedback> =
        let expected = int64 frame.W * int64 frame.H

        if frame.W <= 0 || frame.H <= 0 then
            Error(InvalidFrame "frame dimensions must be positive")
        elif frame.Palette <= 0 || frame.Palette > 256 then
            Error(InvalidFrame "palette size must be in 1..256")
        elif isNull frame.Cells then
            Error(InvalidFrame "frame cells must not be null")
        elif expected > int64 Int32.MaxValue || int64 frame.Cells.Length <> expected then
            Error(InvalidFrame "frame cell count must equal width times height")
        elif frame.Cells |> Array.exists (fun cell -> int cell >= frame.Palette) then
            Error(InvalidFrame "frame cell exceeds the declared palette")
        else
            Ok frame

    let private chip8Key (action: ControlScheme.Action) : Result<int option, Feedback> =
        match action with
        | ControlScheme.Pad key when key >= 0 && key <= 0xF -> Ok(Some key)
        | ControlScheme.Go "n" -> Ok(Some 0x5)
        | ControlScheme.Go "s" -> Ok(Some 0x8)
        | ControlScheme.Go "w" -> Ok(Some 0x7)
        | ControlScheme.Go "e" -> Ok(Some 0x9)
        | ControlScheme.Go "stay" -> Ok None
        | other -> Error(UnsupportedAction(ControlScheme.payload other))

    let private chip8Frame (state: Chip8Cow.Frame) : Frame =
        let cells =
            Array.init (Chip8.DisplayW * Chip8.DisplayH) (fun index ->
                let x = index % Chip8.DisplayW
                let y = index / Chip8.DisplayW
                if Chip8Cow.pixel x y state then 1uy else 0uy)

        { W = Chip8.DisplayW
          H = Chip8.DisplayH
          Palette = 2
          Cells = cells }

    /// In-process CHIP-8 adapter over the immutable `Chip8Cow` transition.
    type Chip8Adapter(rom: byte[], seed: uint64, cyclesPerAction: int) =
        let copiedRom = if isNull rom then None else Some(Array.copy rom)

        interface IEnvironment<Chip8Cow.Frame> with
            member _.Scheme = ControlScheme.chip9Pad

            member _.Reset() =
                match copiedRom with
                | None -> Error(InvalidConfiguration "ROM must not be null")
                | Some bytes when cyclesPerAction <= 0 ->
                    Error(InvalidConfiguration "cycles per action must be positive")
                | Some bytes -> Chip8Cow.create seed |> Chip8Cow.loadRom bytes |> Ok

            member _.Step(state, action) =
                if cyclesPerAction <= 0 then
                    Error(InvalidConfiguration "cycles per action must be positive")
                else
                    chip8Key action
                    |> Result.map (fun key ->
                        let keys = Array.zeroCreate<bool> 16
                        key |> Option.iter (fun index -> keys.[index] <- true)
                        Chip8Cow.frameStep cyclesPerAction { state with Keys = keys })

            member _.Frame(state) = state |> chip8Frame |> validateFrame

            member _.Info(state) =
                { SchemeId = ControlScheme.chip9Pad.ZetaId
                  AvailableInputs = ControlScheme.chip9Pad.Map |> Map.toList |> List.map fst
                  EpisodeId = None
                  Status = if state.Fault.IsSome then "faulted" else "running"
                  Detail = state.Fault }

    /// Source-owned observation returned by an ARC REST client port.
    [<Struct>]
    type ArcRestObservation =
        { Guid: string
          Width: int
          Height: int
          Palette: int
          Cells: byte[]
          AvailableInputs: string list
          Status: string }

    /// Hexagonal port to the source-owned ARC REST client from rung B. Successful
    /// calls return its canonical `ArcEnvelope.to_json()` text.
    type IArcRestPort =
        abstract Reset: gameId: string -> Result<string, string>

        abstract Step:
            gameId: string * guid: string * actionName: string * point: (int * int) option ->
                Result<string, string>

    let private arcCommand (action: ControlScheme.Action) : Result<string * (int * int) option, Feedback> =
        match action with
        | ControlScheme.Go "n" -> Ok("ACTION1", None)
        | ControlScheme.Go "s" -> Ok("ACTION2", None)
        | ControlScheme.Go "w" -> Ok("ACTION3", None)
        | ControlScheme.Go "e" -> Ok("ACTION4", None)
        | ControlScheme.Select -> Ok("ACTION5", None)
        | ControlScheme.Point(x, y) when x >= 0 && x < 64 && y >= 0 && y < 64 ->
            Ok("ACTION6", Some(x, y))
        | ControlScheme.Back -> Ok("ACTION7", None)
        | other -> Error(UnsupportedAction(ControlScheme.payload other))

    let private frameOfArc (observation: ArcRestObservation) : Result<Frame, Feedback> =
        { W = observation.Width
          H = observation.Height
          Palette = observation.Palette
          Cells = if isNull observation.Cells then null else Array.copy observation.Cells }
        |> validateFrame

    let private tryProperty (name: string) (element: JsonElement) : JsonElement option =
        let mutable value = Unchecked.defaultof<JsonElement>
        if element.TryGetProperty(name, &value) then Some value else None

    let private tryStringProperty (name: string) (element: JsonElement) : string option =
        tryProperty name element
        |> Option.bind (fun value ->
            if value.ValueKind = JsonValueKind.String then
                value.GetString() |> Option.ofObj
            else
                None)

    let private tryIntProperty (name: string) (element: JsonElement) : int option =
        tryProperty name element
        |> Option.bind (fun value ->
            let mutable parsed = 0
            if value.ValueKind = JsonValueKind.Number && value.TryGetInt32(&parsed) then Some parsed else None)

    let private tryHexCell (value: char) : byte option =
        if value >= '0' && value <= '9' then
            Some(byte (int value - int '0'))
        elif value >= 'a' && value <= 'f' then
            Some(byte (10 + int value - int 'a'))
        else
            None

    let private requireSome feedback value =
        match value with
        | Some found -> Ok found
        | None -> Error feedback

    let private decodeArcEnvelope (expectedGameId: string) (text: string) : Result<ArcRestObservation, Feedback> =
        try
            use document = JsonDocument.Parse text
            let root = document.RootElement

            result {
                if root.ValueKind <> JsonValueKind.Object then
                    return! Error(InvalidInfo "ARC envelope root must be an object")

                match tryIntProperty "schemaVersion" root with
                | Some 1 -> ()
                | _ -> return! Error(InvalidInfo "ARC envelope schemaVersion must be 1")

                match tryStringProperty "gameId" root with
                | Some gameId when String.Equals(gameId, expectedGameId, StringComparison.Ordinal) -> ()
                | _ -> return! Error(InvalidInfo "ARC envelope gameId must match the requested game")

                let! guid =
                    tryStringProperty "guid" root
                    |> Option.filter (String.IsNullOrWhiteSpace >> not)
                    |> requireSome (InvalidInfo "ARC envelope guid must be non-empty")

                let! status =
                    tryStringProperty "state" root
                    |> Option.filter (String.IsNullOrWhiteSpace >> not)
                    |> requireSome (InvalidInfo "ARC envelope state must be non-empty")

                if
                    [ "NOT_PLAYED"; "NOT_FINISHED"; "WIN"; "GAME_OVER" ]
                    |> List.contains status
                    |> not
                then
                    return! Error(InvalidInfo "ARC envelope state is not recognized")

                let! available =
                    match tryProperty "availableActions" root with
                    | Some value when value.ValueKind = JsonValueKind.Array ->
                        value.EnumerateArray()
                        |> Seq.map (fun item ->
                            if item.ValueKind = JsonValueKind.String then item.GetString() |> Option.ofObj else None)
                        |> Seq.toList
                        |> fun values ->
                            if values |> List.forall Option.isSome then
                                values |> List.choose id |> Ok
                            else
                                Error(InvalidInfo "ARC availableActions entries must be strings")
                    | _ -> Error(InvalidInfo "ARC availableActions must be an array")

                let! encodedFrame =
                    match tryProperty "framesHex" root with
                    | Some value when value.ValueKind = JsonValueKind.Array ->
                        value.EnumerateArray()
                        |> Seq.map (fun item ->
                            if item.ValueKind = JsonValueKind.String then item.GetString() |> Option.ofObj else None)
                        |> Seq.toList
                        |> function
                            | [] -> Error(InvalidFrame "ARC framesHex must contain at least one frame")
                            | values when values |> List.forall Option.isSome -> values |> List.choose id |> List.last |> Ok
                            | _ -> Error(InvalidFrame "ARC framesHex entries must be strings")
                    | _ -> Error(InvalidFrame "ARC framesHex must be an array")

                if encodedFrame.Length <> 64 * 64 then
                    return! Error(InvalidFrame "ARC frame cell count must equal 4096")

                let decoded = encodedFrame |> Seq.map tryHexCell |> Seq.toArray

                if decoded |> Array.exists Option.isNone then
                    return! Error(InvalidFrame "ARC frame cells must be lowercase hexadecimal")

                return
                    { Guid = guid
                      Width = 64
                      Height = 64
                      Palette = 16
                      Cells = decoded |> Array.choose id
                      AvailableInputs = available
                      Status = status }
            }
        with
        | :? JsonException -> Error(InvalidInfo "ARC envelope must be valid JSON")
        | :? ArgumentException -> Error(InvalidInfo "ARC envelope must be valid JSON")

    /// ARC adapter that maps canonical actions onto the rung-B REST contract.
    type ArcRestAdapter(port: IArcRestPort, gameId: string) =
        let validateConfiguration () =
            if isNull (box port) then
                Error(InvalidConfiguration "ARC REST port must not be null")
            elif String.IsNullOrWhiteSpace gameId then
                Error(InvalidConfiguration "ARC game id must be non-empty")
            else
                Ok()

        let validateObservation observation =
            result {
                if String.IsNullOrWhiteSpace observation.Guid then
                    return! Error(InvalidInfo "ARC episode id must be non-empty")

                if String.IsNullOrWhiteSpace observation.Status then
                    return! Error(InvalidInfo "ARC status must be non-empty")

                let hasInvalidInput =
                    observation.AvailableInputs
                    |> List.exists (fun input ->
                        input <> "ACTION6"
                        && (ControlScheme.translate ControlScheme.arcAgi3 input |> Option.isNone))

                if hasInvalidInput || observation.AvailableInputs |> List.distinct |> List.length <> observation.AvailableInputs.Length then
                    return! Error(InvalidInfo "ARC available inputs must be known and unique")

                let! frame = frameOfArc observation
                return { observation with Cells = frame.Cells }
            }

        interface IEnvironment<ArcRestObservation> with
            member _.Scheme = ControlScheme.arcAgi3

            member _.Reset() =
                result {
                    do! validateConfiguration ()

                    let! envelope = port.Reset gameId |> Result.mapError AdapterFailure
                    let! observation = decodeArcEnvelope gameId envelope

                    return! validateObservation observation
                }

            member _.Step(state, action) =
                result {
                    do! validateConfiguration ()
                    let! current = validateObservation state

                    let! actionName, point = arcCommand action

                    if current.AvailableInputs |> List.contains actionName |> not then
                        return! Error(UnsupportedAction actionName)

                    let! envelope =
                        port.Step(gameId, current.Guid, actionName, point)
                        |> Result.mapError AdapterFailure

                    let! observation = decodeArcEnvelope gameId envelope

                    return! validateObservation observation
                }

            member _.Frame(state) = frameOfArc state

            member _.Info(state) =
                { SchemeId = ControlScheme.arcAgi3.ZetaId
                  AvailableInputs = state.AvailableInputs
                  EpisodeId = Some state.Guid
                  Status = state.Status
                  Detail = None }

    /// Run one choice through any environment. This is the rung-C falsifier:
    /// callers do not branch on CHIP-8 versus ARC.
    let stepOnce
        (choose: ControlScheme.Scheme -> Info -> ControlScheme.Action)
        (environment: IEnvironment<'State>)
        : Result<StepResult<'State>, Feedback> =
        result {
            let! initial = environment.Reset()
            let action = choose environment.Scheme (environment.Info initial)
            let! next = environment.Step(initial, action)
            let! frame = environment.Frame next

            return
                { State = next
                  Action = action
                  Frame = frame
                  Info = environment.Info next }
        }
