#load "ComparisonSupport.fsx"

open System
open System.IO
open System.Runtime.InteropServices
open System.Text.Json
open ComparisonSupport

let output = match fsi.CommandLineArgs |> Array.skip 1 with [| path |] -> path | _ -> eprintfn "usage: measure-matched-inference.fsx OUTPUT"; exit 2
if File.Exists output then eprintfn "refusing to overwrite %s" output; exit 2
let candidates = Array.concat [ loadHmms () |> Array.filter (fun c -> c.Kind = "hmm"); loadRnns () |> Array.map fst; [|knownCandidate "mess3";knownCandidate "rrxor"|] ]
let panels = ["mess3";"rrxor"] |> List.map (fun source -> source, contexts source 35 256 64) |> Map.ofList
let warm, measurements = benchmark (candidates |> Array.map (fun c -> c, panels.[c.Source]))
let result = {| Protocol = "matched-binary64-inference-v1"; Complete = true; Calls = 4096; Repetitions = 5; WarmupCalls = 256; Contexts = 256; ContextLength = 64
                DataSeed = 1009; DataDomain = 35; WarmupChecksum = warm; Measurements = measurements; Runtime = RuntimeInformation.FrameworkDescription; Platform = RuntimeInformation.OSDescription
                Payload = candidates |> Array.map (fun c -> {| Model = c.Id; ParameterBytes = c.ParameterBytes; CacheBytes = c.CacheBytes; StateBytes = c.StateBytes |})
                SourceHashes = [|"ComparisonSupport.fsx";"measure-matched-inference.fsx";"SmallRnn.fs";"DenseHmm.fs";"ResearchRandom.fs";"Mess3.fs";"PredictiveState.fs"|] |> Array.map (fun file -> {|File=file;Sha256=fingerprint file|})
                Inputs = [|"learned-hmm-results.json";"mess3-learned-belief-results.json";"rrxor-learned-belief-results.json"|] |> Array.map (fun file -> {|File=file;Sha256=fingerprint file|}) |}
File.WriteAllText(output, JsonSerializer.Serialize(result, JsonSerializerOptions(WriteIndented = true)) + Environment.NewLine)
