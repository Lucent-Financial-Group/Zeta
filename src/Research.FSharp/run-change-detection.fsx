#load "../Core/SplitMix64.fs"
#load "ResearchRandom.fs"
#load "LagChangeDetection.fs"

open System
open System.IO
open System.Security.Cryptography
open System.Text.Json
open Zeta.Research

let require = function Ok value -> value | Error reason -> eprintfn "%A" reason; exit 1
let output = match fsi.CommandLineArgs |> Array.skip 1 with [| path |] -> path | _ -> eprintfn "usage: run-change-detection.fsx OUTPUT"; exit 2
if File.Exists output then eprintfn "refusing to overwrite %s" output; exit 2
let panels =
    [| for name, p, duration, tag in ["unchanged",0.75,0,41; "permanent-fair",0.5,384,42; "permanent-anticopy",0.25,384,43; "transient-fair",0.5,16,44] do
           let random = ResearchRandom.Stream(ResearchRandom.domain 1009UL tag)
           let streams = Array.init 2048 (fun _ -> LagChangeDetection.sample random p 128 duration |> require)
           let traces = streams |> Array.map (LagChangeDetection.trace >> require)
           yield {| Panel = name; Probability = p; Start = 128; Duration = duration; Domain = tag
                    StreamsSha256 = streams |> Array.collect (Array.map byte) |> SHA256.HashData |> Convert.ToHexString
                    FirstKnown = traces |> Array.map _.FirstKnown; FirstWrongIid = traces |> Array.map _.FirstWrongIid
                    FinalKnownLogRatio = traces |> Array.map (fun t -> Array.last t.Known)
                    FinalWrongLogRatio = traces |> Array.map (fun t -> Array.last t.WrongIid) |} |]
let result = {| Protocol = "lag-two-change-detection-v1"; Complete = true; Alpha = 0.05; Threshold = 20; DataSeed = 1009; Streams = 2048; Length = 512
                Positions = [|64;128;192;256|]; Alternatives = [|0.5;0.25|]; MarginalOnlyRatio = 1; Panels = panels
                SourceHashes = [|"../Core/SplitMix64.fs";"ResearchRandom.fs";"LagChangeDetection.fs";"run-change-detection.fsx"|] |> Array.map (fun file ->
                    {| File = file; Sha256 = File.ReadAllBytes(Path.Combine(__SOURCE_DIRECTORY__, file)) |> SHA256.HashData |> Convert.ToHexString |}) |}
File.WriteAllText(output, JsonSerializer.Serialize(result, JsonSerializerOptions(WriteIndented = true)) + Environment.NewLine)
