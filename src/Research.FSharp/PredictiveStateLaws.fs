namespace Zeta.Research

open System

[<RequireQualifiedAccess>]
module PredictiveStateLaws =
    type LossRow =
        { Length: int; Predictor: string; Entropy: float; CrossEntropy: float; Kl: float
          ChainEntropy: float; ChainCrossEntropy: float; ChainKl: float; ProbabilityMass: float }
    type Receipt = { Model: string; Losses: LossRow[]; Closure: PredictiveState.Closure; EntropyCurve: float[] }

    let internal words alphabet length =
        Array.init (pown alphabet length) (fun index -> Array.init length (fun j -> index / pown alphabet (length - 1 - j) % alphabet))

    let crossEntropy (actual: float[]) (predicted: float[]) =
        let valid (p: float[]) =
            not (isNull p) && p.Length > 0 && Array.forall (fun x -> Double.IsFinite x && x >= 0.0) p && abs (Array.sum p - 1.0) < 1e-10
        if not (valid actual && valid predicted) || actual.Length <> predicted.Length then Error "invalid probability distributions"
        elif Array.exists2 (fun p q -> p > 0.0 && q = 0.0) actual predicted then Error "possible event has zero predicted mass"
        else Ok(Array.map2 (fun p q -> if p = 0.0 then 0.0 else -p * Math.Log2 q) actual predicted |> Array.sum)

    let private losses maxLength model =
        let rows = ResizeArray<LossRow>()
        let mutable failure = None
        for predictor, fixedOne in [ "known-model", None; "bernoulli-half", Some 0.5; "bernoulli-third", Some(1.0 / 3.0) ] do
            let mutable chainH, chainC, chainKl = 0.0, 0.0, 0.0
            for length in 1 .. maxLength do
                for history in words 2 (length - 1) do
                    match PredictiveState.filter model history with
                    | Error PredictiveState.ImpossibleObservation -> ()
                    | Error reason -> failure <- Some reason
                    | Ok(belief, (n, d)) ->
                        let mass = PredictiveState.ratio n d
                        let p = PredictiveState.probabilities model belief
                        let q = match fixedOne with None -> p | Some one -> [| 1.0 - one; one |]
                        for token in 0 .. 1 do
                            if p.[token] > 0.0 then
                                chainH <- chainH - mass * p.[token] * Math.Log2 p.[token]
                                chainC <- chainC - mass * p.[token] * Math.Log2 q.[token]
                                chainKl <- chainKl + mass * p.[token] * Math.Log2(p.[token] / q.[token])
                let mutable h, c, kl, mass = 0.0, 0.0, 0.0, 0.0
                for word in words 2 length do
                    let n, d = PredictiveState.wordProbability model word
                    let p = PredictiveState.ratio n d
                    if p > 0.0 then
                        let q = match fixedOne with None -> p | Some one -> word |> Array.fold (fun acc token -> acc * (if token = 1 then one else 1.0 - one)) 1.0
                        mass <- mass + p
                        h <- h - p * Math.Log2 p
                        c <- c - p * Math.Log2 q
                        kl <- kl + p * Math.Log2(p / q)
                rows.Add { Length = length; Predictor = predictor; Entropy = h; CrossEntropy = c; Kl = kl
                           ChainEntropy = chainH; ChainCrossEntropy = chainC; ChainKl = chainKl; ProbabilityMass = mass }
        match failure with Some reason -> Error reason | None -> Ok(rows.ToArray())

    let run maxLength model =
        if maxLength < 1 || maxLength > 12 || PredictiveState.alphabet model <> 2 then Error(PredictiveState.InvalidInput "loss enumeration requires binary models and length 1 to 12")
        else
            PredictiveState.closure 128 4096 model |> Result.bind (fun closure ->
                PredictiveState.entropyCurve 64 closure |> Result.bind (fun curve ->
                    losses maxLength model |> Result.map (fun rows ->
                        { Model = PredictiveState.name model; Losses = rows; Closure = closure; EntropyCurve = curve })))
