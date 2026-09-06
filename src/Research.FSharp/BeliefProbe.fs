namespace Zeta.Research

open System

/// Supervised analysis of frozen activations, not part of the token-only learner.
[<RequireQualifiedAccess>]
module BeliefProbe =
    type Fit = private { Mean: float[]; TargetMean: float[]; Slopes: float[][] }
    type Score = { MeanSquaredError: float; R2: float }

    let private validRows (rows: float[][]) width =
        not (isNull rows) && rows.Length > 0
        && Array.forall (fun (row: float[]) -> not (isNull row) && row.Length = width && Array.forall Double.IsFinite row) rows

    let private validTargets (rows: float[][]) =
        not (isNull rows) && rows.Length > 0 && not (isNull rows.[0])
        && rows.[0].Length >= 1 && rows.[0].Length <= 128 && validRows rows rows.[0].Length

    let fit ridge (features: float[][]) (targets: float[][]) =
        if isNull features || features.Length = 0 || isNull features.[0] || features.[0].Length < 1 || features.[0].Length > 128 then
            Error "probe needs nonempty feature rows of width 1 to 128"
        elif not (validRows features features.[0].Length && validTargets targets) || features.Length <> targets.Length then
            Error "probe needs aligned finite features and targets of width 1 to 128"
        elif not (Double.IsFinite ridge) || ridge <= 0.0 then Error "ridge must be positive and finite"
        else
            let n, d = features.Length, features.[0].Length
            let t = targets.[0].Length
            let mean = Array.init d (fun j -> Array.averageBy (fun (row: float[]) -> row.[j]) features)
            let targetMean = Array.init t (fun j -> Array.averageBy (fun (row: float[]) -> row.[j]) targets)
            let gram = Array.init d (fun _ -> Array.zeroCreate d)
            let cross = Array.init d (fun _ -> Array.zeroCreate t)
            for row in 0 .. n - 1 do
                for i in 0 .. d - 1 do
                    let x = features.[row].[i] - mean.[i]
                    for j in 0 .. d - 1 do gram.[i].[j] <- gram.[i].[j] + x * (features.[row].[j] - mean.[j]) / float n
                    for j in 0 .. t - 1 do cross.[i].[j] <- cross.[i].[j] + x * (targets.[row].[j] - targetMean.[j]) / float n
            for i in 0 .. d - 1 do gram.[i].[i] <- gram.[i].[i] + ridge
            // Cholesky solves the positive-definite ridge system; no matrix inverse is formed.
            let lower = Array.init d (fun _ -> Array.zeroCreate d)
            let mutable valid = true
            for i in 0 .. d - 1 do
                for j in 0 .. i do
                    let mutable value = gram.[i].[j]
                    for k in 0 .. j - 1 do value <- value - lower.[i].[k] * lower.[j].[k]
                    if i = j then
                        if value <= 0.0 || not (Double.IsFinite value) then valid <- false
                        else lower.[i].[j] <- sqrt value
                    elif lower.[j].[j] > 0.0 then lower.[i].[j] <- value / lower.[j].[j]
            if not valid then Error "probe ridge system is not numerically positive definite"
            else
                let slopes = Array.init d (fun _ -> Array.zeroCreate t)
                for target in 0 .. t - 1 do
                    let intermediate = Array.zeroCreate d
                    for i in 0 .. d - 1 do
                        let mutable value = cross.[i].[target]
                        for j in 0 .. i - 1 do value <- value - lower.[i].[j] * intermediate.[j]
                        intermediate.[i] <- value / lower.[i].[i]
                    for i in d - 1 .. -1 .. 0 do
                        let mutable value = intermediate.[i]
                        for j in i + 1 .. d - 1 do value <- value - lower.[j].[i] * slopes.[j].[target]
                        slopes.[i].[target] <- value / lower.[i].[i]
                if slopes |> Array.forall (Array.forall Double.IsFinite) then
                    Ok { Mean = mean; TargetMean = targetMean; Slopes = slopes }
                else Error "non-finite probe coefficients"

    let predict fit (features: float[][]) =
        if not (validRows features fit.Mean.Length) then Error "probe feature shape or values are invalid"
        else
            let predicted = features |> Array.map (fun row ->
                Array.init fit.TargetMean.Length (fun j ->
                    let mutable value = fit.TargetMean.[j]
                    for i in 0 .. fit.Mean.Length - 1 do value <- value + (row.[i] - fit.Mean.[i]) * fit.Slopes.[i].[j]
                    value))
            if predicted |> Array.forall (Array.forall Double.IsFinite) then Ok predicted
            else Error "non-finite probe prediction"

    let score (predictions: float[][]) (targets: float[][]) =
        if not (validTargets targets) || not (validRows predictions targets.[0].Length) || predictions.Length <> targets.Length then
            Error "probe score needs aligned finite target rows of width 1 to 128"
        elif targets |> Array.forall (fun row -> row = targets.[0]) then
            Error "R2 is undefined for a constant target"
        else
            let t = targets.[0].Length
            let mean = Array.init t (fun j -> Array.averageBy (fun (row: float[]) -> row.[j]) targets)
            let mutable error, total = 0.0, 0.0
            for row in 0 .. targets.Length - 1 do
                for j in 0 .. t - 1 do
                    error <- error + pown (predictions.[row].[j] - targets.[row].[j]) 2
                    total <- total + pown (targets.[row].[j] - mean.[j]) 2
            if not (Double.IsFinite error && Double.IsFinite total) then Error "non-finite probe score"
            elif total <= 0.0 then Error "R2 is undefined for a constant target"
            else
                let r2 = 1.0 - error / total
                if Double.IsFinite r2 then Ok { MeanSquaredError = error / (float t * float targets.Length); R2 = r2 }
                else Error "non-finite probe R2"
