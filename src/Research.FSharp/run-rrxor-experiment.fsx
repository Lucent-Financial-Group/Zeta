#load "../Core/SplitMix64.fs"
#load "ResearchRandom.fs"
#load "Mess3.fs"
#load "SmallRnn.fs"
#load "SmallRnnTraining.fs"
#load "BeliefProbe.fs"
#load "Mess3Evaluation.fs"
#load "PredictiveState.fs"
#load "PredictiveStateLaws.fs"
#load "RrxorEvaluation.fs"

open System
open System.IO
open System.Security.Cryptography
open System.Text.Json
open Zeta.Research

let require = function Ok value -> value | Error reason -> eprintfn "%A" reason; exit 1
let output = match fsi.CommandLineArgs |> Array.skip 1 with [| path |] -> path | _ -> eprintfn "usage: run-rrxor-experiment.fsx OUTPUT"; exit 2
if File.Exists output then eprintfn "refusing to overwrite %s" output; exit 2
let config: SmallRnnTraining.Config = { Steps = 4096; Batch = 16; SequenceSteps = 32; LearningRate = 0.003 }
let hash parameters =
    let bytes = Array.zeroCreate (Array.length parameters * 8)
    parameters |> Array.iteri (fun i value -> System.Buffers.Binary.BinaryPrimitives.WriteDoubleLittleEndian(bytes.AsSpan(i * 8, 8), value))
    SHA256.HashData bytes |> Convert.ToHexString
let hashes =
    [| "../Core/SplitMix64.fs"; "ResearchRandom.fs"; "Mess3.fs"; "SmallRnn.fs"; "SmallRnnTraining.fs"; "BeliefProbe.fs"; "Mess3Evaluation.fs"; "PredictiveState.fs"; "PredictiveStateLaws.fs"; "RrxorEvaluation.fs"; "run-rrxor-experiment.fsx" |]
    |> Array.map (fun name -> {| File = name; Sha256 = File.ReadAllBytes(Path.Combine(__SOURCE_DIRECTORY__, name)) |> SHA256.HashData |> Convert.ToHexString |})
// Select intervention histories without consulting any trained weights.
let pairs = RrxorEvaluation.pairs ()
if pairs.Length <> 128 then eprintfn "registered intervention population unavailable"; exit 1
let save complete runs =
    let result = {| Protocol = "rrxor-rnn-v1"; Complete = complete; ExpectedRuns = 9; Config = config
                    SourceHashes = hashes; InterventionPairs = pairs; Runs = runs |}
    File.WriteAllText(output + ".partial", JsonSerializer.Serialize(result, JsonSerializerOptions(WriteIndented = true)) + Environment.NewLine)
    File.Move(output + ".partial", output, true)
let completed = ResizeArray<_>()
for hidden in [ 3; 8; 16 ] do
    for seed in [ 41UL; 53UL; 67UL ] do
        let initial = SmallRnn.create 2 hidden (ResearchRandom.domain seed 1) |> require
        let initialHash = SmallRnn.parameters initial |> hash
        let stream = ResearchRandom.Stream(ResearchRandom.domain seed 2)
        let counts = Array.create 2 1.0
        let pairs = Array.init 2 (fun _ -> Array.create 2 1.0)
        let next () =
            PredictiveState.sampleRrxor stream 33 |> Result.mapError (sprintf "%A") |> Result.map (fun tokens ->
                for i in 0 .. 31 do
                    counts.[tokens.[i + 1]] <- counts.[tokens.[i + 1]] + 1.0
                    pairs.[tokens.[i]].[tokens.[i + 1]] <- pairs.[tokens.[i]].[tokens.[i + 1]] + 1.0
                tokens)
        let progress (row: SmallRnnTraining.Progress) = eprintfn "width=%d seed=%d step=%d loss-nats=%.6f" hidden seed row.Step row.LossNats
        let trained = SmallRnnTraining.train config next progress initial |> require
        let trainedHash = SmallRnn.parameters trained.Model |> hash
        let normalize row = let total = Array.sum row in Array.map (fun n -> n / total) row
        let unigram, bigram = normalize counts, Array.map normalize pairs
        let fitting = RrxorEvaluation.examples (ResearchRandom.domain seed 3) 512 16 |> require
        let panels =
            [| for length, tag in [ 16, 4; 64, 6 ] do
                   let testing = RrxorEvaluation.examples (ResearchRandom.domain seed tag) 2048 length |> require
                   yield RrxorEvaluation.evaluate trained.Model initial unigram bigram (ResearchRandom.domain seed 5) fitting testing |> require |]
        let interventions = [| RrxorEvaluation.intervene "trained-rnn" trained.Model |> require; RrxorEvaluation.intervene "untrained-rnn" initial |> require |]
        if initialHash <> (SmallRnn.parameters initial |> hash) || trainedHash <> (SmallRnn.parameters trained.Model |> hash) then eprintfn "frozen weights changed"; exit 1
        let row = {| Hidden = hidden; Seed = seed; Parameters = SmallRnn.parameters trained.Model; InitialSha256 = initialHash; TrainedSha256 = trainedHash
                     TrainedTokens = trained.TrainedTokens; TrainingTrace = trained.Trace; Unigram = unigram; Bigram = bigram
                     Evaluations = panels; Interventions = interventions |}
        completed.Add row
        save false (completed.ToArray())
        eprintfn "completed width=%d seed=%d" hidden seed
save true (completed.ToArray())
