#load "../Core/SplitMix64.fs"
#load "ResearchRandom.fs"
#load "SmallRnn.fs"
#load "PredictiveState.fs"
#load "PredictiveStateLaws.fs"

open System
open System.IO
open System.Security.Cryptography
open System.Text.Json
open Zeta.Research

let require = function Ok value -> value | Error reason -> eprintfn "%A" reason; exit 1
let output = match fsi.CommandLineArgs |> Array.skip 1 with [| path |] -> path | _ -> eprintfn "usage: run-predictive-laws.fsx OUTPUT"; exit 2
if File.Exists output then eprintfn "refusing to overwrite %s" output; exit 2
let rows = PredictiveState.fixtures |> Array.map (PredictiveStateLaws.run 12 >> require)
let hashes = [| "../Core/SplitMix64.fs"; "ResearchRandom.fs"; "SmallRnn.fs"; "PredictiveState.fs"; "PredictiveStateLaws.fs"; "run-predictive-laws.fsx" |] |> Array.map (fun name ->
    {| File = name; Sha256 = File.ReadAllBytes(Path.Combine(__SOURCE_DIRECTORY__, name)) |> SHA256.HashData |> Convert.ToHexString |})
let result = {| Protocol = "predictive-laws-v1"; Complete = true; SourceHashes = hashes; Models = rows |}
File.WriteAllText(output, JsonSerializer.Serialize(result, JsonSerializerOptions(WriteIndented = true)) + Environment.NewLine)
for row in rows do
    let discrepancy = row.Losses |> Array.map (fun r -> max (abs (r.Entropy - r.ChainEntropy)) (max (abs (r.CrossEntropy - r.ChainCrossEntropy)) (abs (r.Kl - r.ChainKl)))) |> Array.max
    printfn "%s states=%d edges=%d max-chain-error=%.12g" row.Model row.Closure.Beliefs.Length row.Closure.Edges.Length discrepancy
