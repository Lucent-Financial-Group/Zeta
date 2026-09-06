#load "../Core/SplitMix64.fs"
#load "ResearchRandom.fs"
#load "DenseHmm.fs"

open System.Text.Json
open Zeta.Research

let require = function Ok value -> value | Error reason -> eprintfn "%s" reason; exit 1
let corpus = [| [| 0; 1; 0 |]; [| 1; 1 |]; [| 0; 0; 1; 1 |] |]
let initial = DenseHmm.fromParameters 2 2 [| 0.6; 0.4 |] [| 0.4; 0.1; 0.2; 0.1; 0.1; 0.4; 0.3; 0.4 |] |> require
let trained = DenseHmm.train 3 ignore initial corpus |> require
let states = corpus |> Array.map (fun tokens -> DenseHmm.after initial tokens |> require |> fst)
printfn "%s" (JsonSerializer.Serialize {| Prior = DenseHmm.prior initial; Edges = DenseHmm.parameters initial; Corpus = corpus
                                          States = states; Trace = trained.Trace; FinalPrior = DenseHmm.prior trained.Model; FinalEdges = DenseHmm.parameters trained.Model |})
