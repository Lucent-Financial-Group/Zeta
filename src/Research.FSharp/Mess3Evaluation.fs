namespace Zeta.Research

open System

[<RequireQualifiedAccess>]
module Mess3Evaluation =
    type Example = { Context: int[]; ObservedNext: int; Belief: float[]; Next: float[] }
    type PredictionScore =
        { Model: string
          NextCrossEntropyBits: float
          NextEntropyBits: float
          NextKlBits: float
          SampledNextLossBits: float
          Future3KlBits: float }
    type ProbeScore = { Features: string; Score: BeliefProbe.Score }
    type Evaluation = { ContextLength: int; Examples: int; Predictions: PredictionScore[]; Probes: ProbeScore[] }

    let internal collect (values: Result<'T, string>[]) =
        match values |> Array.tryPick (function Error reason -> Some reason | _ -> None) with
        | Some reason -> Error reason
        | None -> values |> Array.choose (function Ok value -> Some value | _ -> None) |> Ok

    let examples seed count contextLength =
        if count < 2 || count > 8192 || contextLength < 1 || contextLength > 256 then
            Error "evaluation needs 2 to 8192 examples and context length 1 to 256"
        else
            let stream = ResearchRandom.Stream seed
            Array.init count (fun _ ->
                Mess3.sample stream (contextLength + 1)
                |> Result.bind (fun tokens ->
                    let context = tokens.[0 .. contextLength - 1]
                    Mess3.filter context |> Result.map (fun (belief, prediction, _) ->
                        { Context = context; ObservedNext = tokens.[contextLength]; Belief = belief; Next = prediction })))
            |> collect

    let internal future3 (step: 'State -> int -> 'State * float[]) (state: 'State) (probabilities: float[]) =
        [| for a in 0 .. 2 do
               let stateA, pA = step state a
               for b in 0 .. 2 do
                   let _, pB = step stateA b
                   for c in 0 .. 2 do
                       yield probabilities.[a] * pA.[b] * pB.[c] |]

    let private knownStep state token =
        let _, belief = Mess3.advance state token
        belief, Mess3.next belief

    let private divergence (actual: float[]) (predicted: float[]) =
        Array.map2 (fun p q -> if p = 0.0 then 0.0 else p * Math.Log2(p / q)) actual predicted |> Array.sum

    let private score name (examples: Example[]) (predictions: float[][]) (futures: float[][]) =
        let mutable cross, entropy, sampled, joint = 0.0, 0.0, 0.0, 0.0
        for i in 0 .. examples.Length - 1 do
            let example = examples.[i]
            for token in 0 .. 2 do
                cross <- cross - example.Next.[token] * Math.Log2 predictions.[i].[token]
                entropy <- entropy - example.Next.[token] * Math.Log2 example.Next.[token]
            sampled <- sampled - Math.Log2 predictions.[i].[example.ObservedNext]
            joint <- joint + divergence (future3 knownStep example.Belief example.Next) futures.[i]
        let n = float examples.Length
        let row =
            { Model = name; NextCrossEntropyBits = cross / n; NextEntropyBits = entropy / n
              NextKlBits = (cross - entropy) / n; SampledNextLossBits = sampled / n; Future3KlBits = joint / n }
        if [ cross; entropy; sampled; joint ] |> List.forall Double.IsFinite then Ok row
        else Error "evaluation encountered a non-finite prediction score"

    let private modelFeatures model examples =
        examples |> Array.map (fun example -> SmallRnn.after model example.Context) |> collect

    let private probe name fitFeatures fitTargets testFeatures testTargets =
        BeliefProbe.fit 1e-6 fitFeatures fitTargets
        |> Result.bind (fun fitted -> BeliefProbe.predict fitted testFeatures)
        |> Result.bind (fun predicted -> BeliefProbe.score predicted testTargets)
        |> Result.map (fun scored -> { Features = name; Score = scored })

    let private evaluateUnchecked model untrained (unigram: float[]) (bigram: float[][]) shuffleSeed (fitting: Example[]) (testing: Example[]) =
        modelFeatures model fitting
        |> Result.bind (fun trainedFit ->
        modelFeatures model testing
        |> Result.bind (fun trainedTest ->
        modelFeatures untrained fitting
        |> Result.bind (fun randomFit ->
        modelFeatures untrained testing
        |> Result.bind (fun randomTest ->
            let fitTargets, testTargets = Array.map _.Belief fitting, Array.map _.Belief testing
            let shuffled = Array.copy fitTargets
            let rng = ResearchRandom.Stream shuffleSeed
            for i in shuffled.Length - 1 .. -1 .. 1 do
                let j = int (rng.Next() * float (i + 1))
                let saved = shuffled.[i]
                shuffled.[i] <- shuffled.[j]
                shuffled.[j] <- saved
            let probes =
                [| probe "trained-hidden" (Array.map fst trainedFit) fitTargets (Array.map fst trainedTest) testTargets
                   probe "untrained-hidden" (Array.map fst randomFit) fitTargets (Array.map fst randomTest) testTargets
                   probe "shuffled-fit-labels" (Array.map fst trainedFit) shuffled (Array.map fst trainedTest) testTargets
                   probe "trained-next-probabilities" (Array.map snd trainedFit) fitTargets (Array.map snd trainedTest) testTargets
                   probe "known-next-probabilities" (Array.map _.Next fitting) fitTargets (Array.map _.Next testing) testTargets |]
            let neural name network (features: (float[] * float[])[]) =
                score name testing (Array.map snd features)
                    (features |> Array.map (fun (state, probabilities) -> future3 (SmallRnn.stepUnchecked network) state probabilities))
            let predictions =
                [| score "known-model-filter" testing (Array.map _.Next testing)
                       (testing |> Array.map (fun e -> future3 knownStep e.Belief e.Next))
                   score "empirical-unigram" testing (testing |> Array.map (fun _ -> unigram))
                       (testing |> Array.map (fun _ -> future3 (fun () _ -> (), unigram) () unigram))
                   score "empirical-bigram" testing
                       (testing |> Array.map (fun e -> bigram.[Array.last e.Context]))
                       (testing |> Array.map (fun e -> future3 (fun _ token -> token, bigram.[token]) (Array.last e.Context) bigram.[Array.last e.Context]))
                   neural "untrained-rnn" untrained randomTest
                   neural "trained-rnn" model trainedTest |]
            collect predictions |> Result.bind (fun scored ->
                collect probes |> Result.map (fun decoded ->
                    { ContextLength = testing.[0].Context.Length; Examples = testing.Length; Predictions = scored; Probes = decoded }))))))

    let evaluate model untrained (unigram: float[]) (bigram: float[][]) shuffleSeed (fitting: Example[]) (testing: Example[]) =
        let distribution (values: float[]) =
            not (isNull values) && values.Length = 3 && Array.forall (fun p -> Double.IsFinite p && p > 0.0) values
            && abs (Array.sum values - 1.0) < 1e-10
        let valid (rows: Example[]) =
            not (isNull rows) && rows.Length >= 2 && rows.Length <= 8192
            && rows |> Array.forall (fun e ->
                SmallRnn.validTokens 1 e.Context && e.Context.Length <= 256
                && e.ObservedNext >= 0 && e.ObservedNext < 3 && distribution e.Belief && distribution e.Next)
        if not (distribution unigram) || isNull bigram || bigram.Length <> 3 || not (Array.forall distribution bigram) then
            Error "empirical baselines must be strictly positive three-token distributions"
        elif not (valid fitting && valid testing) then Error "evaluation examples are invalid or exceed the bounded limits"
        elif testing |> Array.exists (fun e -> e.Context.Length <> testing.[0].Context.Length) then
            Error "an evaluation panel must have a single context length"
        else evaluateUnchecked model untrained unigram bigram shuffleSeed fitting testing
