namespace Zeta.Research

open Zeta.Core

/// Explicit experiment-local streams; the repository mixer is shared, not reimplemented.
[<RequireQualifiedAccess>]
module ResearchRandom =
    type Stream(seed: uint64) =
        let mutable state = seed
        member _.Next() =
            state <- state + SplitMix64.GoldenRatio
            float (SplitMix64.mix state >>> 11) / 9007199254740992.0

    let domain seed tag = SplitMix64.mix (seed ^^^ (uint64 tag * SplitMix64.GoldenRatio))

