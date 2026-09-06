#load "../Core/SplitMix64.fs"
#load "ResearchRandom.fs"
#load "Mess3.fs"
#load "SmallRnn.fs"
#load "PredictiveState.fs"
#load "DenseHmm.fs"
#load "BeliefProbe.fs"

open System
open System.Diagnostics
open System.IO
open System.Security.Cryptography
open System.Text.Json
open Zeta.Research

let require = function Ok value -> value | Error reason -> eprintfn "%A" reason; exit 1
let fingerprint file = File.ReadAllBytes(Path.Combine(__SOURCE_DIRECTORY__, file)) |> SHA256.HashData |> Convert.ToHexString
let floats (value: JsonElement) = value.EnumerateArray() |> Seq.map _.GetDouble() |> Seq.toArray
let rows (value: JsonElement) = value.EnumerateArray() |> Seq.map floats |> Seq.toArray
let sampler source random length =
    match source with
    | "mess3" -> Mess3.sample random length |> require
    | "rrxor" -> PredictiveState.sampleRrxor random length |> require
    | _ -> eprintfn "unknown source %s" source; exit 2
let contexts source tag count length =
    let random = ResearchRandom.Stream(ResearchRandom.domain 1009UL tag)
    Array.init count (fun _ -> sampler source random length)
let divergence (p: float[]) (q: float[]) = Array.map2 (fun p q -> if p = 0.0 then 0.0 else p * Math.Log2(p / q)) p q |> Array.sum
let entropy (p: float[]) = p |> Array.sumBy (fun p -> if p = 0.0 then 0.0 else -p * Math.Log2 p)
type Candidate =
    { Id: string; Source: string; Kind: string; ParameterBytes: int; CacheBytes: int; StateBytes: int
      Invoke: int[] -> float[] * float[]; Future: float[] * float[] -> float[] }
let hmmCandidate source kind id model =
    { Id = id; Source = source; Kind = kind
      ParameterBytes = 8 * (DenseHmm.states model + (DenseHmm.parameters model).Length)
      CacheBytes = 8 * DenseHmm.alphabet model * DenseHmm.states model; StateBytes = 8 * DenseHmm.states model
      Invoke = fun tokens -> DenseHmm.after model tokens |> require
      Future = fun (state, _) -> DenseHmm.future model 4 state |> require }
let known source =
    if source = "mess3" then
        DenseHmm.fromParameters 3 3 (Array.create 3 (1.0 / 3.0))
            [| for x in 0..2 do for i in 0..2 do for j in 0..2 do yield Mess3.transition x i j |] |> require
    else
        let integers = [| 0;1;0;0;0; 0;0;0;0;1; 0;0;0;1;0; 0;0;0;0;0; 2;0;0;0;0
                          0;0;1;0;0; 0;0;0;1;0; 0;0;0;0;1; 2;0;0;0;0; 0;0;0;0;0 |]
        DenseHmm.fromParameters 2 5 ([|2.;1.;1.;1.;1.|] |> Array.map (fun p -> p / 6.0)) (integers |> Array.map (fun p -> float p / 2.0)) |> require
let knownCandidate source = hmmCandidate source "known" (source + "-known") (known source)
let rnnCandidate source id model =
    let rec future depth (state, p: float[]) =
        if depth = 1 then p
        else [| for token in 0 .. p.Length - 1 do
                    let child = SmallRnn.stepUnchecked model state token
                    yield! future (depth - 1) child |> Array.map ((*) p.[token]) |]
    { Id = id; Source = source; Kind = "rnn"; ParameterBytes = (SmallRnn.parameters model).Length * 8
      CacheBytes = 0; StateBytes = SmallRnn.width model * 8
      Invoke = fun tokens -> SmallRnn.after model tokens |> require
      Future = future 4 }
