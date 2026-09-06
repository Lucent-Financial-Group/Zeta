namespace Zeta.Core

open System
open System.Globalization
open System.IO
open System.Security.Cryptography
open System.Text
open System.Text.Json

/// A finite static adapter for one upstream MiniGrid Empty-5x5 witness.
///
/// This is a source/transition conformance boundary, not a MiniGrid runtime
/// binding or policy benchmark. It has no relation to contextual-grid policy
/// selection, reward aggregation, lexical data, or society-level objectives.
[<RequireQualifiedAccess>]
module MiniGridEmpty5x5Adapter =

    [<Literal>]
    let CarrierFingerprint = "49db9a4f6fd415ba4f15b613eba858511e6cf116ec7574cd5ee50cc7c2e46b07"

    [<Literal>]
    let CarrierRelativePath = "docs/research/data/2026-09-06-minigrid-empty-5x5-v310-adapter-carrier.json"

    [<Literal>]
    let AdapterVersion = "zeta.minigrid-empty-5x5-adapter/v1"

    type Position = { X: int; Y: int }

    type Action =
        | Left
        | Right
        | Forward

    type State =
        { Position: Position
          Direction: int
          StepCount: int
          Terminated: bool
          Truncated: bool }

    type Carrier =
        { EnvironmentId: string
          MaxSteps: int
          InitialPosition: Position
          InitialDirection: int
          GoalPosition: Position
          StateProjection: string
          ResetObservationDigest: string
          ResetSeeds: int list
          UpstreamCommit: string
          FixturePython: string
          FixtureMiniGrid: string
          FixtureGymnasium: string
          FixtureNumPy: string
          FixturePygameCe: string }

    type StepReceipt =
        { Action: string
          Direction: int
          Integer: int
          Position: Position
          RewardBinary64Bits: string
          RewardPpm: int
          Terminated: bool
          Truncated: bool }

    type Receipt =
        { CarrierFingerprint: string
          EnvironmentId: string
          FixturePython: string
          FixtureMiniGrid: string
          FixtureGymnasium: string
          FixtureNumPy: string
          FixturePygameCe: string
          ResetObservationDigest: string
          ResetSeeds: int list
          StateProjection: string
          Steps: StepReceipt list
          UpstreamCommit: string }

    let private expectedSourceFiles =
        Map.ofList
            [ "minigrid/envs/empty.py", "9daabf330a51023f5fe2a8884b9b6b26482ee489cbee68604712271e818e5ae6"
              "minigrid/minigrid_env.py", "23490887fbaadd8f4973b4375cd40a23b7636e7aedf59561f767315c36cd0371"
              "minigrid/core/actions.py", "787274f08bc91a76dba83b322ff5ee8fdb8ea7843cb706a1b5371029ac234e28"
              "minigrid/core/constants.py", "5e82c8765064461001b8a5e07b2c5f693ce65297418755a11d7917dacbd204ac" ]

    let private sha256Hex (bytes: byte array) =
        SHA256.HashData bytes |> Convert.ToHexString |> fun value -> value.ToLowerInvariant()

    let private readString (parent: JsonElement) (name: string) =
        let value = parent.GetProperty(name).GetString()
        if isNull value then failwithf "required string field is null: %s" name else value

    let private readPosition (value: JsonElement) name =
        let elements = value.EnumerateArray() |> Seq.toList
        match elements with
        | [ x; y ] -> { X = x.GetInt32(); Y = y.GetInt32() }
        | _ -> failwithf "required position must have exactly two integers: %s" name

    let private validate expected actual failure =
        if expected = actual then Ok() else Error failure

    /// Validates the semantic carrier shape independently of raw-byte admission.
    /// This entry point exists so semantic mutations are observable as such in tests.
    let validateCarrierDocument (document: JsonDocument) : Result<Carrier, string> =
        try
            let root = document.RootElement
            let upstream = root.GetProperty("upstream")
            let fixtureRuntime = root.GetProperty("fixtureRuntime")
            let environment = root.GetProperty("environment")
            let actions =
                root.GetProperty("actions").EnumerateArray()
                |> Seq.map (fun entry -> readString entry "name", entry.GetProperty("integer").GetInt32())
                |> Seq.toList
            let sourceFiles =
                upstream.GetProperty("sourceFiles").EnumerateArray()
                |> Seq.map (fun entry -> readString entry "path", readString entry "sha256")
                |> Map.ofSeq
            let resetSeeds =
                root.GetProperty("witness").GetProperty("seeds").EnumerateArray()
                |> Seq.map (fun value -> value.GetInt32())
                |> Seq.toList
            let expectedActions = [ "left", 0; "right", 1; "forward", 2 ]

            match validate AdapterVersion (readString root "schemaVersion") "INVALID_CARRIER_SCHEMA_VERSION" with
            | Error failure -> Error failure
            | Ok() ->
                match validate "90928729376741a41222a257911343b97103b548" (readString upstream "commit") "UPSTREAM_IDENTITY_MISMATCH" with
                | Error failure -> Error failure
                | Ok() ->
                    match validate expectedSourceFiles sourceFiles "UPSTREAM_IDENTITY_MISMATCH" with
                    | Error failure -> Error failure
                    | Ok() ->
                        match validate "static-world-pose/v1" (readString root "stateProjection") "INVALID_STATE_PROJECTION" with
                        | Error failure -> Error failure
                        | Ok() ->
                            match validate "MiniGrid-Empty-5x5-v0" (readString environment "id") "INVALID_ENVIRONMENT_ID" with
                            | Error failure -> Error failure
                            | Ok() ->
                                match validate expectedActions actions "INVALID_ACTION_MAPPING" with
                                | Error failure -> Error failure
                                | Ok() ->
                                    match validate [ 42; 43 ] resetSeeds "INVALID_RESET_SEEDS" with
                                    | Error failure -> Error failure
                                    | Ok() ->
                                        let registrySize = environment.GetProperty("registryKwargs").GetProperty("size").GetInt32()
                                        match validate 5 registrySize "INVALID_REGISTRY_KWARGS" with
                                        | Error failure -> Error failure
                                        | Ok() ->
                                            Ok
                                                { EnvironmentId = readString environment "id"
                                                  MaxSteps = environment.GetProperty("maxSteps").GetInt32()
                                                  InitialPosition = readPosition (environment.GetProperty("initialPosition")) "initialPosition"
                                                  InitialDirection = environment.GetProperty("initialDirection").GetInt32()
                                                  GoalPosition = readPosition (environment.GetProperty("goalPosition")) "goalPosition"
                                                  StateProjection = readString root "stateProjection"
                                                  ResetObservationDigest = readString root "resetObservationDigest"
                                                  ResetSeeds = resetSeeds
                                                  UpstreamCommit = readString upstream "commit"
                                                  FixturePython = readString fixtureRuntime "python"
                                                  FixtureMiniGrid = readString fixtureRuntime "minigrid"
                                                  FixtureGymnasium = readString fixtureRuntime "gymnasium"
                                                  FixtureNumPy = readString fixtureRuntime "numpy"
                                                  FixturePygameCe = readString fixtureRuntime "pygameCe" }
        with error -> Error(sprintf "INVALID_CARRIER_SCHEMA: %s" error.Message)

    /// Loads the carrier only when its raw UTF-8 bytes match the declared SHA-256.
    let loadVerifiedCarrier (repositoryRoot: string) : Result<Carrier, string> =
        let path = Path.Combine(repositoryRoot, CarrierRelativePath.Replace('/', Path.DirectorySeparatorChar))
        if not (File.Exists path) then
            Error "UPSTREAM_IDENTITY_MISMATCH: carrier is missing"
        else
            let bytes = File.ReadAllBytes path
            let actual = sha256Hex bytes
            if actual <> CarrierFingerprint then
                Error(sprintf "UPSTREAM_IDENTITY_MISMATCH: carrier SHA-256 is %s" actual)
            else
                try
                    use document = JsonDocument.Parse bytes
                    validateCarrierDocument document
                with error -> Error(sprintf "INVALID_CARRIER_SCHEMA: %s" error.Message)

    let actionName action =
        match action with
        | Left -> "left"
        | Right -> "right"
        | Forward -> "forward"

    let actionInteger action =
        match action with
        | Left -> 0
        | Right -> 1
        | Forward -> 2

    let private rewardBits value =
        BitConverter.DoubleToInt64Bits value
        |> uint64
        |> fun bits -> bits.ToString("x16", CultureInfo.InvariantCulture)

    let initialState (carrier: Carrier) : State =
        { Position = carrier.InitialPosition
          Direction = carrier.InitialDirection
          StepCount = 0
          Terminated = false
          Truncated = false }

    let private directionDelta (direction: int) =
        match direction with
        | 0 -> 1, 0
        | 1 -> 0, 1
        | 2 -> -1, 0
        | 3 -> 0, -1
        | _ -> invalidArg "direction" "MiniGrid heading must be in the finite range 0..3"

    let private canOccupy (position: Position) =
        position.X >= 1 && position.X <= 3 && position.Y >= 1 && position.Y <= 3

    /// Executes one static adapter action with the upstream-documented order:
    /// increment step count, execute action, then evaluate truncation.
    let step (carrier: Carrier) (state: State) (action: Action) : State * StepReceipt =
        if state.Terminated || state.Truncated then
            invalidArg "state" "cannot step a terminated or truncated adapter state"

        let nextStepCount = state.StepCount + 1
        let nextDirection, nextPosition =
            match action with
            | Left -> (state.Direction + 3) % 4, state.Position
            | Right -> (state.Direction + 1) % 4, state.Position
            | Forward ->
                let dx, dy = directionDelta state.Direction
                let candidate = { X = state.Position.X + dx; Y = state.Position.Y + dy }
                state.Direction, if canOccupy candidate then candidate else state.Position

        let terminated = nextPosition = carrier.GoalPosition
        let truncated = nextStepCount >= carrier.MaxSteps
        let reward =
            if terminated then
                1.0 - 0.9 * (float nextStepCount / float carrier.MaxSteps)
            else
                0.0
        let next: State =
            { Position = nextPosition
              Direction = nextDirection
              StepCount = nextStepCount
              Terminated = terminated
              Truncated = truncated }
        let receipt: StepReceipt =
            { Action = actionName action
              Direction = nextDirection
              Integer = actionInteger action
              Position = nextPosition
              RewardBinary64Bits = rewardBits reward
              RewardPpm = int (Math.Round(1_000_000.0 * reward, MidpointRounding.ToEven))
              Terminated = terminated
              Truncated = truncated }
        next, receipt

    let private witnessActions = [ Forward; Forward; Right; Forward; Forward ]

    let private runTrace (carrier: Carrier) =
        let mutable state = initialState carrier
        witnessActions
        |> List.map (fun action ->
            let next, receipt = step carrier state action
            state <- next
            receipt)

    /// Emits one trace only after the two declared fixed-start reset labels produce
    /// the same independently simulated static adapter trace.
    let runWitness (carrier: Carrier) : Receipt =
        let traces = carrier.ResetSeeds |> List.map (fun _ -> runTrace carrier)
        match traces with
        | first :: rest when rest |> List.forall ((=) first) ->
            { CarrierFingerprint = CarrierFingerprint
              EnvironmentId = carrier.EnvironmentId
              FixturePython = carrier.FixturePython
              FixtureMiniGrid = carrier.FixtureMiniGrid
              FixtureGymnasium = carrier.FixtureGymnasium
              FixtureNumPy = carrier.FixtureNumPy
              FixturePygameCe = carrier.FixturePygameCe
              ResetObservationDigest = carrier.ResetObservationDigest
              ResetSeeds = carrier.ResetSeeds
              StateProjection = carrier.StateProjection
              Steps = first
              UpstreamCommit = carrier.UpstreamCommit }
        | _ -> failwith "STATIC_RESET_DIVERGENCE"

    let private jsonString (value: string) = JsonSerializer.Serialize value

    let private renderStep (stepReceipt: StepReceipt) =
        String.concat ""
            [ "{\"action\":"
              jsonString stepReceipt.Action
              ",\"direction\":"
              string stepReceipt.Direction
              ",\"integer\":"
              string stepReceipt.Integer
              ",\"position\":["
              string stepReceipt.Position.X
              ","
              string stepReceipt.Position.Y
              "],\"rewardBinary64Bits\":"
              jsonString stepReceipt.RewardBinary64Bits
              ",\"rewardPpm\":"
              string stepReceipt.RewardPpm
              ",\"terminated\":"
              if stepReceipt.Terminated then "true" else "false"
              ",\"truncated\":"
              if stepReceipt.Truncated then "true" else "false"
              "}" ]

    /// Canonically renders the finite receipt. The field order is part of the
    /// cross-language conformance surface rather than an incidental serializer choice.
    let render (receipt: Receipt) =
        let resetSeeds = receipt.ResetSeeds |> List.map string |> String.concat ","
        let steps = receipt.Steps |> List.map renderStep |> String.concat ","
        String.concat ""
            [ "{\"adapterVersion\":"
              jsonString AdapterVersion
              ",\"carrierFingerprint\":"
              jsonString receipt.CarrierFingerprint
              ",\"environmentId\":"
              jsonString receipt.EnvironmentId
              ",\"fixtureRuntime\":{\"gymnasium\":"
              jsonString receipt.FixtureGymnasium
              ",\"minigrid\":"
              jsonString receipt.FixtureMiniGrid
              ",\"numpy\":"
              jsonString receipt.FixtureNumPy
              ",\"pygameCe\":"
              jsonString receipt.FixturePygameCe
              ",\"python\":"
              jsonString receipt.FixturePython
              "},\"resetObservationDigest\":"
              jsonString receipt.ResetObservationDigest
              ",\"resetSeeds\":["
              resetSeeds
              "],\"stateProjection\":"
              jsonString receipt.StateProjection
              ",\"steps\":["
              steps
              "],\"upstreamCommit\":"
              jsonString receipt.UpstreamCommit
              "}" ]

    let private validateReceiptSchema (bytes: byte array) =
        try
            use document = JsonDocument.Parse bytes
            let root = document.RootElement
            root.GetProperty("adapterVersion").GetString() |> ignore
            root.GetProperty("carrierFingerprint").GetString() |> ignore
            root.GetProperty("environmentId").GetString() |> ignore
            root.GetProperty("fixtureRuntime").GetProperty("python").GetString() |> ignore
            root.GetProperty("resetObservationDigest").GetString() |> ignore
            root.GetProperty("resetSeeds").EnumerateArray() |> Seq.iter (fun value -> value.GetInt32() |> ignore)
            root.GetProperty("stateProjection").GetString() |> ignore
            root.GetProperty("upstreamCommit").GetString() |> ignore
            root.GetProperty("steps").EnumerateArray()
            |> Seq.iter (fun stepValue ->
                stepValue.GetProperty("action").GetString() |> ignore
                stepValue.GetProperty("direction").GetInt32() |> ignore
                stepValue.GetProperty("integer").GetInt32() |> ignore
                stepValue.GetProperty("position").EnumerateArray() |> Seq.iter (fun value -> value.GetInt32() |> ignore)
                stepValue.GetProperty("rewardBinary64Bits").GetString() |> ignore
                stepValue.GetProperty("rewardPpm").GetInt32() |> ignore
                stepValue.GetProperty("terminated").GetBoolean() |> ignore
                stepValue.GetProperty("truncated").GetBoolean() |> ignore)
            Ok()
        with error -> Error(sprintf "INVALID_RECEIPT_SCHEMA: %s" error.Message)

    /// Refuses malformed, noncanonical, or carrier-mismatched receipts.
    let verifyCanonicalReceipt repositoryRoot (bytes: byte array) : Result<unit, string> =
        match loadVerifiedCarrier repositoryRoot with
        | Error failure -> Error failure
        | Ok carrier ->
            match validateReceiptSchema bytes with
            | Error failure -> Error failure
            | Ok() ->
                let expected = runWitness carrier |> render |> Encoding.UTF8.GetBytes
                if CryptographicOperations.FixedTimeEquals(expected, bytes) then Ok() else Error "NONCANONICAL_RECEIPT"
