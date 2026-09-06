#load "../Core/SplitMix64.fs"
#load "ResearchRandom.fs"
#load "Mess3.fs"
#load "SmallRnn.fs"
#load "PredictiveState.fs"

open System
open System.Diagnostics
open System.IO
open System.Runtime.InteropServices
open System.Security.Cryptography
open System.Text.Json
open Zeta.Research

let require = function Ok value -> value | Error reason -> eprintfn "%A" reason; exit 1
let output = match fsi.CommandLineArgs |> Array.skip 1 with [| path |] -> path | _ -> eprintfn "usage: measure-predictive-inference.fsx OUTPUT"; exit 2
if File.Exists output then eprintfn "refusing to overwrite %s" output; exit 2
type Candidate = { Id: string; NumericPayloadBytes: Nullable<int>; Contexts: int[][]; Invoke: int[] -> float[] }
let contexts sampler =
    let rng = ResearchRandom.Stream(ResearchRandom.domain 1009UL 9)
    Array.init 256 (fun _ -> sampler rng 64 |> require)
let mess3 = contexts Mess3.sample
let rrxor = contexts (fun rng count -> PredictiveState.sampleRrxor rng count |> Result.mapError (sprintf "%A"))
let candidates = ResizeArray<Candidate>()
let inputs = ResizeArray<_>()
for label, alphabet, rows, filename in [ "mess3", 3, mess3, "mess3-learned-belief-results.json"; "rrxor", 2, rrxor, "rrxor-learned-belief-results.json" ] do
    let bytes = File.ReadAllBytes(Path.Combine(__SOURCE_DIRECTORY__, filename))
    inputs.Add {| File = filename; Sha256 = SHA256.HashData bytes |> Convert.ToHexString |}
    use document = JsonDocument.Parse bytes
    let root = document.RootElement
    let runs = root.GetProperty("Runs").EnumerateArray() |> Seq.toArray
    if not (root.GetProperty("Complete").GetBoolean()) || runs.Length <> 9 then eprintfn "requires every registered final model"; exit 2
    for run in runs do
        let width, seed = run.GetProperty("Hidden").GetInt32(), run.GetProperty("Seed").GetInt32()
        let values = run.GetProperty("Parameters").EnumerateArray() |> Seq.map _.GetDouble() |> Seq.toArray
        let model = SmallRnn.fromParameters alphabet width values |> require
        let id = sprintf "%s-h%d-s%d" label width seed
        candidates.Add { Id = id; NumericPayloadBytes = Nullable((values.Length + width) * 8); Contexts = rows
                         Invoke = fun context -> SmallRnn.after model context |> require |> snd }
        let bigram = run.GetProperty("Bigram").EnumerateArray() |> Seq.map (fun row -> row.EnumerateArray() |> Seq.map _.GetDouble() |> Seq.toArray) |> Seq.toArray
        candidates.Add { Id = id + "-bigram"; NumericPayloadBytes = Nullable(alphabet * alphabet * 8 + 4); Contexts = rows
                         Invoke = fun context -> Array.copy bigram.[Array.last context] }
candidates.Add { Id = "mess3-known-filter"; NumericPayloadBytes = Nullable(27 * 4 + 3 * 8); Contexts = mess3
                 Invoke = fun context -> let _, p, _ = Mess3.filter context |> require in p }
candidates.Add { Id = "rrxor-known-exact-filter"; NumericPayloadBytes = Nullable(); Contexts = rrxor
                 Invoke = fun context -> let belief, _ = PredictiveState.filter PredictiveState.rrxor context |> require in PredictiveState.probabilities PredictiveState.rrxor belief }

let warmup = 256
let calls = 4096
let repetitions = 5
let mutable warmChecksum = 0.0
for candidate in candidates do
    for i in 0 .. warmup - 1 do
        let values = candidate.Invoke candidate.Contexts.[i % 256]
        warmChecksum <- warmChecksum + values.[i % values.Length]
let measurements = ResizeArray<_>()
for repetition in 0 .. repetitions - 1 do
    for offset in 0 .. candidates.Count - 1 do
        let candidate = candidates.[(offset + repetition) % candidates.Count]
        use currentProcess = Process.GetCurrentProcess()
        let cpu = currentProcess.TotalProcessorTime.TotalMilliseconds
        let watch = Stopwatch()
        let allocated = GC.GetAllocatedBytesForCurrentThread()
        let mutable checksum = 0.0
        watch.Start()
        for i in 0 .. calls - 1 do
            let values = candidate.Invoke candidate.Contexts.[i % 256]
            checksum <- checksum + values.[i % values.Length]
        watch.Stop()
        let allocation = GC.GetAllocatedBytesForCurrentThread() - allocated
        currentProcess.Refresh()
        measurements.Add {| Model = candidate.Id; Repetition = repetition; Calls = calls
                            ElapsedMilliseconds = watch.Elapsed.TotalMilliseconds
                            ProcessCpuMilliseconds = currentProcess.TotalProcessorTime.TotalMilliseconds - cpu
                            ThreadAllocatedBytes = allocation; Checksum = checksum |}
    eprintfn "completed inference repetition %d/%d" (repetition + 1) repetitions
let currentProcess = Process.GetCurrentProcess()
let hashes = [| "../Core/SplitMix64.fs"; "ResearchRandom.fs"; "Mess3.fs"; "SmallRnn.fs"; "PredictiveState.fs"; "measure-predictive-inference.fsx" |] |> Array.map (fun name ->
    {| File = name; Sha256 = File.ReadAllBytes(Path.Combine(__SOURCE_DIRECTORY__, name)) |> SHA256.HashData |> Convert.ToHexString |})
let result =
    {| Protocol = "predictive-inference-v1"; Complete = true; Calls = calls; Repetitions = repetitions; WarmupCalls = warmup
       Contexts = 256; ContextLength = 64; DataSeed = 1009; DataDomain = 9; WarmupChecksum = warmChecksum
       Runtime = RuntimeInformation.FrameworkDescription; Platform = RuntimeInformation.OSDescription
       Architecture = RuntimeInformation.ProcessArchitecture.ToString(); ProcessPeakWorkingSetBytes = currentProcess.PeakWorkingSet64
       SourceHashes = hashes; InputReceipts = inputs.ToArray()
       NumericPayload = candidates |> Seq.map (fun c -> {| Model = c.Id; Bytes = c.NumericPayloadBytes |}) |> Seq.toArray
       PayloadNote = "Parameter arrays plus one state only; not heap. RNN binary64, bigram binary64 plus int32 last symbol, Mess3 int32 transitions plus binary64 belief. Exact-filter BigInteger payload is variable and unmeasured (null)."
       ProcessMemoryNote = "Whole-process peak includes FSI compilation, every loaded model, inputs and measurements. Not per-model retained heap."
       Measurements = measurements.ToArray() |}
File.WriteAllText(output, JsonSerializer.Serialize(result, JsonSerializerOptions(WriteIndented = true)) + Environment.NewLine)
currentProcess.Dispose()
