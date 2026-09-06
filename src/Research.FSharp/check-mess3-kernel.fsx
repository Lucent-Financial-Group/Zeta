#load "../Core/SplitMix64.fs"
#load "ResearchRandom.fs"
#load "Mess3.fs"
#load "SmallRnn.fs"
#load "SmallRnnTraining.fs"
#load "BeliefProbe.fs"

open System
open System.Text.Json
open Zeta.Research

let require = function Ok value -> value | Error reason -> failwith reason
let model = SmallRnn.create 3 123UL |> require
let tokens = [| 0; 1; 0; 2; 2; 1; 0 |]
let loss, gradient = SmallRnn.lossGradient model tokens |> require
let parameters = SmallRnn.parameters model
let epsilon = 1e-5
let numeric =
    parameters |> Array.mapi (fun i _ ->
        let plus, minus = Array.copy parameters, Array.copy parameters
        plus.[i] <- plus.[i] + epsilon
        minus.[i] <- minus.[i] - epsilon
        let objective p = SmallRnn.fromParameters 3 p |> require |> fun m -> SmallRnn.lossGradient m tokens |> require |> fst
        (objective plus - objective minus) / (2.0 * epsilon))
let error = Array.map2 (fun a b -> abs (a - b)) gradient numeric |> Array.max
if error > 1e-8 then failwithf "gradient mismatch: %.12g" error
let belief, prediction, logProbability = Mess3.filter tokens |> require
let state, networkPrediction = SmallRnn.after model tokens |> require
let rows = [| for seed in 0UL .. 31UL -> ResearchRandom.Stream seed |> fun stream -> Array.init 4 (fun _ -> stream.Next()) |]
let targets = rows |> Array.map (fun row -> [| 0.2 + row.[0] * 0.1; 0.4 + row.[1] * 0.1; 0.4 - row.[0] * 0.1 - row.[1] * 0.1 |])
let probe = BeliefProbe.fit 1e-6 rows targets |> require
let predicted = BeliefProbe.predict probe rows |> require
printfn "%s" (JsonSerializer.Serialize({| Tokens = tokens; Parameters = parameters; Loss = loss; Gradient = gradient; NumericGradientMaxError = error; Belief = belief; Prediction = prediction; LogProbability = logProbability; State = state; NetworkPrediction = networkPrediction; ProbeFeatures = rows; ProbeTargets = targets; ProbePredictions = predicted |}))
