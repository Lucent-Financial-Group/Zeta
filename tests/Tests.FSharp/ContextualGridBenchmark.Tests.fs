module Zeta.Tests.ContextualGridBenchmarkTests

open System
open System.Diagnostics
open System.IO
open System.Text.Json
open global.Xunit
open Zeta.Core

let private repoRoot () =
    let mutable dir = DirectoryInfo(Path.GetDirectoryName(System.Reflection.Assembly.GetExecutingAssembly().Location))
    while not (isNull dir) && not (File.Exists(Path.Join(dir.FullName, "Zeta.sln"))) do
        dir <- dir.Parent
    if isNull dir then failwith "Could not locate repo root (Zeta.sln)." else dir.FullName

let private runKnown policy seed episodes actionCap =
    ContextualGridBenchmark.run
        ContextualGridBenchmark.EnvironmentFingerprint
        ContextualGridBenchmark.EvaluatorCatalogueFingerprint
        policy
        seed
        episodes
        actionCap

let private pythonReceipt policy seed episodes actionCap =
    let root = repoRoot ()
    let policyName =
        match policy with
        | ContextualGridBenchmark.UniformRandom -> "uniform-random/v1"
        | ContextualGridBenchmark.QEpsilon -> "q-epsilon/v1"
        | ContextualGridBenchmark.QUcb -> "q-ucb/v1"
        | ContextualGridBenchmark.CountFirst -> "count-first/v1"
    let script = Path.Join(root, "src", "Core.Python", "src", "zeta", "contextual_grid_oracle.py")
    let psi = ProcessStartInfo("python3")
    psi.WorkingDirectory <- root
    psi.UseShellExecute <- false
    psi.RedirectStandardOutput <- true
    psi.RedirectStandardError <- true
    psi.ArgumentList.Add(script)
    psi.ArgumentList.Add("--policy")
    psi.ArgumentList.Add(policyName)
    psi.ArgumentList.Add("--seed")
    psi.ArgumentList.Add(string seed)
    psi.ArgumentList.Add("--episodes")
    psi.ArgumentList.Add(string episodes)
    psi.ArgumentList.Add("--action-cap")
    psi.ArgumentList.Add(string actionCap)
    use child = Process.Start psi
    let output = child.StandardOutput.ReadToEnd()
    let error = child.StandardError.ReadToEnd()
    child.WaitForExit()
    Assert.True(child.ExitCode = 0, sprintf "python oracle failed: %s" error)
    JsonDocument.Parse output

let private policyFromName name =
    match name with
    | "uniform-random/v1" -> ContextualGridBenchmark.UniformRandom
    | "q-epsilon/v1" -> ContextualGridBenchmark.QEpsilon
    | "q-ucb/v1" -> ContextualGridBenchmark.QUcb
    | "count-first/v1" -> ContextualGridBenchmark.CountFirst
    | unknown -> failwithf "undeclared policy in preflight receipt: %s" unknown

[<Fact>]
let ``carrier hashes pin exact raw manifest and evaluator catalogue bytes`` () =
    match ContextualGridBenchmark.verifyRepositoryCarriers (repoRoot ()) with
    | Ok() -> ()
    | Error failure -> failwith failure

[<Fact>]
let ``whitespace-mutated environment carrier is refused even when its JSON meaning could be equivalent`` () =
    let root = repoRoot ()
    let temporaryRoot = Path.Combine(Path.GetTempPath(), "zeta-contextual-grid-" + Guid.NewGuid().ToString("N"))
    let dataDirectory = Path.Combine(temporaryRoot, "docs", "research", "data")
    Directory.CreateDirectory(dataDirectory) |> ignore
    let environmentRelative = ContextualGridBenchmark.EnvironmentManifestRelativePath.Replace('/', Path.DirectorySeparatorChar)
    let catalogueRelative = ContextualGridBenchmark.EvaluatorCatalogueRelativePath.Replace('/', Path.DirectorySeparatorChar)
    let environmentTarget = Path.Combine(temporaryRoot, environmentRelative)
    let catalogueTarget = Path.Combine(temporaryRoot, catalogueRelative)
    Directory.CreateDirectory(Path.GetDirectoryName(environmentTarget)) |> ignore
    try
        File.Copy(Path.Combine(root, environmentRelative), environmentTarget)
        File.Copy(Path.Combine(root, catalogueRelative), catalogueTarget)
        File.AppendAllText(environmentTarget, " ")
        match ContextualGridBenchmark.verifyRepositoryCarriers temporaryRoot with
        | Error failure -> Assert.Contains("carrier hash mismatch", failure)
        | Ok() -> failwith "expected exact-byte carrier mutation to be refused"
    finally
        if Directory.Exists temporaryRoot then Directory.Delete(temporaryRoot, true)

