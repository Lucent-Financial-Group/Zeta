namespace Zeta.Research

open System

/// Research-only tanh RNN. It consumes tokens, never generator states or belief labels.
[<RequireQualifiedAccess>]
module SmallRnn =
    type Model = private { Alphabet: int; Hidden: int; Weights: float[] }

    // Flat row-major layout: recurrent, input, hidden bias, output, output bias.
    let internal offsets a h = h * h, h * h + a * h, h * h + (a + 1) * h, h * h + (2 * a + 1) * h
    let internal parameterCount a h = h * h + (2 * a + 1) * h + a
    let alphabet model = model.Alphabet
    let width model = model.Hidden
    let parameters model = Array.copy model.Weights
    let internal weights model = model.Weights
    let internal copy model = { model with Weights = Array.copy model.Weights }

    let fromParameters alphabet hidden (values: float[]) =
        if alphabet < 2 || alphabet > 16 then Error "alphabet size must be in [2, 16]"
        elif hidden < 1 || hidden > 64 then Error "hidden width must be in [1, 64]"
        elif isNull values || values.Length <> parameterCount alphabet hidden || Array.exists (Double.IsFinite >> not) values then
            Error "parameters must have the declared shape and finite values"
        else Ok { Alphabet = alphabet; Hidden = hidden; Weights = Array.copy values }

    let create alphabet hidden seed =
        if alphabet < 2 || alphabet > 16 then Error "alphabet size must be in [2, 16]"
        elif hidden < 1 || hidden > 64 then Error "hidden width must be in [1, 64]"
        else
            let rng = ResearchRandom.Stream seed
            let values = Array.zeroCreate (parameterCount alphabet hidden)
            let input, bias, output, outputBias = offsets alphabet hidden
            let fill start finish scale =
                for i in start .. finish - 1 do values.[i] <- (2.0 * rng.Next() - 1.0) * scale
            fill 0 input (sqrt (3.0 / float hidden))
            fill input bias (sqrt (6.0 / float (hidden + alphabet)))
            fill output outputBias (sqrt (6.0 / float (hidden + alphabet)))
            fromParameters alphabet hidden values

    let internal validTokens alphabet minimum (tokens: int[]) =
        not (isNull tokens) && tokens.Length >= minimum && tokens.Length <= 257
        && Array.forall (fun token -> token >= 0 && token < alphabet) tokens

    let internal hiddenInto model (previous: float[]) previousOffset token (target: float[]) targetOffset =
        let h = model.Hidden
        let w = model.Weights
        let input, bias, _, _ = offsets model.Alphabet h
        for i in 0 .. h - 1 do
            let mutable value = w.[bias + i] + w.[input + i * model.Alphabet + token]
            for j in 0 .. h - 1 do value <- value + w.[i * h + j] * previous.[previousOffset + j]
            target.[targetOffset + i] <- Math.Tanh value

    /// Keep the maximum separate from log(sum(exp(logit - maximum))) to avoid large-offset cancellation.
    let internal outputInto model (hidden: float[]) offset (probabilities: float[]) probabilityOffset =
        let _, _, output, bias = offsets model.Alphabet model.Hidden
        let mutable maximum = Double.NegativeInfinity
        for token in 0 .. model.Alphabet - 1 do
            let mutable value = model.Weights.[bias + token]
            for j in 0 .. model.Hidden - 1 do
                value <- value + model.Weights.[output + token * model.Hidden + j] * hidden.[offset + j]
            probabilities.[probabilityOffset + token] <- value
            maximum <- max maximum value
        let mutable total = 0.0
        for token in 0 .. model.Alphabet - 1 do
            total <- total + Math.Exp(probabilities.[probabilityOffset + token] - maximum)
        for token in 0 .. model.Alphabet - 1 do
            probabilities.[probabilityOffset + token] <- Math.Exp(probabilities.[probabilityOffset + token] - maximum) / total
        maximum, Math.Log total

    let internal afterUnchecked model (tokens: int[]) =
        let mutable state = Array.zeroCreate model.Hidden
        let mutable scratch = Array.zeroCreate model.Hidden
        for token in tokens do
            hiddenInto model state 0 token scratch 0
            let previous = state
            state <- scratch
            scratch <- previous
        let probabilities = Array.zeroCreate model.Alphabet
        outputInto model state 0 probabilities 0 |> ignore
        state, probabilities

    let after model tokens =
        if not (validTokens model.Alphabet 0 tokens) then Error "tokens must have length at most 257 and belong to the declared alphabet"
        else
            let state, probabilities = afterUnchecked model tokens
            if Array.forall Double.IsFinite state && Array.forall Double.IsFinite probabilities then Ok(state, probabilities)
            else Error "non-finite recurrent inference"

    let internal stepUnchecked model state token =
        let next = Array.zeroCreate model.Hidden
        hiddenInto model state 0 token next 0
        let probabilities = Array.zeroCreate model.Alphabet
        outputInto model next 0 probabilities 0 |> ignore
        next, probabilities

    /// Private mutable scratch is reused within a training run; it never escapes as model state.
    type internal Workspace(alphabet, hidden, steps) =
        member val States: float[] = Array.zeroCreate ((steps + 1) * hidden)
        member val Probabilities: float[] = Array.zeroCreate (steps * alphabet)
        member val Carry: float[] = Array.zeroCreate hidden
        member val Delta: float[] = Array.zeroCreate hidden
        member val OutputDelta: float[] = Array.zeroCreate alphabet

    let internal accumulate model (tokens: int[]) (workspace: Workspace) (gradient: float[]) =
        let h = model.Hidden
        let w = model.Weights
        let a = model.Alphabet
        let input, bias, output, outputBias = offsets a h
        let states, probabilities = workspace.States, workspace.Probabilities
        let steps = tokens.Length - 1
        let mutable loss = 0.0
        for t in 0 .. steps - 1 do
            hiddenInto model states (t * h) tokens.[t] states ((t + 1) * h)
            let maximum, logTotal = outputInto model states ((t + 1) * h) probabilities (t * a)
            let target = tokens.[t + 1]
            let mutable logit = w.[outputBias + target]
            for i in 0 .. h - 1 do logit <- logit + w.[output + target * h + i] * states.[(t + 1) * h + i]
            loss <- loss + (maximum - logit) + logTotal
        Array.Clear workspace.Carry
        for t in steps - 1 .. -1 .. 0 do
            for token in 0 .. a - 1 do
                let dy = probabilities.[t * a + token] - (if token = tokens.[t + 1] then 1.0 else 0.0)
                workspace.OutputDelta.[token] <- dy
                gradient.[outputBias + token] <- gradient.[outputBias + token] + dy
                for i in 0 .. h - 1 do
                    gradient.[output + token * h + i] <- gradient.[output + token * h + i] + dy * states.[(t + 1) * h + i]
            for i in 0 .. h - 1 do
                let mutable dh = workspace.Carry.[i]
                for token in 0 .. a - 1 do dh <- dh + workspace.OutputDelta.[token] * w.[output + token * h + i]
                let activation = states.[(t + 1) * h + i]
                let delta = dh * (1.0 - activation * activation)
                workspace.Delta.[i] <- delta
                gradient.[bias + i] <- gradient.[bias + i] + delta
                gradient.[input + i * a + tokens.[t]] <- gradient.[input + i * a + tokens.[t]] + delta
                for j in 0 .. h - 1 do
                    gradient.[i * h + j] <- gradient.[i * h + j] + delta * states.[t * h + j]
            for j in 0 .. h - 1 do
                let mutable value = 0.0
                for i in 0 .. h - 1 do value <- value + workspace.Delta.[i] * w.[i * h + j]
                workspace.Carry.[j] <- value
        loss

    let lossGradient model tokens =
        if not (validTokens model.Alphabet 2 tokens) then Error "training sequence must have 2 to 257 tokens in the declared alphabet"
        else
            let steps = tokens.Length - 1
            let workspace = Workspace(model.Alphabet, model.Hidden, steps)
            let gradient = Array.zeroCreate model.Weights.Length
            let loss = accumulate model tokens workspace gradient / float steps
            for i in 0 .. gradient.Length - 1 do gradient.[i] <- gradient.[i] / float steps
            if Double.IsFinite loss && Array.forall Double.IsFinite gradient then Ok(loss, gradient)
            else Error "non-finite loss or gradient"
