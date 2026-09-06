#r "../Core/bin/Release/net10.0/Zeta.Core.dll"
#load "RelationalIdentity.fs"
#load "RelationalIdentityExperiment.fs"

open System
open System.IO
open System.Diagnostics
open System.Runtime.InteropServices
open System.Security.Cryptography
open System.Text.Json
open Zeta.Research

let output = match fsi.CommandLineArgs |> Array.skip 1 with [|path|] -> path | _ -> eprintfn "usage: run-relational-identity.fsx OUTPUT"; exit 2
if File.Exists output then eprintfn "refusing to overwrite %s" output; exit 2
let root = Path.GetFullPath(Path.Combine(__SOURCE_DIRECTORY__, "..", ".."))
let paths =
    [| "docs/research/relational-identity/2026-09-06-protocol.md"
       "docs/research/relational-identity/2026-09-06-clarification.md"
       "src/Research.FSharp/RelationalIdentity.fs"
       "src/Research.FSharp/RelationalIdentityExperiment.fs"
       "src/Research.FSharp/run-relational-identity.fsx"
       "src/Interp.Python/zeta_interp/relational_identity.py"
       "src/Core/AntiSybil.fs"
       "src/Core/CoordinationSpectrum.fs" |]
let sourceHashes = paths |> Array.map (fun path ->
    {| Path = path; Sha256 = File.ReadAllBytes(Path.Combine(root, path)) |> SHA256.HashData |> Convert.ToHexString |})
let process = Process.GetCurrentProcess()
let cpu = process.TotalProcessorTime
let allocated = GC.GetAllocatedBytesForCurrentThread()
let clock = Stopwatch.StartNew()
let semantic =
    {| Transport = RelationalIdentityExperiment.transportPanel ()
       Mutations = RelationalIdentityExperiment.mutationPanel ()
       Entropy = RelationalIdentityExperiment.entropyPanel ()
       Scaling = RelationalIdentityExperiment.scalingPanel ()
       Baselines = RelationalIdentityExperiment.baselinePanel () |}
clock.Stop()
let result =
    {| Protocol = "relational-identity-v1"
       SourceArchive = "archive/relational-identity-20260906-source-v1"
       ProtocolCommit = "4f470f40e"
       SourceHashes = sourceHashes
       Semantic = semantic
       Measurement = {| ElapsedMilliseconds = clock.Elapsed.TotalMilliseconds
                        ProcessCpuMilliseconds = (process.TotalProcessorTime - cpu).TotalMilliseconds
                        ThreadAllocatedBytes = GC.GetAllocatedBytesForCurrentThread() - allocated
                        Runtime = RuntimeInformation.FrameworkDescription; Platform = RuntimeInformation.OSDescription
                        Scope = "One cold deterministic panel; current-thread managed allocation, not retained heap, energy or stipulated work costs." |} |}
File.WriteAllText(output, JsonSerializer.Serialize(result, JsonSerializerOptions(WriteIndented = true)) + Environment.NewLine)
