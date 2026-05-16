module Zeta.Tests.Algebra.UnitsTests

open Xunit
open Zeta.Core
open Zeta.Core.Units

// ============================================================================
// Rounding semantics for wallToLogical / wallToLogicalFloor / wallToLogicalCeil.
// Pin the contract -- these are easy to silently change later, and the
// difference matters at tick boundaries.
// ============================================================================

[<Fact>]
let ``wallToLogical truncates toward zero (positive duration)`` () =
    let rate = 10.0<ms/tick>  // 10 ms per tick
    let d = 25.0<ms>           // 2.5 ticks worth
    let result = wallToLogical rate d
    Assert.Equal(2L<tick>, result)  // truncated, not rounded

[<Fact>]
let ``wallToLogical truncates toward zero (negative duration)`` () =
    let rate = 10.0<ms/tick>
    let d = -25.0<ms>          // -2.5 ticks
    let result = wallToLogical rate d
    Assert.Equal(-2L<tick>, result)  // truncates toward 0, not toward -inf

[<Fact>]
let ``wallToLogicalFloor rounds toward negative infinity`` () =
    let rate = 10.0<ms/tick>

    // Positive: same as truncation
    Assert.Equal(2L<tick>, wallToLogicalFloor rate 25.0<ms>)

    // Negative: differs from truncation -- rounds AWAY from zero
    Assert.Equal(-3L<tick>, wallToLogicalFloor rate -25.0<ms>)

[<Fact>]
let ``wallToLogicalCeil rounds toward positive infinity`` () =
    let rate = 10.0<ms/tick>

    // Positive: rounds AWAY from zero
    Assert.Equal(3L<tick>, wallToLogicalCeil rate 25.0<ms>)

    // Negative: same as truncation (rounds toward 0)
    Assert.Equal(-2L<tick>, wallToLogicalCeil rate -25.0<ms>)

[<Fact>]
let ``wallToLogical exact tick boundary returns exact tick count`` () =
    let rate = 10.0<ms/tick>
    let d = 30.0<ms>           // exactly 3 ticks
    Assert.Equal(3L<tick>, wallToLogical rate d)
    Assert.Equal(3L<tick>, wallToLogicalFloor rate d)
    Assert.Equal(3L<tick>, wallToLogicalCeil rate d)

[<Fact>]
let ``wallToLogical rejects zero rate`` () =
    let rate = 0.0<ms/tick>
    let d = 25.0<ms>
    Assert.Throws<System.ArgumentException>(fun () -> wallToLogical rate d |> ignore)
    |> ignore

[<Fact>]
let ``wallToLogical rejects negative rate`` () =
    let rate = -1.0<ms/tick>
    let d = 25.0<ms>
    Assert.Throws<System.ArgumentException>(fun () -> wallToLogical rate d |> ignore)
    |> ignore

[<Fact>]
let ``wallToLogicalFloor rejects zero/negative rate`` () =
    Assert.Throws<System.ArgumentException>(fun () ->
        wallToLogicalFloor 0.0<ms/tick> 25.0<ms> |> ignore)
    |> ignore
    Assert.Throws<System.ArgumentException>(fun () ->
        wallToLogicalFloor -1.0<ms/tick> 25.0<ms> |> ignore)
    |> ignore

[<Fact>]
let ``wallToLogicalCeil rejects zero/negative rate`` () =
    Assert.Throws<System.ArgumentException>(fun () ->
        wallToLogicalCeil 0.0<ms/tick> 25.0<ms> |> ignore)
    |> ignore
    Assert.Throws<System.ArgumentException>(fun () ->
        wallToLogicalCeil -1.0<ms/tick> 25.0<ms> |> ignore)
    |> ignore

// ============================================================================
// Conversion round-trips: probToPct / pctToProb.
// ============================================================================

[<Fact>]
let ``probToPct then pctToProb is identity (within float tolerance)`` () =
    let original = 0.95<prob>
    let roundTrip = original |> probToPct |> pctToProb
    Assert.Equal(float original, float roundTrip, 10)

