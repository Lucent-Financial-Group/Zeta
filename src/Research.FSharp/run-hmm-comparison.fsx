#load "ComparisonSupport.fsx"

open System
open System.IO
open System.Text.Json
open ComparisonSupport
open Zeta.Research

let output = match fsi.CommandLineArgs |> Array.skip 1 with [| path |] -> path | _ -> eprintfn "usage: run-hmm-comparison.fsx OUTPUT"; exit 2
if File.Exists output then eprintfn "refusing to overwrite %s" output; exit 2
let rnns = loadRnns ()
let candidates = Array.concat [loadHmms (); Array.map fst rnns; Array.map (fun (c,b) -> bigramCandidate c b) rnns; [|knownCandidate "mess3"; knownCandidate "rrxor"|]]
let scores = ResizeArray<_>()
let probes = ResizeArray<_>()
let validation = ResizeArray<_>()
for source in [ "mess3"; "rrxor" ] do
    let oracle = knownCandidate source
    let fitting = contexts source 33 512 16
    let fitTargets = fitting |> Array.map (oracle.Invoke >> fst)
    let fittedProbes =
        if source <> "rrxor" then [||]
        else [| for c,_ in rnns |> Array.filter (fun (c,_) -> c.Source = source) do
                    let output = fitting |> Array.map c.Invoke
                    yield c, BeliefProbe.fit 1e-6 (Array.map fst output) fitTargets |> require,
                             BeliefProbe.fit 1e-6 (Array.map c.Future output) fitTargets |> require |]
    for length, tag in [16,31; 64,32] do
        let panel = contexts source tag 512 length
        let truth = panel |> Array.map oracle.Invoke
        let futures = truth |> Array.map oracle.Future
        let error = panel |> Array.mapi (fun i tokens ->
            let expected =
                if source = "mess3" then let b,_,_ = Mess3.filter tokens |> require in b
                else let b,_ = PredictiveState.filter PredictiveState.rrxor tokens |> require in b |> Array.map (fun n -> float n / float (Array.sum b))
            Array.map2 (fun x y -> abs (x-y)) expected (fst truth.[i]) |> Array.max) |> Array.max
        validation.Add {| Source = source; Length = length; MaximumStateError = error |}
        for c in candidates |> Array.filter (fun c -> c.Source = source) do
            let output = panel |> Array.map c.Invoke
            let nextKl = Array.map2 (fun (_,p) (_,q) -> divergence p q) truth output |> Array.average
            let h = truth |> Array.averageBy (snd >> entropy)
            let futureKl = Array.map2 (fun p output -> divergence p (c.Future output)) futures output |> Array.average
            scores.Add {| Model = c.Id; Kind = c.Kind; Source = source; Length = length; NextEntropyBits = h; NextKlBits = nextKl
                          NextCrossEntropyBits = h + nextKl; Future4KlBits = futureKl |}
        for c, hiddenFit, futureFit in fittedProbes do
            let output = panel |> Array.map c.Invoke
            let targets = truth |> Array.map fst
            let score fit features = BeliefProbe.predict fit features |> require |> fun predictions -> BeliefProbe.score predictions targets |> require
            probes.Add {| Model = c.Id; Length = length; Hidden = score hiddenFit (Array.map fst output); Joint4Output = score futureFit (Array.map c.Future output) |}
        eprintfn "scored %s L%d" source length
let sources = [|"ComparisonSupport.fsx";"run-hmm-comparison.fsx";"SmallRnn.fs";"DenseHmm.fs";"BeliefProbe.fs";"ResearchRandom.fs";"Mess3.fs";"PredictiveState.fs"|]
let result = {| Protocol = "hmm-comparison-v1"; Complete = true; SourceHashes = sources |> Array.map (fun file -> {| File = file; Sha256 = fingerprint file |})
                Inputs = [|"learned-hmm-results.json";"mess3-learned-belief-results.json";"rrxor-learned-belief-results.json"|] |> Array.map (fun file -> {| File = file; Sha256 = fingerprint file |})
                DataSeed = 1009; DataDomains = [|31;32|]; ProbeDomain = 33; Contexts = 512; Scores = scores.ToArray(); Probes = probes.ToArray(); OracleValidation = validation.ToArray() |}
File.WriteAllText(output, JsonSerializer.Serialize(result, JsonSerializerOptions(WriteIndented = true)) + Environment.NewLine)
