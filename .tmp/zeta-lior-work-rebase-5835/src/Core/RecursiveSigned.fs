namespace Zeta.Core

// ============================================================================
// RecursiveSigned — gap-monotone signed-delta semi-naïve LFP — SKELETON
// ============================================================================
//
// Round-35 stub. Sibling to `Recursive.RecursiveSemiNaive` and
// `Recursive.RecursiveCounting`. The design lives in:
//
//   docs/research/retraction-safe-semi-naive.md  (§"Option 7 —
//                                                  gap-monotone signed-delta")
//   tools/tla/specs/RecursiveSignedSemiNaive.tla (TLA+ skeleton with
//                                                  preconditions P1-P3 and
//                                                  properties S1-S3)
//
// The gap-monotone variant carries *signed deltas* through semi-naïve
// iteration; unlike Gupta-Mumick counting, it does not carry
// multiplicities. Termination is proven by a lex-product rank argument
// in the TLA+ model, not by monotonicity-on-weights.
//
// Preconditions on `body` that the caller must guarantee:
//
//   P1. Z-linearity       — body(a + b) = body(a) + body(b)
//   P2. Sign-distribution — body(-a)    = -body(a)
//   P3. Support-monotone  — support(a) ⊆ support(b)
//                           ⇒ support(body(a)) ⊆ support(body(b))
//
// Why not ship it today:
//
//   The TLA+ spec still has `Step` as a placeholder (iter counter +
//   UNCHANGED vars). Until the real step relation is written and TLC
//   checks properties S1-S3, any F# implementation would be an
//   unverified guess at the recurrence shape. The responsible path is
//   to park the F# module as a skeleton, land the real TLA+ step in
//   round 36 against a concrete body satisfying P1-P3, and only then
//   promote this module from skeleton to shipped. See
//   docs/research/chain-rule-proof-log.md §"attack order" for the
//   sequencing.
//
// Out of scope for this skeleton:
//
//   - Connecting to `Circuit` via an `[<Extension>]` static method on
//     `Circuit`. That wiring lands only once the TLA+ step is verified
//     and this module graduates from skeleton to shipped.
//   - Performance comparisons against Feldera §6.3
//     `nested_integrate_trace`. See TECH-RADAR "Gap-monotone vs
//     Feldera" watchlist row; no benchmark until the algorithm ships.
//
// This file is intentionally NOT wired into Core.fsproj. It exists as
// a pinned pointer between the TLA+ spec and the future F# home, so
// the next-round author lands the code at a predictable path.
// ============================================================================

module RecursiveSignedSkeleton =

    /// Planned signature (round 36+, after TLA+ step lands):
    ///
    ///   static member RecursiveSignedDelta<'K when 'K : comparison>
    ///       (this: Circuit,
    ///        seed: Stream<ZSet<'K>>,
    ///        body: Func<Stream<ZSet<'K>>, Stream<ZSet<'K>>>)
    ///       : Stream<ZSet<'K>>
    ///
    /// Expected shape:
    ///
    ///   tick 0:  delta = seed
    ///   tick n>0:
    ///       newDelta = body(delta)  // Z-linear; signed weights pass through
    ///       total   += newDelta     // gap-monotone accumulator
    ///       delta    = newDelta
    ///   terminates when delta = 0 (i.e. ∀k, delta[k] = 0)
    ///
    /// Distinct from `RecursiveSemiNaive`:
    ///   - No `Distinct` clamp on delta — negative weights survive
    ///     through iteration under P1-P3.
    ///   - No integrated-seed step — the seed is absorbed into delta
    ///     on tick 0 and never re-applied.
    ///
    /// Distinct from `RecursiveCounting`:
    ///   - Does not carry derivation-count multiplicities; the
    ///     accumulator `total` tracks signed weights only.
    let plannedSignature = ()
