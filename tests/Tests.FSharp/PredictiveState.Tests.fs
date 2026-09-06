module Zeta.Tests.PredictiveStateTests

open System
open Xunit
open Zeta.Research

let private require = function Ok value -> value | Error reason -> failwithf "%A" reason
let private near tolerance expected actual = Assert.True(abs (expected - actual) <= tolerance, sprintf "expected %.17g actual %.17g" expected actual)

[<Fact>]
let ``binary and ternary recurrent gradients match every finite difference`` () =
    for alphabet in [ 2; 3 ] do
        for hidden in [ 1; 2; 3; 5 ] do
            let tokens = [| 0; 1; 1; 0; alphabet - 1; 0; 1 |]
            let model = SmallRnn.create alphabet hidden 123UL |> require
            let _, gradient = SmallRnn.lossGradient model tokens |> require
            let values = SmallRnn.parameters model
            for i in 0 .. values.Length - 1 do
                let plus, minus = Array.copy values, Array.copy values
                plus.[i] <- plus.[i] + 1e-5
                minus.[i] <- minus.[i] - 1e-5
                let objective parameters = SmallRnn.fromParameters alphabet hidden parameters |> require |> fun network -> SmallRnn.lossGradient network tokens |> require |> fst
                near 1e-8 gradient.[i] ((objective plus - objective minus) / 2e-5)
    for alphabet in [ -1; 0; 1; 17 ] do Assert.True((SmallRnn.create alphabet 3 0UL).IsError)
    let binary = SmallRnn.create 2 3 0UL |> require
    Assert.True((SmallRnn.after binary [| 2 |]).IsError)
    Assert.True((SmallRnn.fromParameters 2 3 (Array.create 33 0.0)).IsError)

[<Fact>]
let ``exact word weights agree with normalized filtering including impossible histories`` () =
    for model in PredictiveState.fixtures () do
        for length in 0 .. 8 do
            let mutable mass = 0.0
            for word in PredictiveStateLaws.words 2 length do
                let n, d = PredictiveState.wordProbability model word
                mass <- mass + PredictiveState.ratio n d
                match PredictiveState.filter model word with
                | Ok(_, probability) -> Assert.Equal<bigint * bigint>((n, d), probability)
                | Error PredictiveState.ImpossibleObservation -> Assert.Equal(0I, n)
                | Error reason -> failwithf "%A" reason
            near 1e-12 1.0 mass
    Assert.True((PredictiveState.filter PredictiveState.rrxor null).IsError)
    Assert.True((PredictiveState.filter PredictiveState.rrxor (Array.create 257 0)).IsError)

[<Fact>]
let ``finite mixed state closures and chain rule agree without rounding`` () =
    for model, count in List.zip (Array.toList (PredictiveState.fixtures ())) [ 1; 3; 4; 36; 7 ] do
        let receipt = PredictiveStateLaws.run 8 model |> require
        Assert.Equal(count, receipt.Closure.Beliefs.Length)
        for row in receipt.Losses do
            near 1e-10 1.0 row.ProbabilityMass
            near 1e-10 row.Entropy row.ChainEntropy
            near 1e-10 row.CrossEntropy row.ChainCrossEntropy
            near 1e-10 row.Kl row.ChainKl
            near 1e-10 row.CrossEntropy (row.Entropy + row.Kl)
        let known = receipt.Losses |> Array.filter (fun r -> r.Predictor = "known-model")
        for i in 0 .. known.Length - 1 do
            let prior = if i = 0 then 0.0 else known.[i - 1].Entropy
            near 1e-10 (known.[i].Entropy - prior) receipt.EntropyCurve.[i]
    let lag = PredictiveState.closure 128 4096 PredictiveState.lagTwoCopy |> require |> PredictiveState.entropyCurve 64 |> require
    for i in 0 .. 63 do near 1e-12 (if i < 2 then 1.0 else PredictiveState.entropy [| 0.25; 0.75 |]) lag.[i]
    let coin = PredictiveState.closure 128 4096 PredictiveState.coin |> require |> PredictiveState.entropyCurve 64 |> require
    let golden = PredictiveState.closure 128 4096 PredictiveState.goldenMean |> require |> PredictiveState.entropyCurve 64 |> require
    for i in 0 .. 63 do
        near 1e-12 (PredictiveState.entropy [| 0.25; 0.75 |]) coin.[i]
        near 1e-12 (if i = 0 then PredictiveState.entropy [| 1.0 / 3.0; 2.0 / 3.0 |] else 2.0 / 3.0) golden.[i]
    Assert.True((PredictiveStateLaws.crossEntropy [| 0.5; 0.5 |] [| 1.0; 0.0 |]).IsError)
    near 0.0 0.0 (PredictiveStateLaws.crossEntropy [| 1.0; 0.0 |] [| 1.0; 0.0 |] |> require)

