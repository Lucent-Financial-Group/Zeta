#load "../Core/SplitMix64.fs"
#load "ResearchRandom.fs"
#load "SmallRnn.fs"
#load "SmallRnnTraining.fs"
#load "PredictiveState.fs"

open System.Text.Json
open Zeta.Research

let require = function Ok value -> value | Error reason -> eprintfn "%A" reason; exit 1
let checks =
    [| for alphabet in [ 2; 3 ] do
           let initial = SmallRnn.create alphabet 3 123UL |> require
           let tokens = [| 0; 1; 0; alphabet - 1; 1; 0; 1 |]
           let loss, gradient = SmallRnn.lossGradient initial tokens |> require
           let state, probability = SmallRnn.after initial tokens |> require
           let config: SmallRnnTraining.Config = { Steps = 4; Batch = 2; SequenceSteps = 6; LearningRate = 0.003 }
           let optimizer =
               [| for clipped in [ false; true ] do
                      let parameters = SmallRnn.parameters initial
                      if clipped then parameters.[parameters.Length - alphabet] <- 20.0
                      let sequences = Array.init 8 (fun i ->
                          if clipped then Array.init 7 (fun j -> 1 + ((i + j) % (alphabet - 1)))
                          else [| 0; 1; 0; alphabet - 1; 1; 0; 1 |])
                      let mutable cursor = 0
                      let next () = let row = sequences.[cursor] in cursor <- cursor + 1; Ok row
                      let network = SmallRnn.fromParameters alphabet 3 parameters |> require
                      let trained = SmallRnnTraining.train config next ignore network |> require
                      yield {| Clipped = clipped; Initial = parameters; Sequences = sequences; Config = config; Final = SmallRnn.parameters trained.Model; Trace = trained.Trace |} |]
           yield {| Alphabet = alphabet; Hidden = 3; Tokens = tokens; Parameters = SmallRnn.parameters initial
                    Loss = loss; Gradient = gradient; State = state; Probability = probability; OptimizerChecks = optimizer |} |]
printfn "%s" (JsonSerializer.Serialize checks)
