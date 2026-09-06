namespace Zeta.Research

open System
open Zeta.Core

/// Bounded, exact reproduction of two processes in Riechers et al., arXiv:2505.18373v2, Fig. 1.
/// No model is trained here. All probabilities use the explicitly chosen parameter p = 1/2.
[<RequireQualifiedAccess>]
module SimplexBeliefComparison =
    module Q = ProbabilitySemiring

    type Process = GoldenMean | Even
    type Coordinates = Native | Signed | ClippedSigned

    [<Literal>]
    let MaximumHistory = 10

    type Prediction =
        { WordProbability: Q.Rational
          Belief: Q.Rational list
          Next: Q.Rational list }

    type EntropyRow =
        { Position: int
          SourceBits: float
          MemorylessCrossEntropyBits: float
          ConditionalKlBits: float }

    type ProcessReceipt =
        { Process: string
          Histories: int
          Possible: int
          Impossible: int
          DenseMismatches: int
          AnalyticMismatches: int
          SignedMismatches: int
          ClippedSignedMismatches: int
          DistinctBeliefs: int
          Entropy: EntropyRow list }

    let private ring = Q.RationalRing.Instance
    let private half = Q.rat 1L 2L
    let private prior = [ 0, Q.rat 2L 3L; 1, Q.rat 1L 3L ]
    let private states = [ 0; 1 ]
    let private symbols = [ 0; 1 ]
    let private isZero (q: Q.Rational) = q.Num = 0L
    let private number (q: Q.Rational) = float q.Num / float q.Den
    let private sum values = List.fold Q.add Q.zero values
    let private consolidate values = WSet.consolidate ring isZero values
    let private dense values =
        let values = Map.ofList values
        states |> List.map (fun state -> Map.tryFind state values |> Option.defaultValue Q.zero)

    // Row-vector convention: eta' = eta T_x. The sparse and dense descriptions are separate.
    let private edges source symbol state =
        match source, symbol, state with
        | _, 0, 0 -> [ (0, half) ]
        | _, 1, 0 -> [ (1, half) ]
        | GoldenMean, 0, 1 -> [ (0, Q.one) ]
        | Even, 1, 1 -> [ (0, Q.one) ]
        | _ -> []

    let private matrix source symbol =
        match source, symbol with
        | GoldenMean, 0 -> [| [| half; Q.zero |]; [| Q.one; Q.zero |] |]
        | GoldenMean, _ -> [| [| Q.zero; half |]; [| Q.zero; Q.zero |] |]
        | Even, 0 -> [| [| half; Q.zero |]; [| Q.zero; Q.zero |] |]
        | Even, _ -> [| [| Q.zero; half |]; [| Q.one; Q.zero |] |]

    let private multiply (left: Q.Rational[][]) (right: Q.Rational[][]) =
        left |> Array.map (fun row -> Q.forwardStep row right)

    // C 1 = 1, so the terminal covector remains 1 after eta -> eta C.
    // Signed coordinates are not probabilities: pure state B becomes [-1, 2].
    let private change = [| [| Q.one; Q.zero |]; [| Q.ofInt -1L; Q.ofInt 2L |] |]
    let private inverse = [| [| Q.one; Q.zero |]; [| half; half |] |]

    let private transformed source symbol = multiply (multiply inverse (matrix source symbol)) change

    let private rowEdges (rows: Q.Rational[][]) state =
        states |> List.map (fun destination -> destination, rows.[state].[destination])

    let private operator source coordinates symbol =
        match coordinates with
        | Native -> edges source symbol
        | Signed -> rowEdges (transformed source symbol)
        | ClippedSigned ->
            transformed source symbol
            |> Array.map (Array.map (fun q -> if q.Num < 0L then Q.zero else q))
            |> rowEdges

    let private advance op values = values |> WSet.apply ring op |> consolidate

    let private initial = function
        | Native -> prior
        | Signed | ClippedSigned -> advance (rowEdges change) prior

    let private predictUnchecked source coordinates tokens =
        let weights = tokens |> List.fold (fun state token -> advance (operator source coordinates token) state) (initial coordinates)
        let mass = WSet.discard ring weights

        if isZero mass then None
        else
            let normalized = weights |> List.map (fun (key, value) -> key, Q.div value mass)
            let belief =
                match coordinates with
                | Native -> normalized
                | Signed | ClippedSigned -> advance (rowEdges inverse) normalized

            Some
                { WordProbability = mass
                  Belief = dense belief
                  Next = symbols |> List.map (fun token -> normalized |> advance (operator source coordinates token) |> WSet.discard ring) }

    /// The bound keeps the existing int64 rational arithmetic within range for these fixed matrices.
    /// It is not an arbitrary-length inference API; unsupported symbols and larger histories refuse.
    let predict source coordinates tokens : Result<Prediction option, string> =
        if List.length tokens > MaximumHistory then Error "history exceeds the checked exact-arithmetic bound of 10"
        elif tokens |> List.exists (fun token -> token <> 0 && token <> 1) then Error "tokens must be 0 or 1"
        else Ok(predictUnchecked source coordinates tokens)

    let private densePrediction source tokens =
        let weights = tokens |> List.fold (fun state token -> Q.forwardStep state (matrix source token)) [| Q.rat 2L 3L; Q.rat 1L 3L |]
        let mass = Array.fold Q.add Q.zero weights
        if isZero mass then None
        else
            let belief = weights |> Array.map (fun weight -> Q.div weight mass)
            Some
                { WordProbability = mass
                  Belief = List.ofArray belief
                  Next = symbols |> List.map (fun token -> Q.forwardStep belief (matrix source token) |> Array.fold Q.add Q.zero) }

    // Independent closed-form predictor: last token for Golden Mean; trailing-one parity for Even.
    // This path never reads the matrices or calls WSet or forwardStep.
    let private analyticBelief source history =
        match source, List.rev history with
        | _, [] -> [ Q.rat 2L 3L; Q.rat 1L 3L ]
        | GoldenMean, 0 :: _ -> [ Q.one; Q.zero ]
        | GoldenMean, _ -> [ Q.zero; Q.one ]
        | Even, reversed ->
            let trailing = reversed |> List.takeWhile ((=) 1) |> List.length
            if List.contains 0 history then
                if trailing % 2 = 0 then [ Q.one; Q.zero ] else [ Q.zero; Q.one ]
            elif trailing % 2 = 0 then [ Q.rat 2L 3L; Q.rat 1L 3L ]
            else [ half; half ]

    let private analyticNext source history =
        let belief = analyticBelief source history
        let a, b = belief.[0], belief.[1]
        let zero = if source = GoldenMean then Q.add (Q.mul a half) b else Q.mul a half
        [ zero; Q.add Q.one (Q.negate zero) ]

    let private analyticPrediction source tokens =
        let mass, _ =
            tokens |> List.fold (fun (mass, history) token ->
                Q.mul mass (analyticNext source history).[token], history @ [ token ]) (Q.one, [])
        if isZero mass then None
        else Some { WordProbability = mass; Belief = analyticBelief source tokens; Next = analyticNext source tokens }

    let rec private words length =
        if length = 0 then [ [] ]
        else [ for prefix in words (length - 1) do for token in symbols -> prefix @ [ token ] ]

    let private entropy probabilities =
        probabilities |> List.sumBy (fun q -> if isZero q then 0.0 else -(number q) * Math.Log2(number q))

    let private entropyRow source length =
        let baseline = analyticNext source []
        let source, crossEntropy, kl =
            words length
            |> List.choose (fun history -> predictUnchecked source Native history)
            |> List.fold (fun (h, c, kl) prediction ->
                let pairs = List.zip prediction.Next baseline
                let cross = pairs |> List.sumBy (fun (q, p) -> if isZero q then 0.0 else -(number q) * Math.Log2(number p))
                let divergence = pairs |> List.sumBy (fun (q, p) -> if isZero q then 0.0 else number q * Math.Log2(number q / number p))
                let weight = number prediction.WordProbability
                h + weight * entropy prediction.Next, c + weight * cross, kl + weight * divergence) (0.0, 0.0, 0.0)
        { Position = length + 1; SourceBits = source; MemorylessCrossEntropyBits = crossEntropy; ConditionalKlBits = kl }

    /// Enumerate every binary history, including impossible ones; no cherry-picked sample stream.
    let run maximumHistory : Result<ProcessReceipt list, string> =
        if maximumHistory < 0 || maximumHistory > MaximumHistory then Error "maximumHistory must be in [0, 10]"
        else
            [ GoldenMean; Even ]
            |> List.map (fun source ->
                let histories = [ for length in 0 .. maximumHistory do yield! words length ]
                let outcomes = histories |> List.map (fun history -> history, predictUnchecked source Native history)
                let mismatches predictor = outcomes |> List.filter (fun (history, native) -> predictor history <> native) |> List.length
                let possible = outcomes |> List.choose snd
                { Process = if source = GoldenMean then "golden-mean-p-half" else "even-p-half"
                  Histories = histories.Length
                  Possible = possible.Length
                  Impossible = histories.Length - possible.Length
                  DenseMismatches = mismatches (densePrediction source)
                  AnalyticMismatches = mismatches (analyticPrediction source)
                  SignedMismatches = mismatches (predictUnchecked source Signed)
                  ClippedSignedMismatches = mismatches (predictUnchecked source ClippedSigned)
                  DistinctBeliefs = possible |> List.map _.Belief |> List.distinct |> List.length
                  Entropy = [ for length in 0 .. maximumHistory -> entropyRow source length ] })
            |> Ok

    /// Distinct joint distributions with identical marginals refute unrestricted product-to-sum recovery.
    let factorizationWitness () =
        let correlated = [ (0, 0), half; (1, 1), half ]
        let anticorrelated = [ (0, 1), half; (1, 0), half ]
        let marginals joint =
            consolidate (WSet.mapKeys fst joint), consolidate (WSet.mapKeys snd joint)
        let left, right = marginals correlated
        let rebuilt = WSet.tensor ring left right |> consolidate
        let rebuiltLeft, rebuiltRight = marginals rebuilt
        let independentRoundTrip = consolidate (WSet.tensor ring rebuiltLeft rebuiltRight) = rebuilt
        marginals correlated = marginals anticorrelated, correlated <> anticorrelated, rebuilt <> correlated, independentRoundTrip
