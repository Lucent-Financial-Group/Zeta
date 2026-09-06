#load "ComparisonSupport.fsx"

open System.Text.Json
open ComparisonSupport

let cases =
    [| for source in ["mess3";"rrxor"] do
           let model = knownCandidate source
           for length in [0;1;16;64] do
               let panel = if length = 0 then Array.create 4 [||] else contexts source 31 4 length
               for tokens in panel do
                   let state, p = model.Invoke tokens
                   yield {|Source=source; Tokens=tokens; State=state; Next=p; Future4=model.Future(state,p)|} |]
printfn "%s" (JsonSerializer.Serialize cases)
