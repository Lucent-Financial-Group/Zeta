#load "../Core/SplitMix64.fs"
#load "ResearchRandom.fs"
#load "Mess3.fs"
#load "SmallRnn.fs"
#load "SmallRnnTraining.fs"
#load "BeliefProbe.fs"
#load "Mess3Evaluation.fs"

open System
open System.Diagnostics
open System.IO
open System.Runtime.InteropServices
open System.Security.Cryptography
open System.Text.Json
open Zeta.Research

let require = function Ok value -> value | Error reason -> eprintfn "%s" reason; exit 1
let jsonOptions = JsonSerializerOptions(WriteIndented = true)
let arguments = fsi.CommandLineArgs |> Array.skip 1
let smoke = Array.contains "--smoke" arguments
let output =
    arguments |> Array.tryFindIndex ((=) "--output")
    |> Option.bind (fun i -> Array.tryItem (i + 1) arguments)
let validArguments =
    match Array.toList arguments with
    | [] | [ "--smoke" ] | [ "--output"; _ ] | [ "--smoke"; "--output"; _ ] | [ "--output"; _; "--smoke" ] -> true
    | _ -> false
if not validArguments then
    eprintfn "usage: run-mess3-experiment.fsx [--smoke] [--output PATH]"
    exit 2
match output with
| Some path when File.Exists path ->
    eprintfn "refusing to overwrite an existing result: %s" path
    exit 2
| _ -> ()
let seeds = if smoke then [| 999UL |] else [| 11UL; 23UL; 37UL |]
let widths = if smoke then [| 3 |] else [| 3; 8; 16 |]
let config: SmallRnnTraining.Config =
    { Steps = (if smoke then 64 else 4096); Batch = 16; SequenceSteps = 32; LearningRate = 0.003 }
let fingerprint (values: float[]) =
    let bytes = Array.zeroCreate (values.Length * 8)
    for i in 0 .. values.Length - 1 do
        System.Buffers.Binary.BinaryPrimitives.WriteDoubleLittleEndian(bytes.AsSpan(i * 8, 8), values.[i])
    SHA256.HashData bytes |> Convert.ToHexString
let measure action =
    let allocated = GC.GetAllocatedBytesForCurrentThread()
    use currentProcess = Process.GetCurrentProcess()
    let cpu = currentProcess.TotalProcessorTime.TotalMilliseconds
    let watch = Stopwatch.StartNew()
    let result = action ()
    watch.Stop()
    currentProcess.Refresh()
    result,
    {| ElapsedMilliseconds = watch.Elapsed.TotalMilliseconds
       ProcessCpuMilliseconds = currentProcess.TotalProcessorTime.TotalMilliseconds - cpu
       ThreadAllocatedBytes = GC.GetAllocatedBytesForCurrentThread() - allocated |}

let sourceHashes =
    [| "ResearchRandom.fs"; "Mess3.fs"; "SmallRnn.fs"; "SmallRnnTraining.fs"; "BeliefProbe.fs"; "Mess3Evaluation.fs"; "run-mess3-experiment.fsx" |]
    |> Array.map (fun name ->
        {| File = name; Sha256 = File.ReadAllBytes(Path.Combine(__SOURCE_DIRECTORY__, name)) |> SHA256.HashData |> Convert.ToHexString |})

let serialize complete runs =
    JsonSerializer.Serialize(
        {| Protocol = (if smoke then "mess3-rnn-smoke-v1" else "mess3-rnn-v1")
           Complete = complete; ExpectedRuns = seeds.Length * widths.Length
           Source = "arXiv:2405.15943v2 Appendix A.3"; Arithmetic = "binary64"
           Runtime = RuntimeInformation.FrameworkDescription; Platform = RuntimeInformation.OSDescription
           Architecture = RuntimeInformation.ProcessArchitecture.ToString(); SourceHashes = sourceHashes
           Config = config; Runs = runs |}, jsonOptions)
let save complete rows =
    match output with
    | Some path ->
        let temporary = path + ".partial"
        File.WriteAllText(temporary, serialize complete rows + Environment.NewLine)
        File.Move(temporary, path, true)
    | None -> ()

// File I/O, clocks, process counters, and printing are confined to this runner.
let completedRuns = ResizeArray<_>()
let results =
    [| for hidden in widths do
           for seed in seeds do
               let initial = SmallRnn.create 3 hidden (ResearchRandom.domain seed 1) |> require
               let initialHash = fingerprint (SmallRnn.parameters initial)
               let stream = ResearchRandom.Stream(ResearchRandom.domain seed 2)
               let counts = Array.create 3 1.0
               let pairs = Array.init 3 (fun _ -> Array.create 3 1.0)
               let next () =
                   Mess3.sample stream (config.SequenceSteps + 1)
                   |> Result.map (fun tokens ->
                       for i in 0 .. tokens.Length - 2 do
                           counts.[tokens.[i + 1]] <- counts.[tokens.[i + 1]] + 1.0
                           pairs.[tokens.[i]].[tokens.[i + 1]] <- pairs.[tokens.[i]].[tokens.[i + 1]] + 1.0
                       tokens)
               let progress (row: SmallRnnTraining.Progress) =
                   eprintfn "width=%d seed=%d update=%d loss-nats=%.6f" hidden seed row.Step row.LossNats
               let trained, trainingCost = measure (fun () -> SmallRnnTraining.train config next progress initial |> require)
               let frozenHash = fingerprint (SmallRnn.parameters trained.Model)
               let normalize row = let total = Array.sum row in Array.map (fun n -> n / total) row
               let unigram, bigram = normalize counts, Array.map normalize pairs
               let fitting = Mess3Evaluation.examples (ResearchRandom.domain seed 3) (if smoke then 64 else 512) 16 |> require
               let evaluations, evaluationCost = measure (fun () ->
                   [| for length, tag in [ 16, 4; 64, 6 ] do
                          let testing = Mess3Evaluation.examples (ResearchRandom.domain seed tag) (if smoke then 64 else 2048) length |> require
                          yield Mess3Evaluation.evaluate trained.Model initial unigram bigram (ResearchRandom.domain seed 5) fitting testing |> require |])
               if frozenHash <> fingerprint (SmallRnn.parameters trained.Model) || initialHash <> fingerprint (SmallRnn.parameters initial) then
                   eprintfn "evaluation or training mutated a frozen model"
                   exit 1
               let row =
                   {| Hidden = hidden; Seed = seed; Parameters = SmallRnn.parameters trained.Model
                      InitialSha256 = initialHash; TrainedSha256 = frozenHash
                      ParameterCount = (SmallRnn.parameters trained.Model).Length
                      ModelNumericPayloadBytes = int64 (SmallRnn.parameterCount 3 hidden + hidden) * 8L
                      PayloadDefinition = "parameters plus one hidden state, binary64; excludes arrays, scratch, optimizer, and runtime"
                      TrainedTokens = trained.TrainedTokens; TrainingTrace = trained.Trace
                      TrainingCost = trainingCost; EvaluationCost = evaluationCost
                      Unigram = unigram; Bigram = bigram; Evaluations = evaluations |}
               eprintfn "finished width=%d seed=%d train-ms=%.0f" hidden seed trainingCost.ElapsedMilliseconds
               completedRuns.Add row
               save false (completedRuns.ToArray())
               yield row |]
save true results
match output with
| Some _ -> ()
| None -> printfn "%s" (serialize true results)
