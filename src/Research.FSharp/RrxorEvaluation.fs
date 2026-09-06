namespace Zeta.Research

open System

[<RequireQualifiedAccess>]
module RrxorEvaluation =
    type Example = { Context: int[]; ObservedNext: int; Belief: float[]; Next: float[]; Future: float[] }
    type Pair = { Left: int[]; Right: int[]; NextProbability: PredictiveState.Fraction[]; LeftFuture: float[]; RightFuture: float[] }
    type Intervention = { Model: string; Pairs: int; IntactKlBits: float; IdentityKlBits: float; MidpointKlBits: float; Changes: float[] }

    let private collect = Mess3Evaluation.collect
    let private error reason = sprintf "%A" reason
    let internal example context observed =
        PredictiveState.filter PredictiveState.rrxor context |> Result.mapError error |> Result.map (fun (belief, _) ->
            let total = Array.sum belief
            { Context = context; ObservedNext = observed; Belief = belief |> Array.map (fun n -> PredictiveState.ratio n total)
              Next = PredictiveState.probabilities PredictiveState.rrxor belief
              Future = PredictiveState.futureExact PredictiveState.rrxor 3 belief |> Array.map (fun (n, d) -> PredictiveState.ratio n d) })

    let examples seed count length =
        if count < 2 || count > 8192 || length < 1 || length > 256 then Error "invalid evaluation size"
        else
            let stream = ResearchRandom.Stream seed
            Array.init count (fun _ -> PredictiveState.sampleRrxor stream (length + 1) |> Result.mapError error |> Result.bind (fun tokens -> example tokens.[0 .. length - 1] tokens.[length])) |> collect

    let internal future3 (step: 'State -> int -> 'State * float[]) state (probabilities: float[]) =
        [| for a in 0 .. 1 do
               let stateA, pA = step state a
               for b in 0 .. 1 do
                   let _, pB = step stateA b
                   for c in 0 .. 1 do yield probabilities.[a] * pA.[b] * pB.[c] |]

    let internal kl (p: float[]) (q: float[]) = Array.map2 (fun p q -> if p = 0.0 then 0.0 else p * Math.Log2(p / q)) p q |> Array.sum
    let private features network rows = rows |> Array.map (fun row -> SmallRnn.after network row.Context) |> collect
    let private neuralFutures model = Array.map (fun (h, p) -> future3 (SmallRnn.stepUnchecked model) h p)
    let private probe name fit targets test actual =
        BeliefProbe.fit 1e-6 fit targets |> Result.bind (fun fitted -> BeliefProbe.predict fitted test)
        |> Result.bind (fun predicted -> BeliefProbe.score predicted actual)
        |> Result.map (fun score -> ({ Features = name; Score = score }: Mess3Evaluation.ProbeScore))
    let private score name (rows: Example[]) (predicted: float[][]) (futures: float[][]) : Result<Mess3Evaluation.PredictionScore, string> =
        let mutable ce, entropy, sampled, joint = 0.0, 0.0, 0.0, 0.0
        for i in 0 .. rows.Length - 1 do
            for token in 0 .. 1 do
                if rows.[i].Next.[token] > 0.0 then ce <- ce - rows.[i].Next.[token] * Math.Log2 predicted.[i].[token]
            entropy <- entropy + PredictiveState.entropy rows.[i].Next
            sampled <- sampled - Math.Log2 predicted.[i].[rows.[i].ObservedNext]
            joint <- joint + kl rows.[i].Future futures.[i]
        if not (List.forall Double.IsFinite [ ce; entropy; sampled; joint ]) then Error "non-finite prediction score"
        else
            let n = float rows.Length
            Ok { Model = name; NextCrossEntropyBits = ce / n; NextEntropyBits = entropy / n
                 NextKlBits = (ce - entropy) / n; SampledNextLossBits = sampled / n; Future3KlBits = joint / n }

    let evaluate model untrained (unigram: float[]) (bigram: float[][]) shuffleSeed fitting testing : Result<Mess3Evaluation.Evaluation, string> =
        let distribution (p: float[]) = not (isNull p) && p.Length = 2 && Array.forall (fun x -> Double.IsFinite x && x > 0.0) p && abs (Array.sum p - 1.0) < 1e-10
        let valid (rows: Example[]) =
            not (isNull rows) && rows.Length >= 2 && rows.Length <= 8192 && Array.forall (fun row ->
                match example row.Context row.ObservedNext with
                | Error _ -> false
                | Ok actual -> row.ObservedNext >= 0 && row.ObservedNext < 2 && row.Context.Length > 0
                               && row.Belief = actual.Belief && row.Next = actual.Next && row.Future = actual.Future) rows
        if SmallRnn.alphabet model <> 2 || SmallRnn.alphabet untrained <> 2 || not (distribution unigram)
           || isNull bigram || bigram.Length <> 2 || not (Array.forall distribution bigram) || not (valid fitting && valid testing) then Error "invalid RRXOR evaluation inputs"
        elif testing |> Array.exists (fun row -> row.Context.Length <> testing.[0].Context.Length) then Error "mixed context lengths"
        else
            features model fitting |> Result.bind (fun trainedFit ->
            features model testing |> Result.bind (fun trainedTest ->
            features untrained fitting |> Result.bind (fun randomFit ->
            features untrained testing |> Result.bind (fun randomTest ->
                let targets, actual = Array.map _.Belief fitting, Array.map _.Belief testing
                let shuffled = Array.copy targets
                let stream = ResearchRandom.Stream shuffleSeed
                for i in shuffled.Length - 1 .. -1 .. 1 do
                    let j = int (stream.Next() * float (i + 1))
                    let saved = shuffled.[i]
                    shuffled.[i] <- shuffled.[j]
                    shuffled.[j] <- saved
                let fitFutures, testFutures = neuralFutures model trainedFit, neuralFutures model trainedTest
                let probes =
                    [| probe "trained-hidden" (Array.map fst trainedFit) targets (Array.map fst trainedTest) actual
                       probe "untrained-hidden" (Array.map fst randomFit) targets (Array.map fst randomTest) actual
                       probe "shuffled-fit-labels" (Array.map fst trainedFit) shuffled (Array.map fst trainedTest) actual
                       probe "trained-next-probabilities" (Array.map snd trainedFit) targets (Array.map snd trainedTest) actual
                       probe "trained-joint-three-probabilities" fitFutures targets testFutures actual
                       probe "known-next-probabilities" (Array.map _.Next fitting) targets (Array.map _.Next testing) actual
                       probe "known-joint-three-probabilities" (Array.map _.Future fitting) targets (Array.map _.Future testing) actual |]
                let predictions =
                    [| score "known-model-filter" testing (Array.map _.Next testing) (Array.map _.Future testing)
                       score "empirical-unigram" testing (testing |> Array.map (fun _ -> unigram)) (testing |> Array.map (fun _ -> future3 (fun () _ -> (), unigram) () unigram))
                       score "empirical-bigram" testing (testing |> Array.map (fun row -> bigram.[Array.last row.Context]))
                           (testing |> Array.map (fun row -> future3 (fun _ token -> token, bigram.[token]) (Array.last row.Context) bigram.[Array.last row.Context]))
                       score "untrained-rnn" testing (Array.map snd randomTest) (neuralFutures untrained randomTest)
                       score "trained-rnn" testing (Array.map snd trainedTest) testFutures |]
                collect predictions |> Result.bind (fun scores -> collect probes |> Result.map (fun decoded ->
                    { ContextLength = testing.[0].Context.Length; Examples = testing.Length; Predictions = scores; Probes = decoded }))))))

    let pairs () =
        let histories =
            PredictiveStateLaws.words 2 8 |> Array.choose (fun context ->
                match PredictiveState.filter PredictiveState.rrxor context with
                | Error _ -> None
                | Ok(belief, _) -> Some(context, PredictiveState.nextExact PredictiveState.rrxor belief, PredictiveState.futureExact PredictiveState.rrxor 3 belief))
        [| for i in 0 .. histories.Length - 1 do
               let left, next, leftFuture = histories.[i]
               for j in i + 1 .. histories.Length - 1 do
                   let right, otherNext, rightFuture = histories.[j]
                   if next = otherNext && leftFuture <> rightFuture then
                       yield { Left = left; Right = right; NextProbability = Array.map PredictiveState.wire next
                               LeftFuture = leftFuture |> Array.map (fun (n, d) -> PredictiveState.ratio n d)
                               RightFuture = rightFuture |> Array.map (fun (n, d) -> PredictiveState.ratio n d) } |]
        |> Array.truncate 128

    let intervene name model =
        if SmallRnn.alphabet model <> 2 then Error "interventions require a binary network"
        else
            let rows = pairs ()
            if rows.Length <> 128 then Error "the registered 128 intervention pairs do not exist"
            else
                rows |> Array.map (fun row ->
                    SmallRnn.after model row.Left |> Result.bind (fun (left, _) ->
                    SmallRnn.after model row.Right |> Result.map (fun (right, _) ->
                        let divergence state truth =
                            let probabilities = Array.zeroCreate 2
                            SmallRnn.outputInto model state 0 probabilities 0 |> ignore
                            future3 (SmallRnn.stepUnchecked model) state probabilities |> kl truth
                        let intact = (divergence left row.LeftFuture + divergence right row.RightFuture) / 2.0
                        let identity = (divergence (Array.copy left) row.LeftFuture + divergence (Array.copy right) row.RightFuture) / 2.0
                        let midpoint = Array.map2 (fun a b -> (a + b) / 2.0) left right
                        let merged = (divergence midpoint row.LeftFuture + divergence midpoint row.RightFuture) / 2.0
                        intact, identity, merged))) |> collect |> Result.bind (fun values ->
                            let changes = values |> Array.map (fun (a, _, b) -> b - a)
                            if Array.exists (fun (a, b, c) -> not (Double.IsFinite a && Double.IsFinite b && Double.IsFinite c)) values then Error "non-finite intervention score"
                            else Ok { Model = name; Pairs = rows.Length; IntactKlBits = values |> Array.averageBy (fun (a, _, _) -> a)
                                      IdentityKlBits = values |> Array.averageBy (fun (_, b, _) -> b); MidpointKlBits = values |> Array.averageBy (fun (_, _, c) -> c); Changes = changes })
