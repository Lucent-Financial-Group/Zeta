module Zeta.Tests.Mess3LearningTests

open System
open System.Numerics
open Xunit
open Zeta.Research

let private require = function Ok value -> value | Error reason -> failwith reason
let private close expected actual = Assert.InRange(abs (expected - actual), 0.0, 1e-11)

[<Fact>]
let ``Mess3 matrices agree with an independently factored exact filter`` () =
    let rec words length =
        if length = 0 then [ [||] ]
        else [ for prefix in words (length - 1) do for token in 0 .. 2 -> Array.append prefix [| token |] ]
    for length in 0 .. 5 do
        for tokens in words length do
            let mutable numerators = [| BigInteger.One; BigInteger.One; BigInteger.One |]
            for token in tokens do
                let total = Array.sum numerators
                // Transition: .85 * p_i + .05. Emission: .85 if matching, otherwise .075.
                numerators <- numerators |> Array.mapi (fun i n -> (17I * n + total) * (if token = i then 34I else 3I))
            let total = Array.sum numerators
            let expected = numerators |> Array.map (fun n -> float n / float total)
            let belief, prediction, logProbability = Mess3.filter tokens |> require
            for i in 0 .. 2 do
                close expected.[i] belief.[i]
                close (0.65875 * expected.[i] + 0.11375) prediction.[i]
            close (Math.Log(float total / (3.0 * pown 800.0 length))) logProbability
            close 1.0 (Array.sum belief)
            close 1.0 (Array.sum prediction)

[<Fact>]
let ``source and learner reject invalid bounds and nonfinite input`` () =
    Assert.True((Mess3.sample (ResearchRandom.Stream 0UL) 0).IsError)
    Assert.True((Mess3.filter [| 3 |]).IsError)
    Assert.True((Mess3.filter (Array.zeroCreate 257)).IsError)
    Assert.True((SmallRnn.create 0 0UL).IsError)
    Assert.True((SmallRnn.create 65 0UL).IsError)
    Assert.True((SmallRnn.fromParameters 3 (Array.create 33 Double.NaN)).IsError)
    let model = SmallRnn.create 3 1UL |> require
    Assert.True((SmallRnn.after model [| -1 |]).IsError)
    Assert.True((SmallRnn.lossGradient model [| 0 |]).IsError)

[<Fact>]
let ``every recurrent parameter gradient matches central finite differences`` () =
    for hidden in [ 1; 2; 3; 5 ] do
        let model = SmallRnn.create hidden 123UL |> require
        let parameters = SmallRnn.parameters model
        for tokens in [ [| 0; 1; 2; 0 |]; [| 2; 2; 0; 1; 0; 2 |] ] do
            let _, analytic = SmallRnn.lossGradient model tokens |> require
            let objective p = SmallRnn.fromParameters hidden p |> require |> fun m -> SmallRnn.lossGradient m tokens |> require |> fst
            for i in 0 .. parameters.Length - 1 do
                let plus, minus = Array.copy parameters, Array.copy parameters
                plus.[i] <- plus.[i] + 1e-5
                minus.[i] <- minus.[i] - 1e-5
                let numeric = (objective plus - objective minus) / 2e-5
                Assert.InRange(abs (numeric - analytic.[i]), 0.0, 1e-8)

[<Fact>]
let ``softmax and loss are stable under a huge common output bias`` () =
    let values = Array.zeroCreate 33
    for i in 30 .. 32 do values.[i] <- 1e300
    let model = SmallRnn.fromParameters 3 values |> require
    let _, probabilities = SmallRnn.after model [| 0 |] |> require
    for p in probabilities do close (1.0 / 3.0) p
    let loss, _ = SmallRnn.lossGradient model [| 0; 1; 2 |] |> require
    close (Math.Log 3.0) loss

[<Fact>]
let ``training is deterministic and preserves the untrained model`` () =
    let initial = SmallRnn.create 3 123UL |> require
    let before = SmallRnn.parameters initial
    let config: SmallRnnTraining.Config = { Steps = 64; Batch = 4; SequenceSteps = 8; LearningRate = 0.003 }
    let run () =
        let stream = ResearchRandom.Stream 999UL
        SmallRnnTraining.train config (fun () -> Mess3.sample stream 9) ignore initial |> require
    let left, right = run (), run ()
    Assert.Equal<float>(SmallRnn.parameters left.Model, SmallRnn.parameters right.Model)
    Assert.Equal<float>(before, SmallRnn.parameters initial)
    Assert.False(Array.forall2 (=) before (SmallRnn.parameters left.Model))
    Assert.Equal(2048L, left.TrainedTokens)
    let good = [| 0; 0; 0; 0; 0; 0 |]
    let priorLoss = SmallRnn.lossGradient initial good |> require |> fst
    let learnedLoss = SmallRnn.lossGradient left.Model good |> require |> fst
    Assert.True(learnedLoss < priorLoss)

