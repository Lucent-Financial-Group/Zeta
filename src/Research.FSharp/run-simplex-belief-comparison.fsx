#r "../Core.Abstractions/bin/Release/net10.0/Zeta.Core.Abstractions.dll"
#r "../Core/bin/Release/net10.0/Zeta.Core.dll"
#load "SimplexBeliefComparison.fs"

open System.Text.Json
open Zeta.Research

match SimplexBeliefComparison.run SimplexBeliefComparison.MaximumHistory with
| Error reason ->
    eprintfn "%s" reason
    exit 1
| Ok receipts ->
    printfn "%s" (JsonSerializer.Serialize(receipts, JsonSerializerOptions(WriteIndented = true)))