[<Fact>]
let ``unknown environment fingerprint refuses before any simulation`` () =
    match
        ContextualGridBenchmark.run
            "not-the-frozen-environment"
            ContextualGridBenchmark.EvaluatorCatalogueFingerprint
            ContextualGridBenchmark.CountFirst
            0UL
            1
            1 with
    | Error(ContextualGridBenchmark.UnknownFingerprint supplied) -> Assert.Equal("not-the-frozen-environment", supplied)
    | other -> failwithf "expected UnknownFingerprint, got %A" other

[<Fact>]
let ``catalogue mismatch refuses instead of selecting a reordered evaluator`` () =
    match
        ContextualGridBenchmark.run
            ContextualGridBenchmark.EnvironmentFingerprint
            "not-the-frozen-catalogue"
            ContextualGridBenchmark.CountFirst
            0UL
            1
            1 with
    | Error(ContextualGridBenchmark.CatalogueFingerprintMismatch supplied) -> Assert.Equal("not-the-frozen-catalogue", supplied)
    | other -> failwithf "expected CatalogueFingerprintMismatch, got %A" other

[<Fact>]
let ``benchmark-local SplitMix64 stream agrees with the shared seed-zero vectors`` () =
    let vectorsPath = Path.Join(repoRoot (), "docs", "research", "data", "2026-09-05-contextual-grid-v1-splitmix64-vectors.json")
    use vectors = JsonDocument.Parse(File.ReadAllText vectorsPath)
    let mutable stream: ContextualGridBenchmark.Stream = { State = 0UL; Draws = 0 }
    for vector in vectors.RootElement.GetProperty("stream").EnumerateArray() do
        let word, next = ContextualGridBenchmark.nextStream stream
        Assert.Equal(UInt64.Parse(vector.GetProperty("output").GetString()), word)
        Assert.Equal(UInt64.Parse(vector.GetProperty("state").GetString()), next.State)
        stream <- next

[<Fact>]
let ``evaluation never mutates the trained Q table`` () =
    match runKnown ContextualGridBenchmark.QUcb 17UL 12 20 with
    | Ok receipt -> Assert.Equal(receipt.QDigestBeforeEvaluation, receipt.QDigestAfterEvaluation)
    | Error failure -> failwithf "unexpected admission failure: %A" failure

[<Fact>]
let ``count novelty is not constant across a repeated state action`` () =
    match runKnown ContextualGridBenchmark.CountFirst 5UL 8 20 with
    | Ok receipt ->
        Assert.True(receipt.TrainingUniqueStateActions > 1)
        Assert.True(receipt.MeanPreIncrementNovelty < 1.0, sprintf "expected repeated-count novelty below 1.0, got %.17g" receipt.MeanPreIncrementNovelty)
    | Error failure -> failwithf "unexpected admission failure: %A" failure

[<Fact>]
let ``one-seed full-budget preflight receipt exactly replays through the F# runner`` () =
    let preflightPath = Path.Join(repoRoot (), "docs", "research", "data", "2026-09-05-contextual-grid-v1-one-seed-preflight.json")
    use preflight = JsonDocument.Parse(File.ReadAllText preflightPath)
    let root = preflight.RootElement
    Assert.Equal("compatible-conformance-only", root.GetProperty("status").GetString())
    let config = root.GetProperty("configuration")
    let episodes = config.GetProperty("episodes").GetInt32()
    let actionCap = config.GetProperty("actionCap").GetInt32()
    let seed = UInt64.Parse(config.GetProperty("seed").GetString())
    for expected in root.GetProperty("runs").EnumerateArray() do
        let policy = expected.GetProperty("policy").GetString() |> policyFromName
        match runKnown policy seed episodes actionCap with
        | Error failure -> failwithf "unexpected admission failure: %A" failure
        | Ok receipt ->
            Assert.Equal(expected.GetProperty("heldOutReturnPpm").GetInt32(), receipt.HeldOutReturnPpm)
            Assert.Equal(expected.GetProperty("trainingUniqueStates").GetInt32(), receipt.TrainingUniqueStates)
            Assert.Equal(expected.GetProperty("trainingUniqueStateActions").GetInt32(), receipt.TrainingUniqueStateActions)
            Assert.Equal(expected.GetProperty("trainingTraceDigest").GetString(), receipt.TrainingTraceDigest)
            Assert.Equal(expected.GetProperty("evaluationTraceDigest").GetString(), receipt.EvaluationTraceDigest)
            Assert.Equal(expected.GetProperty("qDigestBeforeEvaluation").GetString(), receipt.QDigestBeforeEvaluation)
            Assert.Equal(expected.GetProperty("streamDraws").GetInt32(), receipt.StreamDraws)

