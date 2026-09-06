namespace Zeta.Research

open System

/// Research-only tanh RNN. It consumes tokens, never generator states or belief labels.
[<RequireQualifiedAccess>]
module SmallRnn =
    type Model = private { Hidden: int; Weights: float[] }

    // Flat row-major layout: recurrent, input, hidden bias, output, output bias.
    let internal offsets h = h * h, h * h + 3 * h, h * h + 4 * h, h * h + 7 * h
    let internal parameterCount h = h * h + 7 * h + 3
    let width model = model.Hidden
    let parameters model = Array.copy model.Weights
    let internal weights model = model.Weights
    let internal copy model = { model with Weights = Array.copy model.Weights }

    let fromParameters hidden (values: float[]) =
        if hidden < 1 || hidden > 64 then Error "hidden width must be in [1, 64]"
        elif isNull values || values.Length <> parameterCount hidden || Array.exists (Double.IsFinite >> not) values then
            Error "parameters must have the declared shape and finite values"
        else Ok { Hidden = hidden; Weights = Array.copy values }

    let create hidden seed =
        if hidden < 1 || hidden > 64 then Error "hidden width must be in [1, 64]"
        else
            let rng = ResearchRandom.Stream seed
            let values = Array.zeroCreate (parameterCount hidden)
            let input, bias, output, outputBias = offsets hidden
            let fill start finish scale =
                for i in start .. finish - 1 do values.[i] <- (2.0 * rng.Next() - 1.0) * scale
            fill 0 input (sqrt (3.0 / float hidden))
            fill input bias (sqrt (6.0 / float (hidden + 3)))
            fill output outputBias (sqrt (6.0 / float (hidden + 3)))
            fromParameters hidden values

    let internal validTokens minimum (tokens: int[]) =
        not (isNull tokens) && tokens.Length >= minimum && tokens.Length <= 257
        && Array.forall (fun token -> token >= 0 && token < 3) tokens

    let internal hiddenInto model (previous: float[]) previousOffset token (target: float[]) targetOffset =
        let h = model.Hidden
        let w = model.Weights
        let input, bias, _, _ = offsets h
        for i in 0 .. h - 1 do
            let mutable value = w.[bias + i] + w.[input + i * 3 + token]
            for j in 0 .. h - 1 do value <- value + w.[i * h + j] * previous.[previousOffset + j]
            target.[targetOffset + i] <- Math.Tanh value

    /// Keep the maximum separate from log(sum(exp(logit - maximum))) to avoid large-offset cancellation.
    let internal outputInto model (hidden: float[]) offset (probabilities: float[]) probabilityOffset =
        let _, _, output, bias = offsets model.Hidden
        let mutable maximum = Double.NegativeInfinity
        for token in 0 .. 2 do
            let mutable value = model.Weights.[bias + token]
            for j in 0 .. model.Hidden - 1 do
                value <- value + model.Weights.[output + token * model.Hidden + j] * hidden.[offset + j]
            probabilities.[probabilityOffset + token] <- value
            maximum <- max maximum value
        let mutable total = 0.0
        for token in 0 .. 2 do
            total <- total + Math.Exp(probabilities.[probabilityOffset + token] - maximum)
        for token in 0 .. 2 do
            probabilities.[probabilityOffset + token] <- Math.Exp(probabilities.[probabilityOffset + token] - maximum) / total
        maximum, Math.Log total

    let internal afterUnchecked model tokens =
        let mutable state = Array.zeroCreate model.Hidden
        let mutable scratch = Array.zeroCreate model.Hidden
        for token in tokens do
            hiddenInto model state 0 token scratch 0
            let previous = state
            state <- scratch
            scratch <- previous
        let probabilities = Array.zeroCreate 3
        outputInto model state 0 probabilities 0 |> ignore
        state, probabilities

    let after model tokens =
        if not (validTokens 0 tokens) then Error "tokens must have length at most 257 and values in [0, 2]"
        else
            let state, probabilities = afterUnchecked model tokens
            if Array.forall Double.IsFinite state && Array.forall Double.IsFinite probabilities then Ok(state, probabilities)
            else Error "non-finite recurrent inference"

    let internal stepUnchecked model state token =
        let next = Array.zeroCreate model.Hidden
        hiddenInto model state 0 token next 0
        let probabilities = Array.zeroCreate 3
        outputInto model next 0 probabilities 0 |> ignore
        next, probabilities

    /// Private mutable scratch is reused within a training run; it never escapes as model state.
    type internal Workspace(hidden, steps) =
        member val States: float[] = Array.zeroCreate ((steps + 1) * hidden)
        member val Probabilities: float[] = Array.zeroCreate (steps * 3)
        member val Carry: float[] = Array.zeroCreate hidden
        member val Delta: float[] = Array.zeroCreate hidden
        member val OutputDelta: float[] = Array.zeroCreate 3

    let internal accumulate model (tokens: int[]) (workspace: Workspace) (gradient: float[]) =
        let h = model.Hidden
        let w = model.Weights
        let input, bias, output, outputBias = offsets h
        let states, probabilities = workspace.States, workspace.Probabilities
        let steps = tokens.Length - 1
        let mutable loss = 0.0
        for t in 0 .. steps - 1 do
            hiddenInto model states (t * h) tokens.[t] states ((t + 1) * h)
            let maximum, logTotal = outputInto model states ((t + 1) * h) probabilities (t * 3)
            let target = tokens.[t + 1]
            let mutable logit = w.[outputBias + target]
            for i in 0 .. h - 1 do logit <- logit + w.[output + target * h + i] * states.[(t + 1) * h + i]
            loss <- loss + (maximum - logit) + logTotal
        Array.Clear workspace.Carry
        for t in steps - 1 .. -1 .. 0 do
            for token in 0 .. 2 do
                let dy = probabilities.[t * 3 + token] - (if token = tokens.[t + 1] then 1.0 else 0.0)
                workspace.OutputDelta.[token] <- dy
                gradient.[outputBias + token] <- gradient.[outputBias + token] + dy
                for i in 0 .. h - 1 do
                    gradient.[output + token * h + i] <- gradient.[output + token * h + i] + dy * states.[(t + 1) * h + i]
            for i in 0 .. h - 1 do
                let mutable dh = workspace.Carry.[i]
                for token in 0 .. 2 do dh <- dh + workspace.OutputDelta.[token] * w.[output + token * h + i]
                let activation = states.[(t + 1) * h + i]
                let delta = dh * (1.0 - activation * activation)
                workspace.Delta.[i] <- delta
                gradient.[bias + i] <- gradient.[bias + i] + delta
                gradient.[input + i * 3 + tokens.[t]] <- gradient.[input + i * 3 + tokens.[t]] + delta
                for j in 0 .. h - 1 do
                    gradient.[i * h + j] <- gradient.[i * h + j] + delta * states.[t * h + j]
            for j in 0 .. h - 1 do
                let mutable value = 0.0
                for i in 0 .. h - 1 do value <- value + workspace.Delta.[i] * w.[i * h + j]
                workspace.Carry.[j] <- value
        loss

    let lossGradient model tokens =
        if not (validTokens 2 tokens) then Error "training sequence must have 2 to 257 tokens in [0, 2]"
        else
            let steps = tokens.Length - 1
            let workspace = Workspace(model.Hidden, steps)
            let gradient = Array.zeroCreate model.Weights.Length
            let loss = accumulate model tokens workspace gradient / float steps
            for i in 0 .. gradient.Length - 1 do gradient.[i] <- gradient.[i] / float steps
            if Double.IsFinite loss && Array.forall Double.IsFinite gradient then Ok(loss, gradient)
            else Error "non-finite loss or gradient"
