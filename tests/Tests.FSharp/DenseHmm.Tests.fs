module Zeta.Tests.DenseHmmTests

open System
open Xunit
open Zeta.Research

let private require = function Ok value -> value | Error reason -> failwithf "%A" reason
let private near expected actual = Assert.True(abs (expected - actual) < 1e-10, sprintf "expected %.17g actual %.17g" expected actual)
let private model () = DenseHmm.fromParameters 2 2 [| 0.6; 0.4 |] [| 0.4; 0.1; 0.2; 0.1; 0.1; 0.4; 0.3; 0.4 |] |> require

let private paths states length =
    let rec loop depth =
        if depth = 0 then [| [||] |]
        else [| for prefix in loop (depth - 1) do for state in 0 .. states - 1 do yield Array.append prefix [| state |] |]
    loop length

[<Fact>]
let ``dense HMM filtering matches all hidden paths and future word sums`` () =
    let model = model ()
    for length in 0 .. 5 do
        for tokens in PredictiveStateLaws.words 2 length do
            let weights = Array.zeroCreate 2
            for hidden in paths 2 (length + 1) do
                let mutable probability = (DenseHmm.prior model).[hidden.[0]]
                for t in 0 .. length - 1 do probability <- probability * DenseHmm.edge model tokens.[t] hidden.[t] hidden.[t + 1]
                weights.[hidden.[length]] <- weights.[hidden.[length]] + probability
            let mass = Array.sum weights
            let state, probabilities = DenseHmm.after model tokens |> require
            Array.iter2 near (weights |> Array.map (fun w -> w / mass)) state
            near 1.0 (Array.sum probabilities)
            for horizon in 1 .. 4 do near 1.0 (DenseHmm.future model horizon state |> require |> Array.sum)
            if length > 0 then near (-Math.Log mass) (DenseHmm.corpusLoss model [| tokens |] |> require)

[<Fact>]
let ``Baum Welch expected counts agree with exhaustive path posteriors`` () =
    let model = model ()
    let corpus = [| [| 0; 1; 0 |]; [| 1; 1 |]; [| 0; 0; 1; 1 |] |]
    let initial, counts = Array.zeroCreate 2, Array.zeroCreate 8
    for tokens in corpus do
        let weighted = paths 2 (tokens.Length + 1) |> Array.map (fun hidden ->
            let mutable p = (DenseHmm.prior model).[hidden.[0]]
            for t in 0 .. tokens.Length - 1 do p <- p * DenseHmm.edge model tokens.[t] hidden.[t] hidden.[t + 1]
            hidden, p)
        let mass = weighted |> Array.sumBy snd
        for hidden, probability in weighted do
            let posterior = probability / mass
            initial.[hidden.[0]] <- initial.[hidden.[0]] + posterior
            for t in 0 .. tokens.Length - 1 do
                let index = (tokens.[t] * 2 + hidden.[t]) * 2 + hidden.[t + 1]
                counts.[index] <- counts.[index] + posterior
    let updated, loss = DenseHmm.emStep model corpus |> require
    near loss (DenseHmm.corpusLoss model corpus |> require)
    Array.iter2 near (initial |> Array.map (fun x -> x / Array.sum initial)) (DenseHmm.prior updated)
    let expected = Array.copy counts
    for source in 0 .. 1 do
        let total = [| for token in 0 .. 1 do for target in 0 .. 1 do yield counts.[(token * 2 + source) * 2 + target] |] |> Array.sum
        for token in 0 .. 1 do
            for target in 0 .. 1 do
                let index = (token * 2 + source) * 2 + target
                expected.[index] <- counts.[index] / total
    Array.iter2 near expected (DenseHmm.parameters updated)
    Assert.True((DenseHmm.corpusLoss updated corpus |> require) <= loss)

[<Fact>]
let ``EM preserves unoccupied rows and never mutates supplied model arrays`` () =
    let prior = [| 1.0; 0.0 |]
    let edges = [| 0.5; 0.0; 0.0; 0.25; 0.5; 0.0; 0.0; 0.75 |]
    let model = DenseHmm.fromParameters 2 2 prior edges |> require
    prior.[0] <- 0.0
    edges.[0] <- 0.0
    let original = DenseHmm.parameters model
    let result = DenseHmm.train 3 ignore model [| [| 0; 1; 0 |] |] |> require
    Array.iter2 near original (DenseHmm.parameters model)
    let final = DenseHmm.parameters result.Model
    for i in [ 2; 3; 6; 7 ] do near original.[i] final.[i]
    let exposed = DenseHmm.prior model
    exposed.[0] <- 0.0
    near 1.0 (DenseHmm.prior model).[0]
    for pair in Array.pairwise result.Trace do Assert.True((snd pair).CorpusLossNats <= (fst pair).CorpusLossNats + 1e-10)

[<Fact>]
let ``dense HMM refuses invalid shapes probabilities histories and budgets`` () =
    for a, n in [ 1, 2; 17, 2; 2, 0; 2, 17 ] do Assert.True((DenseHmm.create a n 1UL).IsError)
    let valid = model ()
    for prior in [ null; [||]; [| -1.0; 2.0 |]; [| Double.NaN; 1.0 |]; [| 0.2; 0.3 |] ] do
        Assert.True((DenseHmm.fromParameters 2 2 prior (DenseHmm.parameters valid)).IsError)
    for edges in [ null; [||]; Array.create 8 Double.NaN; Array.create 8 -0.25; Array.create 8 0.5 ] do
        Assert.True((DenseHmm.fromParameters 2 2 (DenseHmm.prior valid) edges).IsError)
    for tokens in [ null; [| -1 |]; [| 2 |]; Array.zeroCreate 258 ] do Assert.True((DenseHmm.after valid tokens).IsError)
    for corpus in [ null; [||]; [| null |]; [| [||] |]; Array.create 65537 [| 0 |] ] do
        Assert.True((DenseHmm.emStep valid corpus).IsError)
    for passes in [ 0; 65 ] do Assert.True((DenseHmm.train passes ignore valid [| [| 0 |] |]).IsError)
    for horizon in [ 0; 5 ] do Assert.True((DenseHmm.future valid horizon (DenseHmm.prior valid)).IsError)
    Assert.True((DenseHmm.future valid 1 null).IsError)

[<Fact>]
let ``impossible HMM branches are zero futures but refuse posterior inference`` () =
    let model = DenseHmm.fromParameters 2 1 [| 1.0 |] [| 1.0; 0.0 |] |> require
    Assert.True((DenseHmm.after model [| 1 |]).IsError)
    Assert.True((DenseHmm.emStep model [| [| 1 |] |]).IsError)
    Assert.True((DenseHmm.corpusLoss model [| [| 1 |] |]).IsError)
    let future = DenseHmm.future model 4 [| 1.0 |] |> require
    near 1.0 future.[0]
    near 0.0 (Array.sum future.[1..])
