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
let output = match fsi.CommandLineArgs |> Array.skip 1 with [| path |] -> path | _ -> eprintfn "usage: measure-rnn-allocation.fsx OUTPUT"; exit 2
if File.Exists output then eprintfn "refusing to overwrite %s" output; exit 2
let fingerprint path = File.ReadAllBytes path |> SHA256.HashData |> Convert.ToHexString
type Candidate = { Id: string; Model: SmallRnn.Model; Length: int; Contexts: int[][] }
let candidates = ResizeArray<Candidate>()
let inputs = ResizeArray<_>()
for label, alphabet, seed, sampler in [ "mess3", 3, 11, Mess3.sample; "rrxor", 2, 41, (fun rng length -> PredictiveState.sampleRrxor rng length |> Result.mapError (sprintf "%A")) ] do
    let name = label + "-learned-belief-results.json"
    let path = Path.Combine(__SOURCE_DIRECTORY__, name)
    inputs.Add {| File = name; Sha256 = fingerprint path |}
    use document = JsonDocument.Parse(File.ReadAllBytes path)
    let run = document.RootElement.GetProperty("Runs").EnumerateArray() |> Seq.find (fun row -> row.GetProperty("Hidden").GetInt32() = 8 && row.GetProperty("Seed").GetInt32() = seed)
    let parameters = run.GetProperty("Parameters").EnumerateArray() |> Seq.map _.GetDouble() |> Seq.toArray
    let model = SmallRnn.fromParameters alphabet 8 parameters |> require
    for length in [ 0; 1; 16; 64; 256 ] do
        let random = ResearchRandom.Stream(ResearchRandom.domain 1009UL 34)
        let contexts = Array.init 256 (fun _ -> if length = 0 then [||] else sampler random length |> require)
        candidates.Add { Id = sprintf "%s-h8-s%d" label seed; Model = model; Length = length; Contexts = contexts }
let checksum (state: float[], p: float[]) i = if i % 2 = 0 then state.[i % state.Length] else p.[i % p.Length]
let mutable warmupChecksum = 0.0
for c in candidates do
    for i in 0 .. 255 do warmupChecksum <- warmupChecksum + checksum (SmallRnn.after c.Model c.Contexts.[i] |> require) i
let measurements = ResizeArray<_>()
for repetition in 0 .. 4 do
    for offset in 0 .. candidates.Count - 1 do
        let c = candidates.[(offset + repetition) % candidates.Count]
        use process = Process.GetCurrentProcess()
        let cpu = process.TotalProcessorTime.TotalMilliseconds
        let watch = Stopwatch()
        let before = GC.GetAllocatedBytesForCurrentThread()
        let mutable sum = 0.0
        watch.Start()
        for i in 0 .. 4095 do sum <- sum + checksum (SmallRnn.after c.Model c.Contexts.[i % 256] |> require) i
        watch.Stop()
        let allocated = GC.GetAllocatedBytesForCurrentThread() - before
        process.Refresh()
        measurements.Add {| Model = c.Id; ContextLength = c.Length; Repetition = repetition; Calls = 4096
                            ThreadAllocatedBytes = allocated; ElapsedMilliseconds = watch.Elapsed.TotalMilliseconds
                            ProcessCpuMilliseconds = process.TotalProcessorTime.TotalMilliseconds - cpu; Checksum = sum |}
    eprintfn "allocation repetition %d/5" (repetition + 1)
let hashes = [| "../Core/SplitMix64.fs"; "ResearchRandom.fs"; "Mess3.fs"; "SmallRnn.fs"; "PredictiveState.fs"; "measure-rnn-allocation.fsx" |] |> Array.map (fun file ->
    {| File = file; Sha256 = fingerprint (Path.Combine(__SOURCE_DIRECTORY__, file)) |})
let result = {| Protocol = "rnn-allocation-profile-v1"; Complete = true; WarmupCalls = 256; Calls = 4096; Repetitions = 5
                Contexts = 256; DataSeed = 1009; DataDomain = 34; WarmupChecksum = warmupChecksum; SourceHashes = hashes
                Runtime = RuntimeInformation.FrameworkDescription; Platform = RuntimeInformation.OSDescription
                InputReceipts = inputs.ToArray(); Measurements = measurements.ToArray() |}
File.WriteAllText(output, JsonSerializer.Serialize(result, JsonSerializerOptions(WriteIndented = true)) + Environment.NewLine)
