namespace Zeta.Research

open System

[<RequireQualifiedAccess>]
module SmallRnnTraining =
    type Config = { Steps: int; Batch: int; SequenceSteps: int; LearningRate: float }
    type Progress = { Step: int; LossNats: float }
    type Receipt = { Model: SmallRnn.Model; Trace: Progress[]; TrainedTokens: int64 }

    let private valid config =
        config.Steps >= 1 && config.Steps <= 10000 && config.Batch >= 1 && config.Batch <= 64
        && config.SequenceSteps >= 1 && config.SequenceSteps <= 256
        && Double.IsFinite config.LearningRate && config.LearningRate > 0.0 && config.LearningRate <= 0.1

    /// Adam (arXiv:1412.6980), fixed beta1=.9, beta2=.999, epsilon=1e-8 and gradient norm cap=1.
    /// The only training-data port yields token sequences. No hidden-state labels enter this API.
    let train config (nextSequence: unit -> Result<int[], string>) (onProgress: Progress -> unit) initial =
        if not (valid config) then Error "training configuration exceeds the bounded research limits"
        else
            let model = SmallRnn.copy initial
            let parameters = SmallRnn.weights model
            let first = Array.zeroCreate parameters.Length
            let second = Array.zeroCreate parameters.Length
            let gradient = Array.zeroCreate parameters.Length
            let workspace = SmallRnn.Workspace(SmallRnn.alphabet model, SmallRnn.width model, config.SequenceSteps)
            let trace = ResizeArray<Progress>()
            let mutable failure = None
            let mutable step = 0
            let mutable beta1Power = 1.0
            let mutable beta2Power = 1.0
            while step < config.Steps && Option.isNone failure do
                Array.Clear gradient
                let mutable loss = 0.0
                let mutable batch = 0
                while batch < config.Batch && Option.isNone failure do
                    match nextSequence () with
                    | Error reason -> failure <- Some reason
                    | Ok tokens when not (SmallRnn.validTokens (SmallRnn.alphabet model) 2 tokens) || tokens.Length <> config.SequenceSteps + 1 ->
                        failure <- Some "training source returned an invalid sequence"
                    | Ok tokens -> loss <- loss + SmallRnn.accumulate model tokens workspace gradient
                    batch <- batch + 1
                if Option.isNone failure then
                    let denominator = float (config.Batch * config.SequenceSteps)
                    let mutable normSquared = 0.0
                    for i in 0 .. gradient.Length - 1 do
                        gradient.[i] <- gradient.[i] / denominator
                        normSquared <- normSquared + gradient.[i] * gradient.[i]
                    if not (Double.IsFinite loss && Double.IsFinite normSquared) then
                        failure <- Some "non-finite training loss or gradient norm"
                    else
                        step <- step + 1
                        beta1Power <- beta1Power * 0.9
                        beta2Power <- beta2Power * 0.999
                        let scale = 1.0 / max 1.0 (sqrt normSquared)
                        for i in 0 .. parameters.Length - 1 do
                            let g = gradient.[i] * scale
                            first.[i] <- 0.9 * first.[i] + 0.1 * g
                            second.[i] <- 0.999 * second.[i] + 0.001 * g * g
                            parameters.[i] <- parameters.[i] - config.LearningRate * (first.[i] / (1.0 - beta1Power)) / (sqrt (second.[i] / (1.0 - beta2Power)) + 1e-8)
                        if Array.exists (Double.IsFinite >> not) parameters then failure <- Some "non-finite updated parameters"
                        elif step = 1 || step % 512 = 0 || step = config.Steps then
                            let row = { Step = step; LossNats = loss / denominator }
                            trace.Add row
                            onProgress row
            match failure with
            | Some reason -> Error reason
            | None -> Ok { Model = model; Trace = trace.ToArray(); TrainedTokens = int64 config.Steps * int64 config.Batch * int64 config.SequenceSteps }
