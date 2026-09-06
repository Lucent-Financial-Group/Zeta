namespace Zeta.Research

open System
open System.Numerics

/// Bounded, edge-emitting finite-state research models; not a database runtime port.
[<RequireQualifiedAccess>]
module PredictiveState =
    type Model = private { Name: string; Denominator: int; Edges: int[][][]; Prior: bigint[] }
    type Fraction = { Numerator: string; Denominator: string }
    type Edge = { Source: int; Symbol: int; Destination: int; Probability: Fraction }
    type Closure = { Beliefs: string[][]; Edges: Edge[]; Matrix: float[][]; Entropy: float[] }
    type Refusal = InvalidInput of string | ImpossibleObservation | ClosureBudget of states: int * transitions: int

    let private canonical (weights: bigint[]) =
        let divisor = Array.fold (fun a b -> BigInteger.GreatestCommonDivisor(a, b)) 0I weights
        weights |> Array.map (fun n -> n / divisor)

    let internal fraction n d =
        let divisor = BigInteger.GreatestCommonDivisor(n, d)
        n / divisor, d / divisor

    let internal ratio (n: bigint) (d: bigint) =
        if n.IsZero then 0.0
        else
            let sn = max 0 (int (n.GetBitLength()) - 53)
            let sd = max 0 (int (d.GetBitLength()) - 53)
            Math.ScaleB(float (n >>> sn) / float (d >>> sd), sn - sd)

    let internal wire (n: bigint, d: bigint) =
        { Numerator = n.ToString(Globalization.CultureInfo.InvariantCulture)
          Denominator = d.ToString(Globalization.CultureInfo.InvariantCulture) }

    let create name denominator (edges: int[][][]) (prior: int[]) =
        if String.IsNullOrWhiteSpace name || denominator < 1 || denominator > 128
           || isNull prior || prior.Length < 1 || prior.Length > 16
           || Array.exists (fun x -> x < 0 || x > 128) prior || Array.sum prior = 0 then
            Error(InvalidInput "invalid model name, denominator, or prior")
        elif isNull edges || edges.Length < 2 || edges.Length > 16
             || edges |> Array.exists (fun matrix ->
                 isNull matrix || matrix.Length <> prior.Length || matrix |> Array.exists (fun row ->
                     isNull row || row.Length <> prior.Length || row |> Array.exists (fun x -> x < 0 || x > denominator))) then
            Error(InvalidInput "transition matrices have invalid shape or entries")
        elif [| 0 .. prior.Length - 1 |] |> Array.exists (fun i -> edges |> Array.sumBy (fun matrix -> Array.sum matrix.[i]) <> denominator) then
            Error(InvalidInput "outgoing probabilities must sum to one")
        else
            Ok { Name = name; Denominator = denominator; Edges = edges |> Array.map (Array.map Array.copy)
                 Prior = prior |> Array.map bigint |> canonical }

    // Literal fixtures are kept private and cannot be mutated through the model surface.
    let private fixture name denominator edges (prior: int[]) =
        { Name = name; Denominator = denominator; Edges = edges; Prior = prior |> Array.map bigint |> canonical }
    let coin = fixture "biased-coin" 4 [| [| [| 3 |] |]; [| [| 1 |] |] |] [| 1 |]
    let goldenMean = fixture "golden-mean" 2 [| [| [| 0; 1 |]; [| 0; 0 |] |]; [| [| 1; 0 |]; [| 2; 0 |] |] |] [| 2; 1 |]
    let even = fixture "even" 2 [| [| [| 1; 0 |]; [| 0; 0 |] |]; [| [| 0; 1 |]; [| 2; 0 |] |] |] [| 2; 1 |]
    let rrxor =
        fixture "rrxor" 2
            [| [| [| 0; 1; 0; 0; 0 |]; [| 0; 0; 0; 0; 1 |]; [| 0; 0; 0; 1; 0 |]; [| 0; 0; 0; 0; 0 |]; [| 2; 0; 0; 0; 0 |] |]
               [| [| 0; 0; 1; 0; 0 |]; [| 0; 0; 0; 1; 0 |]; [| 0; 0; 0; 0; 1 |]; [| 2; 0; 0; 0; 0 |]; [| 0; 0; 0; 0; 0 |] |] |]
            [| 2; 1; 1; 1; 1 |]
    let lagTwoCopy =
        let edges = Array.init 2 (fun symbol -> Array.init 4 (fun state ->
            Array.init 4 (fun destination ->
                if destination = 2 * (state % 2) + symbol then (if symbol = state / 2 then 3 else 1) else 0)))
        fixture "lag-two-copy" 4 edges [| 1; 1; 1; 1 |]
    let fixtures = [| coin; goldenMean; even; rrxor; lagTwoCopy |]
    let name model = model.Name
    let internal prior model = Array.copy model.Prior
    let internal alphabet (model: Model) = model.Edges.Length
    let internal advanceExact (model: Model) (belief: bigint[]) token =
        let next = Array.init belief.Length (fun j ->
            Array.mapi (fun i n -> n * bigint model.Edges.[token].[i].[j]) belief |> Array.sum)
        let mass = Array.sum next
        if mass.IsZero then None
        else Some(fraction mass (Array.sum belief * bigint model.Denominator), canonical next)

    let internal nextExact model belief =
        Array.init (alphabet model) (fun token ->
            match advanceExact model belief token with Some(p, _) -> p | None -> 0I, 1I)

    let internal probabilities model belief = nextExact model belief |> Array.map (fun (n, d) -> ratio n d)
    let internal wordProbability model tokens =
        let mutable weights = prior model
        for token in tokens do
            weights <- Array.init weights.Length (fun j -> Array.mapi (fun i n -> n * bigint model.Edges.[token].[i].[j]) weights |> Array.sum)
        fraction (Array.sum weights) (Array.sum model.Prior * BigInteger.Pow(bigint model.Denominator, Array.length tokens))
    let internal entropy probabilities =
        probabilities |> Array.sumBy (fun p -> if p = 0.0 then 0.0 else -p * Math.Log2 p)

    let filter model tokens =
        if not (SmallRnn.validTokens (alphabet model) 0 tokens) || tokens.Length > 256 then
            Error(InvalidInput "filter requires at most 256 symbols from the declared alphabet")
        else
            let mutable belief = prior model
            let mutable probability = 1I, 1I
            for token in tokens do
                if fst probability <> 0I then
                    match advanceExact model belief token with
                    | None -> probability <- 0I, 1I
                    | Some((n, d), updated) ->
                        probability <- fraction (fst probability * n) (snd probability * d)
                        belief <- updated
            if fst probability = 0I then Error ImpossibleObservation
            else Ok(belief, probability)

    let internal futureExact model depth belief =
        let rec visit remaining state mass =
            if remaining = 0 then [| mass |]
            else
                [| for token in 0 .. alphabet model - 1 do
                       match advanceExact model state token with
                       | None -> yield! Array.create (pown (alphabet model) (remaining - 1)) (0I, 1I)
                       | Some((n, d), updated) -> yield! visit (remaining - 1) updated (fraction (fst mass * n) (snd mass * d)) |]
        visit depth belief (1I, 1I)

    let closure maxStates maxTransitions model =
        if maxStates < 1 || maxStates > 128 || maxTransitions < 1 || maxTransitions > 4096 then
            Error(InvalidInput "closure caps must be in [1,128] states and [1,4096] transitions")
        else
            let states = ResizeArray<bigint[]>()
            states.Add(prior model)
            let mutable indices = Map.ofList [ (Array.toList model.Prior, 0) ]
            let edges = ResizeArray<Edge>()
            let mutable cursor = 0
            let mutable exhausted = false
            while cursor < states.Count && not exhausted do
                for token in 0 .. alphabet model - 1 do
                    if not exhausted then
                        match advanceExact model states.[cursor] token with
                        | None -> ()
                        | Some(probability, next) ->
                            let key = Array.toList next
                            let found = Map.tryFind key indices
                            if edges.Count >= maxTransitions || (Option.isNone found && states.Count >= maxStates) then exhausted <- true
                            else
                                let destination =
                                    match found with
                                    | Some index -> index
                                    | None ->
                                        let index = states.Count
                                        indices <- Map.add key index indices
                                        states.Add next
                                        index
                                edges.Add { Source = cursor; Symbol = token; Destination = destination; Probability = wire probability }
                cursor <- cursor + 1
            if exhausted then Error(ClosureBudget(states.Count, edges.Count))
            else
                let matrix = Array.init states.Count (fun _ -> Array.zeroCreate states.Count)
                for edge in edges do
                    let p = nextExact model states.[edge.Source] |> Array.item edge.Symbol
                    matrix.[edge.Source].[edge.Destination] <- matrix.[edge.Source].[edge.Destination] + ratio (fst p) (snd p)
                Ok { Beliefs = states |> Seq.map (Array.map (fun n -> n.ToString(Globalization.CultureInfo.InvariantCulture))) |> Seq.toArray
                     Edges = edges.ToArray(); Matrix = matrix; Entropy = states |> Seq.map (probabilities model >> entropy) |> Seq.toArray }

    let entropyCurve length closure =
        if length < 1 || length > 256 then Error(InvalidInput "entropy curve length must be in [1,256]")
        elif isNull closure.Matrix || isNull closure.Entropy || closure.Matrix.Length = 0 || closure.Matrix.Length > 128
             || closure.Matrix.Length <> closure.Entropy.Length
             || closure.Matrix |> Array.exists (fun row -> isNull row || row.Length <> closure.Entropy.Length || Array.exists (fun p -> not (Double.IsFinite p) || p < 0.0) row || abs (Array.sum row - 1.0) > 1e-10)
             || closure.Entropy |> Array.exists (fun h -> not (Double.IsFinite h) || h < 0.0) then
            Error(InvalidInput "invalid stochastic matrix or entropy vector")
        else
            let mutable distribution = Array.init closure.Matrix.Length (fun i -> if i = 0 then 1.0 else 0.0)
            Ok(Array.init length (fun _ ->
                let h = Array.map2 (*) distribution closure.Entropy |> Array.sum
                distribution <- Array.init distribution.Length (fun j -> Array.mapi (fun i p -> p * closure.Matrix.[i].[j]) distribution |> Array.sum)
                h))

    /// Independent observation generator: fair-bit, fair-bit, XOR blocks and a uniform random phase.
    let sampleRrxor (stream: ResearchRandom.Stream) length =
        if length < 1 || length > 257 then Error(InvalidInput "sample length must be in [1,257]")
        else
            let phase = int (stream.Next() * 3.0)
            let mutable a, b = int (stream.Next() * 2.0), int (stream.Next() * 2.0)
            let tokens = Array.zeroCreate length
            for i in 0 .. length + phase - 1 do
                let bit = match i % 3 with 0 -> a | 1 -> b | _ -> a ^^^ b
                if i >= phase then tokens.[i - phase] <- bit
                if i % 3 = 2 then
                    a <- int (stream.Next() * 2.0)
                    b <- int (stream.Next() * 2.0)
            Ok tokens
