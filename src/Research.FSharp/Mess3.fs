namespace Zeta.Research

open System

/// Edge-emitting Mess3 from arXiv:2405.15943v2, Appendix A.3.
/// Binary64 normalized filtering, not the bounded exact-rational comparison.
[<RequireQualifiedAccess>]
module Mess3 =
    // Entry (symbol, source, destination), with common denominator 800.
    let private numerators =
        [| [| [| 612; 3; 3 |]; [| 34; 54; 3 |]; [| 34; 3; 54 |] |]
           [| [| 54; 34; 3 |]; [| 3; 612; 3 |]; [| 3; 34; 54 |] |]
           [| [| 54; 3; 34 |]; [| 3; 54; 34 |]; [| 3; 3; 612 |] |] |]

    let internal transition symbol source destination = float numerators.[symbol].[source].[destination] / 800.0
    let prior () = [| 1.0 / 3.0; 1.0 / 3.0; 1.0 / 3.0 |]

    let internal advance (belief: float[]) symbol =
        let weights = Array.zeroCreate 3
        for destination in 0 .. 2 do
            for source in 0 .. 2 do
                weights.[destination] <- weights.[destination] + belief.[source] * transition symbol source destination
        let probability = Array.sum weights
        for i in 0 .. 2 do weights.[i] <- weights.[i] / probability
        probability, weights

    let internal next (belief: float[]) =
        Array.init 3 (fun symbol ->
            let mutable mass = 0.0
            for source in 0 .. 2 do
                for destination in 0 .. 2 do
                    mass <- mass + belief.[source] * transition symbol source destination
            mass)

    let filter (tokens: int[]) =
        if isNull tokens || tokens.Length > 256 || Array.exists (fun x -> x < 0 || x > 2) tokens then
            Error "Mess3 expects at most 256 tokens in [0, 2]"
        else
            let mutable belief = prior ()
            let mutable logProbability = 0.0
            for token in tokens do
                let mass, updated = advance belief token
                logProbability <- logProbability + Math.Log mass
                belief <- updated
            Ok(belief, next belief, logProbability)

    /// This sampler exposes observations only. Hidden states remain private to the generator.
    let sample (stream: ResearchRandom.Stream) length =
        if length < 1 || length > 257 then Error "sample length must be in [1, 257]"
        else
            let tokens = Array.zeroCreate length
            let mutable state = int (stream.Next() * 3.0)
            for index in 0 .. length - 1 do
                let draw = stream.Next()
                let mutable cumulative = 0.0
                let mutable selected = 8
                let mutable found = false
                for edge in 0 .. 8 do
                    cumulative <- cumulative + transition (edge / 3) state (edge % 3)
                    if not found && draw < cumulative then
                        selected <- edge
                        found <- true
                tokens.[index] <- selected / 3
                state <- selected % 3
            Ok tokens
