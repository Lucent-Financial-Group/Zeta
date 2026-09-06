#load "../Core/SplitMix64.fs"
#load "ResearchRandom.fs"
#load "Mess3.fs"
#load "SmallRnn.fs"
#load "PredictiveState.fs"
#load "DenseHmm.fs"

open System
open System.Diagnostics
open System.IO
open System.Runtime.InteropServices
open System.Security.Cryptography
open System.Text.Json
open Zeta.Research

let require = function Ok value -> value | Error reason -> eprintfn "%A" reason; exit 1
let output = match fsi.CommandLineArgs |> Array.skip 1 with [| path |] -> path | _ -> eprintfn "usage: run-hmm-training.fsx OUTPUT"; exit 2
if File.Exists output then eprintfn "refusing to overwrite %s" output; exit 2
let hashes = [| "../Core/SplitMix64.fs"; "ResearchRandom.fs"; "Mess3.fs"; "SmallRnn.fs"; "PredictiveState.fs"; "DenseHmm.fs"; "run-hmm-training.fsx" |] |> Array.map (fun file ->
    {| File = file; Sha256 = File.ReadAllBytes(Path.Combine(__SOURCE_DIRECTORY__, file)) |> SHA256.HashData |> Convert.ToHexString |})
let completed = ResizeArray<_>()
let save complete =
    let result = {| Protocol = "learned-hmm-v1"; Complete = complete; ExpectedRuns = 12; Passes = 8; Sequences = 65536; SequenceLength = 33
                    InitDomain = 11; CorpusDomain = 2; SourceHashes = hashes; Runtime = RuntimeInformation.FrameworkDescription
                    Runs = completed.ToArray() |}
    File.WriteAllText(output + ".partial", JsonSerializer.Serialize(result, JsonSerializerOptions(WriteIndented = true)) + Environment.NewLine)
    File.Move(output + ".partial", output, true)
for name, alphabet, sizes, seeds, sampler in [ "mess3", 3, [3;8], [11UL;23UL;37UL], Mess3.sample
                                               "rrxor", 2, [5;8], [41UL;53UL;67UL], (fun r n -> PredictiveState.sampleRrxor r n |> Result.mapError (sprintf "%A")) ] do
    for states in sizes do
        for seed in seeds do
            let initial = DenseHmm.create alphabet states (ResearchRandom.domain seed 11) |> require
            let random = ResearchRandom.Stream(ResearchRandom.domain seed 2)
            let corpus = Array.init 65536 (fun _ -> sampler random 33 |> require)
            let corpusHash = corpus |> Array.collect (Array.map byte) |> SHA256.HashData |> Convert.ToHexString
            use currentProcess = Process.GetCurrentProcess()
            let cpu = currentProcess.TotalProcessorTime.TotalMilliseconds
            let watch = Stopwatch.StartNew()
            let progress (p: DenseHmm.Progress) = eprintfn "%s n%d s%d pass%d loss-nats/token=%.9f" name states seed p.Pass (p.CorpusLossNats / (65536.0 * 33.0))
            let trained = DenseHmm.train 8 progress initial corpus |> require
            watch.Stop()
            currentProcess.Refresh()
            completed.Add {| Source = name; States = states; Seed = seed; Alphabet = alphabet
                             InitialPrior = DenseHmm.prior initial; InitialEdges = DenseHmm.parameters initial
                             Prior = DenseHmm.prior trained.Model; Edges = DenseHmm.parameters trained.Model; Trace = trained.Trace
                             CorpusSha256 = corpusHash; RawObservations = 65536 * 33; OptimizerTargetVisits = 8 * 65536 * 33
                             FreeParameters = states - 1 + states * (alphabet * states - 1)
                             ElapsedMilliseconds = watch.Elapsed.TotalMilliseconds
                             ProcessCpuMilliseconds = currentProcess.TotalProcessorTime.TotalMilliseconds - cpu |}
            save false
save true