[<Fact>]
let ``probToPct produces 100 for prob 1`` () =
    Assert.Equal(100.0<pct>, probToPct 1.0<prob>)

[<Fact>]
let ``pctToProb produces 0 for pct 0`` () =
    Assert.Equal(0.0<prob>, pctToProb 0.0<pct>)

// ============================================================================
// Algebra cancellation: per_tick * tick is dimensionless.
// ============================================================================

[<Fact>]
let ``expectedArrivals algebra cancels per_tick * tick`` () =
    let rate = 0.05<per_tick>
    let window = 100L<tick>
    // 0.05 per tick * 100 ticks = 5.0 dimensionless
    Assert.Equal(5.0, expectedArrivals rate window, 10)

// ============================================================================
// applyDelta: signed weight + signed delta produces signed weight.
// ============================================================================

[<Fact>]
let ``applyDelta accumulates positive delta`` () =
    let state = 10L<weight>
    let d = 3L<delta>
    Assert.Equal(13L<weight>, applyDelta state d)

[<Fact>]
let ``applyDelta accumulates negative delta (retraction)`` () =
    let state = 10L<weight>
    let d = -3L<delta>
    Assert.Equal(7L<weight>, applyDelta state d)

[<Fact>]
let ``applyDelta below zero is allowed (signed weight)`` () =
    let state = 1L<weight>
    let d = -5L<delta>
    Assert.Equal(-4L<weight>, applyDelta state d)

// ============================================================================
// msToNs overflow guard: input above ~9.22e12 ms throws OverflowException.
// ============================================================================

[<Fact>]
let ``msToNs converts small values correctly`` () =
    Assert.Equal(1_000_000L<ns>, msToNs 1L<ms>)
    Assert.Equal(1_500_000_000L<ns>, msToNs 1500L<ms>)

[<Fact>]
let ``msToNs throws OverflowException on values that would overflow int64`` () =
    let overflowing = 9_223_372_036_855L<ms>
    Assert.Throws<System.OverflowException>(fun () -> msToNs overflowing |> ignore)
    |> ignore

[<Fact>]
let ``msToNs throws OverflowException on negative values that would overflow`` () =
    let overflowing = -9_223_372_036_855L<ms>
    Assert.Throws<System.OverflowException>(fun () -> msToNs overflowing |> ignore)
    |> ignore

// ============================================================================
// applyDelta overflow guard: Int64.MaxValue + positive delta throws.
// ============================================================================

[<Fact>]
let ``applyDelta throws OverflowException on int64 overflow`` () =
    let state = LanguagePrimitives.Int64WithMeasure<weight> System.Int64.MaxValue
    let d = 1L<delta>
    Assert.Throws<System.OverflowException>(fun () -> applyDelta state d |> ignore)
    |> ignore

[<Fact>]
let ``applyDelta throws OverflowException on int64 underflow`` () =
    let state = LanguagePrimitives.Int64WithMeasure<weight> System.Int64.MinValue
    let d = -1L<delta>
    Assert.Throws<System.OverflowException>(fun () -> applyDelta state d |> ignore)
    |> ignore

// ============================================================================
// logicalToWall positive-rate guard.
// ============================================================================

[<Fact>]
let ``logicalToWall rejects zero/negative rate`` () =
    Assert.Throws<System.ArgumentException>(fun () ->
        logicalToWall 0.0<ms/tick> 100L<tick> |> ignore)
    |> ignore
    Assert.Throws<System.ArgumentException>(fun () ->
        logicalToWall -1.0<ms/tick> 100L<tick> |> ignore)
    |> ignore


