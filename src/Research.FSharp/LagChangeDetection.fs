namespace Zeta.Research

open System

/// Known-law likelihood-ratio control, not a guarantee for learned or misspecified nulls.
[<RequireQualifiedAccess>]
module LagChangeDetection =
    type Trace = { Known: float[]; WrongIid: float[]; FirstKnown: int; FirstWrongIid: int }
    let private logMean (values: float[]) =
        let maximum = Array.max values
        maximum + Math.Log(Array.averageBy (fun x -> Math.Exp(x - maximum)) values)
    let internal traceWith (positions: int[]) (tokens: int[]) =
        let alternatives = [| for position in positions do for p in [0.5; 0.25] do yield position, p |]
        let logRatios = Array.zeroCreate alternatives.Length
        let known, wrong = Array.zeroCreate tokens.Length, Array.zeroCreate tokens.Length
        let mutable nullVsIid = 0.0
        let mutable firstKnown, firstWrong = -1, -1
        for t in 0 .. tokens.Length - 1 do
            if t >= 2 then
                let copy = tokens.[t] = tokens.[t - 2]
                let nullProbability = if copy then 0.75 else 0.25
                nullVsIid <- nullVsIid + Math.Log(nullProbability / 0.5)
                for a in 0 .. alternatives.Length - 1 do
                    let position, p = alternatives.[a]
                    if t >= position then
                        logRatios.[a] <- logRatios.[a] + Math.Log((if copy then p else 1.0 - p) / nullProbability)
            known.[t] <- logMean logRatios
            wrong.[t] <- known.[t] + nullVsIid
            if firstKnown < 0 && known.[t] >= Math.Log 20.0 then firstKnown <- t
            if firstWrong < 0 && wrong.[t] >= Math.Log 20.0 then firstWrong <- t
        { Known = known; WrongIid = wrong; FirstKnown = firstKnown; FirstWrongIid = firstWrong }
    let trace (tokens: int[]) =
        if isNull tokens || tokens.Length > 512 || Array.exists (fun x -> x <> 0 && x <> 1) tokens then Error "detector needs at most 512 binary tokens"
        else Ok(traceWith [|64;128;192;256|] tokens)
    let sample (random: ResearchRandom.Stream) probability start duration =
        if not (Double.IsFinite probability) || probability < 0.0 || probability > 1.0 || start < 2 || start > 512 || duration < 0 || duration > 512 - start then
            Error "change needs a valid probability and bounded interval within positions 2..511"
        else
            let tokens = Array.zeroCreate 512
            for t in 0..511 do
                let u = random.Next()
                if t < 2 then tokens.[t] <- int (2.0 * u)
                else
                    let p = if t >= start && t < start + duration then probability else 0.75
                    tokens.[t] <- if u < p then tokens.[t - 2] else 1 - tokens.[t - 2]
            Ok tokens
