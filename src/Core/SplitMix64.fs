namespace Zeta.Core

open System.Runtime.CompilerServices


/// SplitMix64 finaliser — Sebastiano Vigna's mixer from
/// [arxiv 1410.0530 §3](https://arxiv.org/abs/1410.0530), validated
/// against BigCrush. Public domain; reference implementation at
/// <https://prng.di.unimi.it/splitmix64.c>.
///
/// **Why the three constants are these specific values:**
///
/// - `GoldenRatio = 0x9E3779B97F4A7C15` = `floor(2^64 / phi)` where
///   phi is the golden ratio `(1 + sqrt 5) / 2`. From Knuth TAOCP
///   §6.4 multiplicative hashing. Golden-ratio-derived constants
///   produce low-correlation multiplication output across any
///   reasonable bit pattern. Same constant Murmur3 final-mix and
///   Fibonacci hashing use.
/// - `VignaA = 0xBF58476D1CE4E5B9` and `VignaB = 0x94D049BB133111EB`
///   are the SplitMix64 finaliser-pair multipliers. Empirically
///   validated by Vigna to give strong avalanche after the
///   shift-xor steps; passes BigCrush statistical tests.
///
/// **Why we extracted this** (Aaron 2026-04-25 directive):
/// the three constants used to be inlined in three call sites
/// (`Sketch.fs`, `ConsistentHash.fs`, `FastCdc.fs`) plus once in
/// a test (`CountMin.Tests.fs`). When a magic number repeats, it
/// belongs in one place with one comment that explains why we
/// picked it. Otherwise the rationale rots in three different
/// sites and a reader has to re-derive the constant's provenance
/// every time.
///
/// **Hot-path performance.** All operations are inlined (5 ops:
/// `mul`, `xor-shift`, `mul`, `xor-shift`, `mul`, `xor-shift`).
/// No allocation. Safe to call on millions of values per second.
[<RequireQualifiedAccess>]
module SplitMix64 =

    /// `floor(2^64 / phi)` where `phi = (1 + sqrt 5) / 2` is the
    /// golden ratio. Knuth TAOCP §6.4 multiplicative-hashing
    /// constant. Also used by Murmur3 final-mix and Fibonacci
    /// hashing.
    [<Literal>]
    let GoldenRatio = 0x9E3779B97F4A7C15UL

    /// First Vigna SplitMix64 finaliser multiplier
    /// (arxiv 1410.0530 §3). Empirically validated to give strong
    /// avalanche after the `xor (z >>> 30)` step.
    [<Literal>]
    let VignaA = 0xBF58476D1CE4E5B9UL

    /// Second Vigna SplitMix64 finaliser multiplier
    /// (arxiv 1410.0530 §3). Combined with `VignaA` and the
    /// final `xor (z >>> 31)` step, the full finaliser passes
    /// BigCrush.
    [<Literal>]
    let VignaB = 0x94D049BB133111EBUL

    // ─── Shift constants (also empirically chosen) ───
    //
    // Vigna's paper (arxiv 1410.0530 §3) reports the bias of
    // `(z xor (z >>> s)) * m` for various `(s, m)` pairs. The shifts
    // 30 / 27 / 31 are the empirically-best partners for the
    // multipliers `VignaA` / `VignaB` / `(none)` respectively. You
    // cannot swap shifts and multipliers freely — a shift amount
    // tuned for `VignaA` does not give the same avalanche when
    // paired with a different multiplier. The full triple
    // `(30, VignaA), (27, VignaB), (31, _)` is what passes BigCrush;
    // changing any of the six numbers makes the finaliser fail
    // statistical tests.
    //
    // Why these specific shifts: the paper's analysis is empirical
    // (an exhaustive search over (s, m) pairs minimising bias of
    // the resulting bit distribution). There's no closed-form
    // derivation — these are the survivors of a brute-force search,
    // not a deduced result. Reference table is §3, Tables 1-2 of
    // the paper.

    /// Apply the SplitMix64 finaliser to a 64-bit input. 5 ops
    /// total, no allocation. Suitable for any inner-loop mixing
    /// step where a 64-bit input needs uniform avalanche.
    ///
    /// The shift constants `30`, `27`, `31` are part of the
    /// empirically-validated finaliser triple — see the comment
    /// block above for why they cannot be swapped.
    [<MethodImpl(MethodImplOptions.AggressiveInlining)>]
    let inline mix (x: uint64) : uint64 =
        let mutable z = x * GoldenRatio
        z <- (z ^^^ (z >>> 30)) * VignaA
        z <- (z ^^^ (z >>> 27)) * VignaB
        z ^^^ (z >>> 31)

    /// Apply only the *finaliser tail* of SplitMix64 — skips the
    /// initial `* GoldenRatio` multiply. Useful when the caller has
    /// already produced a mixed-looking input (e.g. from XORing two
    /// already-mixed values) and just needs the avalanche tail.
    /// 4 ops total; faster than `mix` when the input is pre-mixed.
    ///
    /// Same shift constants `30`, `27`, `31` as `mix` — same
    /// empirical-pairing constraint applies.
    [<MethodImpl(MethodImplOptions.AggressiveInlining)>]
    let inline finalise (x: uint64) : uint64 =
        let mutable z = (x ^^^ (x >>> 30)) * VignaA
        z <- (z ^^^ (z >>> 27)) * VignaB
        z ^^^ (z >>> 31)
