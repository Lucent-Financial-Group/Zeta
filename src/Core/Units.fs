namespace Zeta.Core

/// Units of Measure for Zeta domain quantities.
///
/// Pick units where confusion of like-shaped numbers is a real bug
/// class, not just "a number with a name." The four highest-pay
/// declarations:
///
///   - Z-set semantic safety (weight / cardinality / delta) -- prevents
///     adding signed weights to unsigned counts on retraction
///   - Logical-vs-wall-clock time (tick / ms / ns / s) -- prevents
///     passing a duration where a tick count is expected (off-by-1000x
///     bugs that survive unit tests because both numbers look plausible)
///   - Bayesian probability vs percentage (prob / pct) -- prevents
///     0.95-vs-95 confusion in Bayesian-output handlers
///   - Rate domain (per_tick / per_sec) -- defined as reciprocal of
///     tick / s respectively, so unit algebra cancels naturally
///
/// UoM is erased at runtime (numeric-only, compile-time-only). The
/// safety is at the F# type-checker layer; runtime numeric ops are
/// identical to plain `int64` / `float`. This is additive: existing
/// code without UoM annotations stays untouched; consumers opt in by
/// annotating their own variables.
///
/// Lineage: see the maintainer-forwarded Claude.ai conversation
/// preservation under `docs/research/` (knights-knaves-round-table-
/// harmonious-division-bootstrap-razor preservation, 2026-05-05) for
/// the original UoM-examples discussion + the "code tests the formal
/// verifications" framing.
module Units =

    // ============================================================================
    // Z-set semantic safety: signed weight, unsigned cardinality, signed delta.
    // ============================================================================

    /// Signed Z-set multiplicity. Negative weight means retraction.
    /// Don't add weights to unsigned counts -- the type checker won't let you.
    [<Measure>]
    type weight

    /// Count of distinct elements -- expected to be >= 0 by discipline,
    /// not by UoM enforcement. UoM tags the *kind* (cardinality vs
    /// weight); the underlying numeric type (typically `int` or `int64`)
    /// is what carries signedness. A `cardinality`-tagged value being
    /// non-negative is a contract callers maintain, not a property the
    /// type system can prove. Combining with `weight` requires explicit
    /// conversion at the call site (which is the point: you have to
    /// think about retraction semantics).
    [<Measure>]
    type cardinality

    /// Signed change between two states (`State_t - State_{t-1}`). Distinct
    /// from `weight` because deltas compose differently than raw multiplicities.
    [<Measure>]
    type delta


    // ============================================================================
    // Time: logical ticks vs wall-clock milliseconds vs nanoseconds.
    // ============================================================================

    // `tick` and `ms` are NOT redeclared here -- they already exist as
    // namespace-scope measures in `Window.fs:13-14`. This module compiles
    // AFTER Window.fs so it sees those declarations and reuses them. The
    // alternative (redeclaring inside Units) would create
    // `Zeta.Core.Units.tick` distinct from `Zeta.Core.tick` -- non-
    // interoperable, undermining the additive-safety goal. Reuse > redeclare.

    /// Wall-clock nanosecond. For high-precision deterministic-
    /// simulation-testing (DST in the Otto-272 sense -- distinct from
    /// daylight-saving-time) where `ms` is too coarse-grained to drive
    /// deterministic scheduling.
    [<Measure>]
    type ns


    // ============================================================================
    // Bayesian: probability in [0,1] vs percentage in [0,100].
    // ============================================================================

    /// Probability in [0, 1]. Bayesian inference outputs.
    [<Measure>]
    type prob

    /// Percentage in [0, 100]. User-facing display only; not for
    /// Bayesian computation.
    [<Measure>]
    type pct


    // ============================================================================
    // Rates: explicit per-time domain (DERIVED measures so the algebra cancels).
    // ============================================================================

    /// Wall-clock second. Base measure for per-second rates.
    [<Measure>]
    type s

    /// Rate per logical tick (e.g. arrivals per circuit step). Defined as
    /// reciprocal of `tick` so the algebra cancels: `<per_tick> * <tick>`
    /// produces `<1>` (dimensionless) without unit-erasure casts.
    [<Measure>]
    type per_tick = /tick

    /// Rate per wall-clock second. Defined as reciprocal of `s`.
    [<Measure>]
    type per_sec = /s


    // ============================================================================
    // Conversion helpers (explicit by design — conversion IS the safety boundary).
    // ============================================================================

    /// Convert probability (0..1) to percentage (0..100). Explicit so the
    /// boundary between Bayesian-internal and user-facing is visible.
    let probToPct (p: float<prob>) : float<pct> =
        LanguagePrimitives.FloatWithMeasure<pct> (float p * 100.0)

    /// Convert percentage (0..100) back to probability (0..1).
    let pctToProb (p: float<pct>) : float<prob> =
        LanguagePrimitives.FloatWithMeasure<prob> (float p / 100.0)

    /// Convert ticks to wall-clock milliseconds given an explicit tick rate.
    /// The `rate: float<ms/tick>` parameter forces the caller to declare
    /// the conversion factor at the call site (which is the point).
    /// Validates `rate > 0` for symmetry with the wallToLogical* family.
    let logicalToWall (rate: float<ms/tick>) (t: int64<tick>) : float<ms> =
        if float rate <= 0.0 then
            invalidArg "rate" $"rate must be positive (got %f{float rate})"
        LanguagePrimitives.FloatWithMeasure<tick> (float t) * rate

    /// Convert wall-clock milliseconds to ticks given an explicit tick rate.
    /// **Rounding semantics**: truncates toward zero (`int64 (...)` cast).
    /// Callers needing floor / ceiling / nearest semantics at tick boundaries
    /// should compute the float result themselves and apply the rounding
    /// they want. Truncation was chosen as the default because tick-time
    /// is monotonically increasing in the scheduler and "ticks elapsed so
    /// far" is the dominant query shape; truncation gives the conservative
    /// answer.
    let wallToLogical (rate: float<ms/tick>) (d: float<ms>) : int64<tick> =
        if float rate <= 0.0 then
            invalidArg "rate" $"rate must be positive (got %f{float rate})"
        LanguagePrimitives.Int64WithMeasure<tick> (int64 (d / rate))

    /// Same as `wallToLogical` but with explicit floor rounding (always
    /// rounds toward negative infinity; matches truncation for non-negative
    /// inputs but differs for negative durations).
    let wallToLogicalFloor (rate: float<ms/tick>) (d: float<ms>) : int64<tick> =
        if float rate <= 0.0 then
            invalidArg "rate" $"rate must be positive (got %f{float rate})"
        LanguagePrimitives.Int64WithMeasure<tick> (int64 (System.Math.Floor (float (d / rate))))

    /// Same as `wallToLogical` but with explicit ceiling rounding (always
    /// rounds toward positive infinity).
    let wallToLogicalCeil (rate: float<ms/tick>) (d: float<ms>) : int64<tick> =
        if float rate <= 0.0 then
            invalidArg "rate" $"rate must be positive (got %f{float rate})"
        LanguagePrimitives.Int64WithMeasure<tick> (int64 (System.Math.Ceiling (float (d / rate))))

    /// Convert milliseconds to nanoseconds. Multiplies by 1_000_000;
    /// `int64` overflows for `|d|` above roughly 9_223_372_036_854 ms
    /// (~292 years). Guarded with `Checked.( * )` so overflow throws
    /// `OverflowException` rather than silently wrapping.
    let msToNs (d: int64<ms>) : int64<ns> =
        let raw = Checked.(*) (int64 d) 1000000L
        LanguagePrimitives.Int64WithMeasure<ns> raw

    /// Apply a signed delta to a weight, producing a new weight.
    /// Both arguments are signed; result is signed. The function exists
    /// to make the semantic (state += delta) explicit at call sites.
    /// Uses `Checked.(+)` so overflow throws `OverflowException` rather
    /// than silently wrapping (e.g., `Int64.MaxValue + 1L<delta>`).
    let applyDelta (state: int64<weight>) (d: int64<delta>) : int64<weight> =
        let raw = Checked.(+) (int64 state) (int64 d)
        LanguagePrimitives.Int64WithMeasure<weight> raw

    /// Compute expected count over a window given a per-tick arrival rate.
    /// The unit algebra cancels naturally: `per_tick = /tick`, so
    /// `<per_tick> * <tick> = <1>` (dimensionless, no cast needed).
    let expectedArrivals (rate: float<per_tick>) (window: int64<tick>) : float =
        let windowFloat = LanguagePrimitives.FloatWithMeasure<tick> (float window)
        rate * windowFloat