[<Fact>]
let ``refused training does not mutate caller parameters`` () =
    let initial = SmallRnn.create 3 0UL |> require
    let before = SmallRnn.parameters initial
    let config: SmallRnnTraining.Config = { Steps = 2; Batch = 1; SequenceSteps = 2; LearningRate = 0.003 }
    let mutable calls = 0
    let partialSource () =
        calls <- calls + 1
        if calls = 1 then Ok [| 0; 1; 2 |] else Error "source refused"
    Assert.Equal(Error "source refused", SmallRnnTraining.train config partialSource ignore initial)
    Assert.Equal(2, calls)
    Assert.True((SmallRnnTraining.train config (fun () -> Ok [| 0; 1 |]) ignore initial).IsError)
    Assert.True((SmallRnnTraining.train { config with Steps = 10001 } (fun () -> failwith "must not request data") ignore initial).IsError)
    Assert.Equal<float>(before, SmallRnn.parameters initial)

[<Fact>]
let ``affine probe generalizes heldout linear targets and rejects undefined R2`` () =
    let stream = ResearchRandom.Stream 5UL
    let rows = Array.init 128 (fun _ -> Array.init 4 (fun _ -> stream.Next()))
    let target (x: float[]) = [| 0.2 + 0.1 * x.[0]; 0.3 + 0.1 * x.[1]; 0.5 - 0.1 * x.[0] - 0.1 * x.[1] |]
    let fitting, testing = rows.[0 .. 63], rows.[64 ..]
    let fitted = BeliefProbe.fit 1e-6 fitting (Array.map target fitting) |> require
    let predictions = BeliefProbe.predict fitted testing |> require
    let score = BeliefProbe.score predictions (Array.map target testing) |> require
    Assert.InRange(score.R2, 0.999999, 1.0)
    Assert.True((BeliefProbe.fit 0.0 fitting (Array.map target fitting)).IsError)
    let constant = Array.init 10 (fun _ -> [| 0.2; 0.3; 0.5 |])
    Assert.True((BeliefProbe.score constant constant).IsError)
    let tinyVariance = [| [| -1e-155; 0.0; 0.0 |]; [| 1e-155; 0.0; 0.0 |] |]
    Assert.True((BeliefProbe.score (Array.init 2 (fun _ -> Array.create 3 1.0)) tinyVariance).IsError)

[<Fact>]
let ``evaluation has normalized joint futures and separate negative controls`` () =
    let fitting = Mess3Evaluation.examples 10UL 64 16 |> require
    let testing = Mess3Evaluation.examples 20UL 64 16 |> require
    Assert.False(Array.forall2 (fun (a: Mess3Evaluation.Example) (b: Mess3Evaluation.Example) -> a.Context = b.Context) fitting testing)
    let model = SmallRnn.create 3 123UL |> require
    let state, probabilities = SmallRnn.after model testing.[0].Context |> require
    let future = Mess3Evaluation.future3 (SmallRnn.stepUnchecked model) state probabilities
    Assert.Equal(27, future.Length)
    close 1.0 (Array.sum future)
    let uniform = Array.create 3 (1.0 / 3.0)
    let evaluation = Mess3Evaluation.evaluate model model uniform (Array.init 3 (fun _ -> uniform)) 30UL fitting testing |> require
    Assert.Equal(5, evaluation.Predictions.Length)
    Assert.Equal(5, evaluation.Probes.Length)
    let exact = evaluation.Predictions |> Array.find (fun row -> row.Model = "known-model-filter")
    close 0.0 exact.NextKlBits
    close 0.0 exact.Future3KlBits
    let nextOnly = evaluation.Probes |> Array.find (fun row -> row.Features = "known-next-probabilities")
    Assert.InRange(nextOnly.Score.R2, 0.99999, 1.0)
    let shuffled = evaluation.Probes |> Array.find (fun row -> row.Features = "shuffled-fit-labels")
    Assert.True(shuffled.Score.R2 < 0.5)
