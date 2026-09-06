#load "ComparisonSupport.fsx"
#load "SharedFactorFilter.fs"

open System
open System.IO
open System.Runtime.InteropServices
open System.Security.Cryptography
open System.Text.Json
open ComparisonSupport
open Zeta.Research

let output = match fsi.CommandLineArgs |> Array.skip 1 with [| path |] -> path | _ -> eprintfn "usage: run-factor-comparison.fsx OUTPUT"; exit 2
if File.Exists output then eprintfn "refusing to overwrite %s" output; exit 2
let candidates = ResizeArray<Candidate * int[][]>()
let scores = ResizeArray<_>()
for n in [2;3;4] do
    for epsilon in [0.;0.2] do
        for seed in [41UL;53UL;67UL] do
            let dense = SharedFactorFilter.create n epsilon SharedFactorFilter.Dense |> require
            let random = ResearchRandom.Stream(ResearchRandom.domain seed 51)
            let panel = Array.init 256 (fun _ -> SharedFactorFilter.sample dense random 64 |> require)
            let contextHash = panel |> Array.collect (Array.map byte) |> SHA256.HashData |> Convert.ToHexString
            let truth = panel |> Array.map (SharedFactorFilter.after dense >> require)
            let correlation = truth |> Array.averageBy (fun (state,_) -> divergence state (SharedFactorFilter.product (SharedFactorFilter.marginals n state) n))
            for mode in [SharedFactorFilter.Dense;SharedFactorFilter.TensorJoint;SharedFactorFilter.ProjectedProduct] do
                let model = SharedFactorFilter.create n epsilon mode |> require
                let id = sprintf "n%d-e%.1f-s%d-%A" n epsilon seed mode
                let isDense, isProjected = mode = SharedFactorFilter.Dense, mode = SharedFactorFilter.ProjectedProduct
                let s = 1 <<< n
                let c = { Id = id; Source = "shared-factor"; Kind = sprintf "%A" mode
                          ParameterBytes = 8 * (if isDense then s*s*s+s else 8+2+1)
                          CacheBytes = 8 * (if isDense then s*s else 4); StateBytes = 8 * (if isProjected then 2*n else s)
                          Invoke = fun tokens -> SharedFactorFilter.after model tokens |> require
                          Future = fun (_,p) -> p }
                candidates.Add(c, panel)
                let output = panel |> Array.map c.Invoke
                let nextKl = Array.map2 (fun (_,p) (_,q) -> divergence p q) truth output |> Array.average
                let stateError = Array.map2 (fun (p,_) (q,_) -> Array.map2 (fun a b -> abs(a-b)) p (SharedFactorFilter.expand model q) |> Array.max) truth output |> Array.max
                scores.Add {| Model = id; Factors = n; Epsilon = epsilon; Seed = seed; Mode = sprintf "%A" mode; ContextSha256 = contextHash
                              NextKlBits = nextKl; MaximumStateError = stateError; JointVsMarginalsKlBits = correlation
                              ParameterBytes = c.ParameterBytes; CacheBytes = c.CacheBytes; StateBytes = c.StateBytes |}
let warm, measurements = benchmark (candidates.ToArray())
let result = {| Protocol = "shared-factor-comparison-v1"; Complete = true; Contexts = 256; ContextLength = 64; DataDomain = 51; WarmupCalls = 256; Calls = 4096; Repetitions = 5
                WarmupChecksum = warm; Scores = scores.ToArray(); Measurements = measurements; Runtime = RuntimeInformation.FrameworkDescription; Platform = RuntimeInformation.OSDescription
                PayloadNote = "Binary64 numeric coefficients and retained state, not heap. Shared local tables count once per model; dense joint matrices are materialized. Metadata, object headers, scratch and complete next-distribution outputs are excluded from payload but included in measured allocation."
                Algebra = {| DirectSumDeterminant = 1.0; SquaredPrincipalCosine = 0.5; RotationPrediction = 0.38; RotationDimensions = 2 |}
                SourceHashes = [|"ComparisonSupport.fsx";"SharedFactorFilter.fs";"DenseHmm.fs";"ResearchRandom.fs";"run-factor-comparison.fsx"|] |> Array.map (fun file -> {|File=file;Sha256=fingerprint file|}) |}
File.WriteAllText(output, JsonSerializer.Serialize(result, JsonSerializerOptions(WriteIndented = true)) + Environment.NewLine)
