module MiniGridEmpty5x5AdapterTests

open System
open System.IO
open System.Text
open System.Text.Json
open global.Xunit
open Zeta.Core

let private repoRoot () =
    let mutable directory = DirectoryInfo(Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location))
    while not (isNull directory) && not (File.Exists(Path.Join(directory.FullName, "Zeta.sln"))) do
        directory <- directory.Parent
    if isNull directory then failwith "Could not locate repo root (Zeta.sln)." else directory.FullName

let private adapterReceiptPath language =
    Path.Join(repoRoot (), "docs", "research", "data", $"2026-09-06-minigrid-empty-5x5-v310-adapter-{language}.json")

let private loadCarrier () =
    match MiniGridEmpty5x5Adapter.loadVerifiedCarrier (repoRoot ()) with
    | Ok carrier -> carrier
    | Error failure -> failwith failure

[<Fact>]
let ``MiniGrid carrier admits the exact byte-pinned upstream and static-projection boundary`` () =
    let carrier = loadCarrier ()
    Assert.Equal("MiniGrid-Empty-5x5-v0", carrier.EnvironmentId)
    Assert.Equal(100, carrier.MaxSteps)
    Assert.Equal(1, carrier.InitialPosition.X)
    Assert.Equal(1, carrier.InitialPosition.Y)
    Assert.Equal(0, carrier.InitialDirection)
    Assert.Equal(3, carrier.GoalPosition.X)
    Assert.Equal(3, carrier.GoalPosition.Y)
    Assert.Equal("static-world-pose/v1", carrier.StateProjection)
    Assert.Equal<int>([ 42; 43 ] :> seq<int>, carrier.ResetSeeds :> seq<int>)

[<Fact>]
let ``MiniGrid action integer and reward-step ordering retain the upstream five-action witness`` () =
    let carrier = loadCarrier ()
    let receipt = MiniGridEmpty5x5Adapter.runWitness carrier
    Assert.Equal(5, receipt.Steps.Length)
    let terminal = receipt.Steps |> List.last
    Assert.Equal("right", receipt.Steps.[2].Action)
    Assert.Equal(1, receipt.Steps.[2].Integer)
    Assert.Equal(1, receipt.Steps.[2].Direction)
    Assert.Equal("forward", terminal.Action)
    Assert.Equal(2, terminal.Integer)
    Assert.Equal(3, terminal.Position.X)
    Assert.Equal(3, terminal.Position.Y)
    Assert.Equal("3fee8f5c28f5c28f", terminal.RewardBinary64Bits)
    Assert.Equal(955_000, terminal.RewardPpm)
    Assert.True(terminal.Terminated)
    Assert.False(terminal.Truncated)

[<Fact>]
let ``pre-increment reward mutation cannot satisfy the pinned terminal reward bits`` () =
    let carrier = loadCarrier ()
    let terminal = MiniGridEmpty5x5Adapter.runWitness carrier |> fun receipt -> receipt.Steps |> List.last
    let wrongPreIncrementReward = 1.0 - 0.9 * (4.0 / float carrier.MaxSteps)
    let wrongPreIncrementBits =
        BitConverter.DoubleToInt64Bits wrongPreIncrementReward
        |> uint64
        |> fun bits -> bits.ToString("x16")
    Assert.Equal("3fee8f5c28f5c28f", terminal.RewardBinary64Bits)
    Assert.True(wrongPreIncrementBits <> terminal.RewardBinary64Bits)

[<Fact>]
let ``raw-byte carrier mutation refuses before adapter simulation`` () =
    let root = repoRoot ()
    let temporaryRoot = Path.Combine(Path.GetTempPath(), "zeta-minigrid-carrier-" + Guid.NewGuid().ToString("N"))
    let relativePath = MiniGridEmpty5x5Adapter.CarrierRelativePath.Replace('/', Path.DirectorySeparatorChar)
    let target = Path.Combine(temporaryRoot, relativePath)
    try
        Directory.CreateDirectory(Path.GetDirectoryName(target)) |> ignore
        File.Copy(Path.Combine(root, relativePath), target)
        File.AppendAllText(target, " ")
        match MiniGridEmpty5x5Adapter.loadVerifiedCarrier temporaryRoot with
        | Error failure -> Assert.StartsWith("UPSTREAM_IDENTITY_MISMATCH", failure)
        | Ok _ -> failwith "expected raw-byte carrier mismatch to refuse"
    finally
        if Directory.Exists temporaryRoot then Directory.Delete(temporaryRoot, true)

