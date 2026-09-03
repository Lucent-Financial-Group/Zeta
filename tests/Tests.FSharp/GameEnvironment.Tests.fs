module Zeta.Tests.GameEnvironmentTests

open Xunit
open Zeta.Core
open System.Text.Json

module GE = Zeta.Core.GameEnvironment

let private eastAgent (_: ControlScheme.Scheme) (_: GE.Info) = ControlScheme.Go "e"

let private chip8Rom =
    [| 0x60uy
       0x09uy // V0 = key 9 (east)
       0xE0uy
       0x9Euy // skip the loop when east is pressed
       0x12uy
       0x02uy
       0x61uy
       0x00uy // x = 0
       0x62uy
       0x00uy // y = 0
       0xF0uy
       0x29uy // I = font sprite for V0
       0xD1uy
       0x25uy // draw five rows
       0x12uy
       0x0Euy |]

type private RecordingArcPort(availableInputs: string list) =
    let mutable lastStep: (string * string * string * (int * int) option) option = None

    let envelope cell =
        let cells = Array.create (64 * 64) '0'
        cells.[0] <- cell

        JsonSerializer.Serialize
            {| availableActions = availableInputs
               framesHex = [| System.String cells |]
               gameId = "ztch-v1"
               guid = "arc-run-1"
               schemaVersion = 1
               state = "NOT_FINISHED" |}

    member _.LastStep = lastStep

    interface GE.IArcRestPort with
        member _.Reset gameId =
            if gameId = "ztch-v1" then Ok(envelope '0') else Error "unknown game"

        member _.Step(gameId, guid, actionName, point) =
            lastStep <- Some(gameId, guid, actionName, point)
            Ok(envelope '9')

[<Fact>]
let ``one agent function drives CHIP-8 and ARC through the same interface`` () =
    let chip8 = GE.Chip8Adapter(chip8Rom, 7UL, 8) :> GE.IEnvironment<Chip8Cow.Frame>
    let arcPort = RecordingArcPort([ "ACTION1"; "ACTION2"; "ACTION3"; "ACTION4" ])
    let arc = GE.ArcRestAdapter(arcPort, "ztch-v1") :> GE.IEnvironment<GE.ArcRestObservation>

    let chip8Result = GE.stepOnce eastAgent chip8
    let arcResult = GE.stepOnce eastAgent arc

    match chip8Result, arcResult with
    | Ok chip8Step, Ok arcStep ->
        Assert.Equal(ControlScheme.chip9Pad.ZetaId, chip8Step.Info.SchemeId)
        Assert.Equal(64, chip8Step.Frame.W)
        Assert.Equal(32, chip8Step.Frame.H)
        Assert.Contains(1uy, chip8Step.Frame.Cells)
        Assert.Equal(ControlScheme.arcAgi3.ZetaId, arcStep.Info.SchemeId)
        Assert.Equal(64, arcStep.Frame.W)
        Assert.Equal(64, arcStep.Frame.H)
        Assert.Equal(9uy, arcStep.Frame.Cells.[0])
        Assert.Equal(Some("ztch-v1", "arc-run-1", "ACTION4", None), arcPort.LastStep)
        arcStep.State.Cells.[0] <- 1uy
        Assert.Equal(9uy, arcStep.Frame.Cells.[0])
    | chip8Outcome, arcOutcome -> failwithf "cross-environment step failed: %A / %A" chip8Outcome arcOutcome

[<Fact>]
let ``CHIP-8 rejects coordinate actions through typed feedback`` () =
    let adapter = GE.Chip8Adapter(chip8Rom, 7UL, 8) :> GE.IEnvironment<Chip8Cow.Frame>

    let result =
        result {
            let! state = adapter.Reset()
            return! adapter.Step(state, ControlScheme.Point(1, 2))
        }

    Assert.Equal(Error(GE.UnsupportedAction "point:1:2"), result)

type private InvalidArcPort() =
    interface GE.IArcRestPort with
        member _.Reset _ =
            Ok
                (JsonSerializer.Serialize
                    {| availableActions = Array.empty<string>
                       framesHex = [| "0" |]
                       gameId = "ztch-v1"
                       guid = "arc-run-1"
                       schemaVersion = 1
                       state = "NOT_FINISHED" |})

        member _.Step(_, _, _, _) = Error "step must not be called"

[<Fact>]
let ``ARC schema drift is typed before an agent sees the frame`` () =
    let adapter =
        GE.ArcRestAdapter(InvalidArcPort(), "ztch-v1")
        :> GE.IEnvironment<GE.ArcRestObservation>

    Assert.Equal(Error(GE.InvalidFrame "ARC frame cell count must equal 4096"), adapter.Reset())

[<Fact>]
let ``ARC refuses an action the current frame did not offer`` () =
    let port = RecordingArcPort([ "ACTION1" ])
    let adapter = GE.ArcRestAdapter(port, "ztch-v1") :> GE.IEnvironment<GE.ArcRestObservation>

    let result =
        result {
            let! state = adapter.Reset()
            return! adapter.Step(state, ControlScheme.Go "e")
        }

    Assert.Equal(Error(GE.UnsupportedAction "ACTION4"), result)
    Assert.Equal(None, port.LastStep)

[<Fact>]
let ``invalid adapter configuration is feedback rather than an exception`` () =
    let chip8 = GE.Chip8Adapter(null, 7UL, 8) :> GE.IEnvironment<Chip8Cow.Frame>
    let arc = GE.ArcRestAdapter(null, "") :> GE.IEnvironment<GE.ArcRestObservation>

    Assert.Equal(Error(GE.InvalidConfiguration "ROM must not be null"), chip8.Reset())
    Assert.Equal(Error(GE.InvalidConfiguration "ARC REST port must not be null"), arc.Reset())
