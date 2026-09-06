#load "../Core/SplitMix64.fs"
#load "ResearchRandom.fs"
#load "SmallRnn.fs"

open System
open System.IO
open System.Security.Cryptography
open System.Text.Json
open Zeta.Research

let require = function Ok value -> value | Error reason -> eprintfn "%A" reason; exit 1
let output = match fsi.CommandLineArgs |> Array.skip 1 with [| path |] -> path | _ -> eprintfn "usage: check-rnn-layout.fsx OUTPUT"; exit 2
if File.Exists output then eprintfn "refusing to overwrite %s" output; exit 2
let hash (values: float[]) =
    let bytes = Array.zeroCreate (values.Length * 8)
    values |> Array.iteri (fun i x -> System.Buffers.Binary.BinaryPrimitives.WriteDoubleLittleEndian(bytes.AsSpan(i * 8, 8), x))
    SHA256.HashData bytes |> Convert.ToHexString
let rows = ResizeArray<_>()
for name, alphabet in [ "mess3", 3; "rrxor", 2 ] do
    use document = JsonDocument.Parse(File.ReadAllBytes(Path.Combine(__SOURCE_DIRECTORY__, name + "-learned-belief-results.json")))
    for run in document.RootElement.GetProperty("Runs").EnumerateArray() do
        let width = run.GetProperty("Hidden").GetInt32()
        let seed = run.GetProperty("Seed").GetInt32()
        let parameters = run.GetProperty("Parameters").EnumerateArray() |> Seq.map _.GetDouble() |> Seq.toArray
        let model = SmallRnn.fromParameters alphabet width parameters |> require
        for length in [ 0; 1; 2; 16; 64; 256; 257 ] do
            let random = ResearchRandom.Stream(ResearchRandom.domain 1009UL 36)
            for sample in 0 .. 3 do
                let tokens = Array.init length (fun _ -> int (random.Next() * float alphabet))
                let state, p = SmallRnn.after model tokens |> require
                let gradient = if length < 2 then [||] else let loss, grad = SmallRnn.lossGradient model tokens |> require in Array.append [| loss |] grad
                rows.Add {| Source = name; Hidden = width; Seed = seed; Length = length; Sample = sample
                            OutputSha256 = hash (Array.append state p); LossGradientSha256 = hash gradient |}
let result = {| Protocol = "rnn-layout-bitwise-v1"; Complete = true; Rows = rows.ToArray()
                KernelSha256 = File.ReadAllBytes(Path.Combine(__SOURCE_DIRECTORY__, "SmallRnn.fs")) |> SHA256.HashData |> Convert.ToHexString |}
File.WriteAllText(output, JsonSerializer.Serialize(result, JsonSerializerOptions(WriteIndented = true)) + Environment.NewLine)