[<Fact>]
let ``mixed state growth returns an explicit refusal at each independent cap`` () =
    let infinite = PredictiveState.create "two-coins" 4
                       [| [| [| 3; 0 |]; [| 0; 1 |] |]; [| [| 1; 0 |]; [| 0; 3 |] |] |] [| 1; 1 |] |> require
    match PredictiveState.closure 128 4096 infinite with
    | Error(PredictiveState.ClosureBudget(states, _)) -> Assert.Equal(128, states)
    | result -> failwithf "expected exact unbounded belief family refusal: %A" result
    match PredictiveState.closure 128 1 PredictiveState.rrxor with
    | Error(PredictiveState.ClosureBudget(_, transitions)) -> Assert.Equal(1, transitions)
    | result -> failwithf "expected transition refusal: %A" result
    Assert.True((PredictiveState.closure 129 4096 infinite).IsError)
    Assert.True((PredictiveState.create "bad" 2 [| [| [| 2 |] |]; [| [| 2 |] |] |] [| 1 |]).IsError)

[<Fact>]
let ``RRXOR pairs match one step but distinguish futures before weights are chosen`` () =
    let pairs = RrxorEvaluation.pairs ()
    Assert.Equal(128, pairs.Length)
    for pair in pairs do
        let left = PredictiveState.filter PredictiveState.rrxor pair.Left |> require |> fst
        let right = PredictiveState.filter PredictiveState.rrxor pair.Right |> require |> fst
        Assert.True(PredictiveState.nextExact PredictiveState.rrxor left = PredictiveState.nextExact PredictiveState.rrxor right)
        Assert.True(pair.LeftFuture <> pair.RightFuture)
    let network = SmallRnn.create 2 3 123UL |> require
    let receipt = RrxorEvaluation.intervene "untrained-rnn" network |> require
    near 0.0 receipt.IntactKlBits receipt.IdentityKlBits
    Assert.Equal(128, receipt.Changes.Length)
    Assert.True(receipt.Changes |> Array.exists (fun change -> abs change > 1e-6))

[<Fact>]
let ``five coordinate probe and zero probability RRXOR evaluation stay finite`` () =
    let rows = RrxorEvaluation.examples 123UL 64 16 |> require
    let network = SmallRnn.create 2 3 123UL |> require
    let scored = RrxorEvaluation.evaluate network network [| 0.5; 0.5 |] [| [| 0.5; 0.5 |]; [| 0.5; 0.5 |] |] 42UL rows rows |> require
    Assert.Equal(5, scored.Predictions.Length)
    Assert.Equal(7, scored.Probes.Length)
    let exact = scored.Predictions |> Array.find (fun row -> row.Model = "known-model-filter")
    near 1e-12 0.0 exact.NextKlBits
    near 1e-12 0.0 exact.Future3KlBits
    Assert.True((BeliefProbe.fit 1e-6 [| [| 1.0 |] |] [| [||] |]).IsError)
    Assert.True((BeliefProbe.score [| [| 1.0 |] |] null).IsError)

[<Fact>]
let ``model and fixture collection do not retain caller owned mutable arrays`` () =
    let edges = [| [| [| 3 |] |]; [| [| 1 |] |] |]
    let prior = [| 1 |]
    let model = PredictiveState.create "copy-check" 4 edges prior |> require
    edges.[0].[0].[0] <- 0
    prior.[0] <- 0
    let _, (n, d) = PredictiveState.filter model [| 0 |] |> require
    Assert.Equal<bigint * bigint>((3I, 4I), (n, d))
    let first = PredictiveState.fixtures ()
    first.[0] <- PredictiveState.rrxor
    Assert.Equal("biased-coin", PredictiveState.name (PredictiveState.fixtures ()).[0])