// ============================================================================
// Currency UoM — the smallest defensible compile-time-rejection demonstration
// of the F#-fork-for-AI-safety thesis applied to financial substrate.
//
// What's tested at runtime (these tests):
//   - Same-currency arithmetic produces the expected typed result
//   - Explicit conversion via convertCurrency with a typed rate works
//   - Invalid rates (zero/negative) are rejected at runtime
//
// What's "tested" at compile-time (NOT runtime tests — these would be
// COMPILE ERRORS if uncommented):
//
//   ```fsharp
//   let bad = 100.0<usd> + 50.0<eur>      // FS0001: types don't match
//   let bad2 = (100.0<usd>) * (50.0<eur>) // FS0001: dimension mismatch
//   let bad3: float<usd> = 50.0<eur>      // FS0001: types don't unify
//   ```
//
// The F# compiler IS the falsifier: if any of those lines ever compile,
// either Units.fs lost its currency UoM declarations OR the F# language
// changed its UoM semantics. Either way, the build would fail to reach
// the test stage. That's the canonical asymmetric-critic discipline
// (per .claude/rules/fsharp-anchor-dotnet-build-sanity-check.md) applied
// to a defined error class.
// ============================================================================

[<Fact>]
let ``same-currency addition produces correctly-typed result`` () =
    let a: float<usd> = 100.0<usd>
    let b: float<usd> = 50.0<usd>
    let sum: float<usd> = a + b
    Assert.Equal(150.0<usd>, sum)

[<Fact>]
let ``same-currency subtraction produces correctly-typed result`` () =
    let balance: float<eur> = 1000.0<eur>
    let withdrawal: float<eur> = 250.0<eur>
    let remaining: float<eur> = balance - withdrawal
    Assert.Equal(750.0<eur>, remaining)

[<Fact>]
let ``same-currency scalar multiplication preserves currency type`` () =
    let perUnit: float<gbp> = 9.99<gbp>
    let count: float = 3.0
    let total: float<gbp> = perUnit * count
    Assert.Equal(29.97, float total, 6)

[<Fact>]
let ``convertCurrency applies rate with cancelling units`` () =
    // 100 USD * 0.92 EUR/USD = 92 EUR
    let rate: float<eur/usd> = 0.92<eur/usd>
    let usdAmount: float<usd> = 100.0<usd>
    let eurAmount: float<eur> = convertCurrency rate usdAmount
    Assert.Equal(92.0, float eurAmount, 6)

[<Fact>]
let ``convertCurrency works in the reverse direction with reverse rate`` () =
    // 92 EUR * (1 / 0.92) USD/EUR = ~100 USD. UoM literal syntax requires
    // a number, not an expression, so use LanguagePrimitives for the inverse.
    let reverseRate: float<usd/eur> =
        LanguagePrimitives.FloatWithMeasure<usd/eur> (1.0 / 0.92)
    let eurAmount: float<eur> = 92.0<eur>
    let usdBack: float<usd> = convertCurrency reverseRate eurAmount
    Assert.Equal(100.0, float usdBack, 6)

[<Fact>]
let ``convertCurrency rejects zero rate`` () =
    Assert.Throws<System.ArgumentException>(fun () ->
        convertCurrency 0.0<eur/usd> 100.0<usd> |> ignore)
    |> ignore

[<Fact>]
let ``convertCurrency rejects negative rate`` () =
    Assert.Throws<System.ArgumentException>(fun () ->
        convertCurrency -0.92<eur/usd> 100.0<usd> |> ignore)
    |> ignore

[<Fact>]
let ``convertCurrency is generic across all currency pairs`` () =
    // Same function handles every pair; the compiler instantiates the
    // generics at each call site. No combinatorial helper-function explosion.
    let usdToJpy: float<jpy/usd> = 150.0<jpy/usd>
    let usd: float<usd> = 10.0<usd>
    let jpy: float<jpy> = convertCurrency usdToJpy usd
    Assert.Equal(1500.0, float jpy, 6)

    let gbpToEur: float<eur/gbp> = 1.18<eur/gbp>
    let gbp: float<gbp> = 100.0<gbp>
    let eur: float<eur> = convertCurrency gbpToEur gbp
    Assert.Equal(118.0, float eur, 6)