[<Fact>]
let ``independent Python oracle agrees on bounded replay traces for every declared policy`` () =
    let policies =
        [ ContextualGridBenchmark.UniformRandom
          ContextualGridBenchmark.QEpsilon
          ContextualGridBenchmark.QUcb
          ContextualGridBenchmark.CountFirst ]
    let seeds = [ 0UL; 42UL; 987_654_321UL ]
    for seed in seeds do
        for policy in policies do
            match runKnown policy seed 12 20 with
            | Error failure -> failwithf "unexpected admission failure: %A" failure
            | Ok fsharp ->
                use python = pythonReceipt policy seed 12 20
                let root = python.RootElement
                Assert.Equal(fsharp.HeldOutReturnPpm, root.GetProperty("heldOutReturnPpm").GetInt32())
                Assert.Equal(fsharp.TrainingUniqueStates, root.GetProperty("trainingUniqueStates").GetInt32())
                Assert.Equal(fsharp.TrainingUniqueStateActions, root.GetProperty("trainingUniqueStateActions").GetInt32())
                Assert.Equal(fsharp.StreamDraws, root.GetProperty("streamDraws").GetInt32())
                Assert.Equal(fsharp.TrainingTraceDigest, root.GetProperty("trainingTraceDigest").GetString())
                Assert.Equal(fsharp.EvaluationTraceDigest, root.GetProperty("evaluationTraceDigest").GetString())
                Assert.Equal(fsharp.QDigestBeforeEvaluation, root.GetProperty("qDigestBeforeEvaluation").GetString())
                Assert.Equal(fsharp.QDigestAfterEvaluation, root.GetProperty("qDigestAfterEvaluation").GetString())
                let pythonActions : string list =
                    root.GetProperty("heldOutActions").EnumerateArray()
                    |> Seq.map (fun element ->
                        let action = element.GetString()
                        if isNull action then failwith "python oracle emitted a null action" else action)
                    |> Seq.toList
                Assert.Equal<string>(fsharp.HeldOutActions :> seq<string>, pythonActions :> seq<string>)
                Assert.Equal(fsharp.MeanPreIncrementNovelty, root.GetProperty("meanPreIncrementNovelty").GetDouble(), 12)

[<Fact>]
let ``reflected carrier is separately admitted and refuses the v1 catalogue before simulation`` () =
    match ContextualGridBenchmark.loadVerifiedCarrier (repoRoot ()) ContextualGridBenchmark.ReflectX with
    | Error failure -> failwith failure
    | Ok carrier ->
        Assert.Equal(4, carrier.TrainingStart.X)
        Assert.Equal(0, carrier.TrainingStart.Y)
        Assert.Equal(4, carrier.HeldOutStart.X)
        Assert.Equal(4, carrier.HeldOutStart.Y)
        Assert.Equal(0, carrier.Goal.X)
        Assert.Equal(0, carrier.Goal.Y)
        match
            ContextualGridBenchmark.runForCarrier
                carrier
                carrier.EnvironmentFingerprint
                ContextualGridBenchmark.EvaluatorCatalogueFingerprint
                ContextualGridBenchmark.CountFirst
                100UL
                12
                20 with
        | Error(ContextualGridBenchmark.CatalogueFingerprintMismatch supplied) ->
            Assert.Equal(ContextualGridBenchmark.EvaluatorCatalogueFingerprint, supplied)
        | other -> failwithf "expected reflected carrier catalogue refusal, got %A" other
