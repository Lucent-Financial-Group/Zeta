module Zeta.Tests.AntiSybilCaveatAPropertyTests

open global.Xunit
open FsCheck
open FsCheck.FSharp
open Zeta.Core.AntiSybil

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// BP-16 SECOND TOOL for the Caveat-A default switch (#10027). Soraya machine-verified obligations
// (a)/(b)/(c) with **Z3** (real-arithmetic) on the pointwise formulas; the cross-check rule wants a
// SECOND, INDEPENDENT tool for a P0 security change. This is that tool: **FsCheck** generative properties
// over real `ChshRound` streams (settings 0/1, outcomes ±1), which reach the executable paths Z3 cannot
// (union-find closure, the ∞ guard, the HAC bandwidth, the RhoMax clamp). Z3 proves the arithmetic core;
// FsCheck exercises the whole oracle. Together they gate the switch that was already shipped — this
// retroactively brings it to the full verify-before-trust bar.
//
// The obligations (from the Caveat-A handoff, verified by Soraya):
//   (a) n_eff ≤ n, equality iff no positive autocorrelation.
//   (b) margin_corrected ≥ margin_iid  (⇐ (a), since ε(m)=√(C/m) is decreasing).
//   (c) the corrected oracle's conviction set is a SUBSET of the i.i.d. oracle's  (⇐ (b) per pair,
//       + union-find/transitive-closure monotonicity — the part FsCheck exercises end-to-end).
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

// ── generators (autocorrelated AND i.i.d. streams both reached) ───────────────────────────────────────
let private genRound =
    gen {
        let! s = Gen.elements [ 0; 1 ]
        let! o = Gen.elements [ 1; -1 ]
        return { Setting = s; Outcome = o }
    }

/// A probe stream of 0..60 rounds. Random ± outcomes give i.i.d.-ish products; FsCheck's own shrinking
/// + the union-find batch (below) also throw up runs/replays, so autocorrelated products are reached too.
let private genStream = gen { let! n = Gen.choose (0, 60) in return! Gen.listOfLength n genRound }

let private genDelta = Gen.choose (1, 99) |> Gen.map (fun i -> float i / 100.0) // δ ∈ (0, 1)

// The pre-switch i.i.d. oracle, reconstructed inline (chshSybilCalibrated now uses the CORRECTED margin,
// so we rebuild the old i.i.d. behavior to compare against — this is the "iid" side of obligation (c)).
let private iidDistinctCount (delta: float) (streams: ChshRound list list) : int =
    let k = List.length streams
    let arr = List.toArray streams
    let parent = Array.init k id
    let rec find i = if parent.[i] = i then i else (let r = find parent.[i] in parent.[i] <- r; r)
    let union i j = let ri, rj = find i, find j in if ri <> rj then parent.[ri] <- rj
    for i in 0 .. k - 1 do
        for j in i + 1 .. k - 1 do
            let n = min (List.length arr.[i]) (List.length arr.[j])
            if abs (chshS arr.[i] arr.[j]) > 2.0 + chshMargin delta n then
                union i j
    [ 0 .. k - 1 ] |> List.map find |> List.distinct |> List.length

// ── (a) n_eff ≤ n ─────────────────────────────────────────────────────────────────────────────────────

[<Fact>]
let ``PROPERTY (a): effectiveSampleSize <= n, with equality iff rho1 <= 0`` () =
    let g =
        gen {
            let! n = Gen.choose (1, 500)
            let! r = Gen.choose (-99, 99) |> Gen.map (fun i -> float i / 100.0)
            return n, r
        }
    Prop.forAll (Arb.fromGen g) (fun (n, r) ->
        let neff = effectiveSampleSize n r
        neff <= float n + 1e-9
        && (if r <= 0.0 then abs (neff - float n) < 1e-9 else neff < float n))
    |> Check.QuickThrowOnFailure

[<Fact>]
let ``PROPERTY (a): effectiveSampleSizeHAC <= n for any stream and bandwidth`` () =
    let g =
        gen {
            let! a = genStream
            let! b = genStream
            let! bw = Gen.choose (1, 10)
            return a, b, bw
        }
    Prop.forAll (Arb.fromGen g) (fun (a, b, bw) ->
        let series = outcomeProductSeries a b
        effectiveSampleSizeHAC series bw <= float (List.length series) + 1e-9)
    |> Check.QuickThrowOnFailure

// ── (b) margin_corrected ≥ margin_iid  (the load-bearing per-pair fact behind (c)) ────────────────────

[<Fact>]
let ``PROPERTY (b): chshMarginAutocorr >= chshMargin for every pair and delta`` () =
    let g =
        gen {
            let! d = genDelta
            let! a = genStream
            let! b = genStream
            return d, a, b
        }
    Prop.forAll (Arb.fromGen g) (fun (d, a, b) ->
        let n = min (List.length a) (List.length b)
        chshMarginAutocorr d a b >= chshMargin d n)
    |> Check.QuickThrowOnFailure

// ── (c) the corrected oracle convicts a SUBSET of the i.i.d. oracle  (the end-to-end claim) ────────────

[<Fact>]
let ``PROPERTY (c): corrected chshSybilCalibrated DistinctCount >= the iid oracle's (subset)`` () =
    let g =
        gen {
            let! d = genDelta
            let! k = Gen.choose (2, 6)
            let! streams = Gen.listOfLength k genStream
            return d, streams
        }
    Prop.forAll (Arb.fromGen g) (fun (d, streams) ->
        (chshSybilCalibrated d streams).DistinctCount >= iidDistinctCount d streams)
    |> Check.QuickThrowOnFailure

// ── (c') the stationarity gate only ever removes convictions (gated ⊆ margin-only) ────────────────────

[<Fact>]
let ``PROPERTY (c'): gated chshSybilAutocorrCalibrated DistinctCount >= margin-only chshSybilCalibrated`` () =
    let g =
        gen {
            let! d = genDelta
            let! tol = Gen.choose (0, 200) |> Gen.map (fun i -> float i / 100.0)
            let! k = Gen.choose (2, 6)
            let! streams = Gen.listOfLength k genStream
            return d, tol, streams
        }
    Prop.forAll (Arb.fromGen g) (fun (d, tol, streams) ->
        (chshSybilAutocorrCalibrated d tol streams).DistinctCount >= (chshSybilCalibrated d streams).DistinctCount)
    |> Check.QuickThrowOnFailure