[<Fact>]
let ``wrong action mapping and undeclared image projection are semantic carrier refusals`` () =
    let root = repoRoot ()
    let carrierPath = Path.Combine(root, MiniGridEmpty5x5Adapter.CarrierRelativePath.Replace('/', Path.DirectorySeparatorChar))
    let source = File.ReadAllText carrierPath
    let wrongAction = source.Replace("\"name\": \"right\", \"integer\": 1", "\"name\": \"right\", \"integer\": 0")
    let imageProjection = source.Replace("\"stateProjection\": \"static-world-pose/v1\"", "\"stateProjection\": \"upstream-image/v1\"")
    use wrongActionDocument = JsonDocument.Parse wrongAction
    use imageProjectionDocument = JsonDocument.Parse imageProjection
    match MiniGridEmpty5x5Adapter.validateCarrierDocument wrongActionDocument with
    | Error failure -> Assert.Equal("INVALID_ACTION_MAPPING", failure)
    | Ok _ -> failwith "expected changed action integer to refuse"
    match MiniGridEmpty5x5Adapter.validateCarrierDocument imageProjectionDocument with
    | Error failure -> Assert.Equal("INVALID_STATE_PROJECTION", failure)
    | Ok _ -> failwith "expected changed state projection to refuse"

[<Fact>]
let ``independent upstream fixture and static Fsharp adapter receipts are byte-identical and replayable`` () =
    let fsharpBytes = File.ReadAllBytes(adapterReceiptPath "fsharp")
    let pythonBytes = File.ReadAllBytes(adapterReceiptPath "python")
    Assert.Equal<byte>(fsharpBytes :> seq<byte>, pythonBytes :> seq<byte>)
    match MiniGridEmpty5x5Adapter.verifyCanonicalReceipt (repoRoot ()) fsharpBytes with
    | Ok() -> ()
    | Error failure -> failwith failure

[<Fact>]
let ``missing terminated or truncated fields refuse a valid-JSON MiniGrid receipt`` () =
    let canonical = File.ReadAllText(adapterReceiptPath "fsharp")
    let missingTerminated = canonical.Replace(",\"terminated\":false", "")
    let missingTruncated = canonical.Replace(",\"truncated\":false", "")
    Assert.True(JsonDocument.Parse(missingTerminated).RootElement.ValueKind = JsonValueKind.Object)
    Assert.True(JsonDocument.Parse(missingTruncated).RootElement.ValueKind = JsonValueKind.Object)
    for invalidReceipt in [ missingTerminated; missingTruncated ] do
        match MiniGridEmpty5x5Adapter.verifyCanonicalReceipt (repoRoot ()) (Encoding.UTF8.GetBytes invalidReceipt) with
        | Error failure -> Assert.StartsWith("INVALID_RECEIPT_SCHEMA", failure)
        | Ok() -> failwith "expected omitted terminal status to refuse"

[<Fact>]
let ``altered valid-JSON reward diagnostic refuses canonical receipt replay`` () =
    let canonical = File.ReadAllText(adapterReceiptPath "fsharp")
    let altered = canonical.Replace("\"rewardPpm\":955000", "\"rewardPpm\":955001")
    Assert.True(JsonDocument.Parse(altered).RootElement.ValueKind = JsonValueKind.Object)
    match MiniGridEmpty5x5Adapter.verifyCanonicalReceipt (repoRoot ()) (Encoding.UTF8.GetBytes altered) with
    | Error "NONCANONICAL_RECEIPT" -> ()
    | other -> failwithf "expected altered receipt to be noncanonical, got %A" other

[<Fact>]
let ``Fsharp adapter does not bridge to the upstream Python fixture at runtime`` () =
    let source = File.ReadAllText(Path.Combine(repoRoot (), "src", "Core", "MiniGridEmpty5x5Adapter.fs"))
    Assert.DoesNotContain("Process.Start", source, StringComparison.Ordinal)
    Assert.DoesNotContain("ProcessStartInfo", source, StringComparison.Ordinal)
    Assert.DoesNotContain("python3", source, StringComparison.OrdinalIgnoreCase)