let loadRnns () =
    [| for source, alphabet in [ "mess3",3; "rrxor",2 ] do
           use document = JsonDocument.Parse(File.ReadAllBytes(Path.Combine(__SOURCE_DIRECTORY__, source + "-learned-belief-results.json")))
           for row in document.RootElement.GetProperty("Runs").EnumerateArray() do
               let width, seed = row.GetProperty("Hidden").GetInt32(), row.GetProperty("Seed").GetInt32()
               let id = sprintf "%s-h%d-s%d" source width seed
               let model = SmallRnn.fromParameters alphabet width (floats (row.GetProperty("Parameters"))) |> require
               let bigram = rows (row.GetProperty("Bigram"))
               yield rnnCandidate source id model, bigram |]
let bigramCandidate (rnn: Candidate) (bigram: float[][]) =
    let rec future depth token =
        if depth = 1 then bigram.[token]
        else [| for x in 0 .. bigram.Length - 1 do yield! future (depth - 1) x |> Array.map ((*) bigram.[token].[x]) |]
    { Id = rnn.Id + "-bigram"; Source = rnn.Source; Kind = "bigram"; ParameterBytes = bigram.Length * bigram.Length * 8; CacheBytes = 0; StateBytes = 8
      Invoke = fun tokens -> let x = Array.last tokens in [| float x |], Array.copy bigram.[x]
      Future = fun (state, _) -> future 4 (int state.[0]) }
let loadHmms () =
    use document = JsonDocument.Parse(File.ReadAllBytes(Path.Combine(__SOURCE_DIRECTORY__, "learned-hmm-results.json")))
    if not (document.RootElement.GetProperty("Complete").GetBoolean()) then eprintfn "HMM batch incomplete"; exit 2
    [| for row in document.RootElement.GetProperty("Runs").EnumerateArray() do
           let source, alphabet, states, seed = row.GetProperty("Source").GetString(), row.GetProperty("Alphabet").GetInt32(), row.GetProperty("States").GetInt32(), row.GetProperty("Seed").GetInt32()
           for prefix, kind in [ "", "hmm"; "Initial", "initial-hmm" ] do
               let model = DenseHmm.fromParameters alphabet states (floats (row.GetProperty(prefix + "Prior"))) (floats (row.GetProperty(prefix + "Edges"))) |> require
               yield hmmCandidate source kind (sprintf "%s-n%d-s%d-%s" source states seed kind) model |]
type Measurement = { Model: string; Repetition: int; Calls: int; ElapsedMilliseconds: float; ProcessCpuMilliseconds: float; ThreadAllocatedBytes: int64; Checksum: float }
let checksum (state: float[], p: float[]) i = if i % 2 = 0 then state.[i % state.Length] else p.[i % p.Length]
let benchmark (candidates: (Candidate * int[][])[]) =
    let mutable warm = 0.0
    for c, contexts in candidates do
        for i in 0..255 do warm <- warm + checksum (c.Invoke contexts.[i]) i
    let measurements = ResizeArray<Measurement>()
    for repetition in 0..4 do
        for offset in 0 .. candidates.Length - 1 do
            let c, contexts = candidates.[(offset + repetition) % candidates.Length]
            use currentProcess = Process.GetCurrentProcess()
            let cpu = currentProcess.TotalProcessorTime.TotalMilliseconds
            let watch = Stopwatch()
            let allocated = GC.GetAllocatedBytesForCurrentThread()
            let mutable sum = 0.0
            watch.Start()
            for i in 0..4095 do sum <- sum + checksum (c.Invoke contexts.[i % 256]) i
            watch.Stop()
            let bytes = GC.GetAllocatedBytesForCurrentThread() - allocated
            currentProcess.Refresh()
            measurements.Add { Model = c.Id; Repetition = repetition; Calls = 4096; ElapsedMilliseconds = watch.Elapsed.TotalMilliseconds
                               ProcessCpuMilliseconds = currentProcess.TotalProcessorTime.TotalMilliseconds - cpu; ThreadAllocatedBytes = bytes; Checksum = sum }
        eprintfn "inference repetition %d/5" (repetition + 1)
    warm, measurements.ToArray()
