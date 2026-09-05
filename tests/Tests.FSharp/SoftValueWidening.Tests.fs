module Zeta.Tests.SoftValueWideningTests

open global.Xunit
open Zeta.Core

module SV = Zeta.Core.SoftValue

// ═══════════════════════════════════════════════════════════════════════════════
// The widening operator — the four falsifiers.
//
// Gap this closes: `observe` sharpens monotonically, so under a NON-STATIONARY source the
// posterior concentrates on stale evidence and cannot re-open. Never-collapse was implemented
// on the ENSEMBLE axis (`YinYangEnsemble.reseedIfCollapsed`) and absent on the VALUE axis.
//
// Two operators are under test and their commutativity status is OPPOSITE — that contrast is
// the point of the change, so it is pinned here rather than described in prose:
//   • `SV.widen`        — belief-reading floor. Idempotent. Does NOT commute with `observe`.
//   • `SV.foldRetainedBounded` — evidence retraction. Re-opens AND commutes, under
//     declared bounds; `Refused` is a DECLARED divergence, distinct from `Contradicted`.
// ═══════════════════════════════════════════════════════════════════════════════

let private cand i = DynamicValue.Int(int64 i)
let private soft xs = (SV.ofWeighted xs).Value
let private approx (a: float) (b: float) = abs (a - b) < 1e-9

/// Unwraps the expected-success case. A `Contradicted` or `Refused` here is a test failure with
/// a NAMED cause, never a silent `.Value` throw on an option.
let private folded (o: SV.FoldOutcome) : SV.SoftValue =
    match o with
    | SV.Folded sv -> sv
    | SV.Contradicted -> failwith "expected a posterior, got Contradicted (every candidate refuted)"
    | SV.Refused r -> failwithf "expected a posterior, got Refused %A — a declared bound was hit" r

let private sameDist (a: SV.SoftValue) (b: SV.SoftValue) =
    let ca, cb = SV.candidates a, SV.candidates b
    List.length ca = List.length cb
    && ca |> List.forall (fun (d, p) ->
        match cb |> List.tryFind (fun (d2, _) -> d2 = d) with
        | Some (_, q) -> approx p q
        | None -> false)

/// Likelihood table over candidates 0..2.
let private lik (xs: float list) : DynamicValue -> float =
    fun d -> xs |> List.mapi (fun i w -> (cand i, w)) |> List.tryPick (fun (c, w) -> if c = d then Some w else None) |> Option.defaultValue 0.0

let private A = lik [ 0.9; 0.05; 0.05 ]   // source A favours candidate 0
let private B = lik [ 0.05; 0.9; 0.05 ]   // source B favours candidate 1
let private uniform3 = soft [ cand 0, 1.0; cand 1, 1.0; cand 2, 1.0 ]

let private argmax (sv: SV.SoftValue) = SV.candidates sv |> List.maxBy snd |> fst

/// Evidence constructor — keeps record resolution explicit under `RequireQualifiedAccess`.
let private ev (phase: int64) (l: DynamicValue -> float) : SV.Evidence =
    { Phase = phase; Likelihood = l }

/// Deterministic shuffle: project to a seeded key ONCE, then sort. (No ambient RNG; DST-replayable.)
let private shuffle (rng: System.Random) (xs: 'a list) : 'a list =
    xs |> List.map (fun x -> rng.Next(), x) |> List.sortBy fst |> List.map snd

// ── FALSIFIER 1: a widened posterior can RE-OPEN; without the operator it stays stuck ──
// This is the core property. It MUST fail if the operator is removed, so both arms are
// asserted in the same test: the no-widening arm pins that the gap is real.

[<Fact>]
let ``falsifier 1 - without retraction the posterior locks on the stale source; with it, it re-opens`` () =
    // 40 observations of A, then the source switches: 12 observations of B.
    let evidence =
        [ for i in 0 .. 39 -> ev (int64 i) A ]
        @ [ for i in 0 .. 11 -> ev (int64 (40 + i)) B ]

    // No retraction (retain everything) — the CURRENT behaviour, and the bug.
    let stuck = folded (SV.foldRetainedBounded (SV.window 1_000_000L) evidence uniform3)
    Assert.Equal(cand 0, argmax stuck)          // still locked on the STALE source A

    // With a phase-keyed retention window — tracks the new source.
    let reopened = folded (SV.foldRetainedBounded (SV.window 10L) evidence uniform3)
    Assert.Equal(cand 1, argmax reopened)       // tracks B

    // And the two genuinely differ — guards against a vacuous pass if both arms degenerated.
    Assert.False(sameDist stuck reopened)

// ── FALSIFIER 2: COMMUTATIVITY IS PRESERVED WITH WIDENING ENABLED ──
// The most important test in the change: it is what catches a local-time leak. Retention keyed
// on the CARRIED PHASE commutes under reordering; retention keyed on ARRIVAL ORDER (the leak
// `local-time-never-enters-the-shared-fold.md` forbids) does not — the mutant arm below proves
// this test can actually fail, so it is not vacuous.

[<Fact>]
let ``falsifier 2 - foldRetained commutes under reordering with widening enabled`` () =
    let evidence =
        [ for i in 0 .. 39 -> ev (int64 i) A ]
        @ [ for i in 0 .. 11 -> ev (int64 (40 + i)) B ]

    let schedule = SV.window 10L
    let baseline = folded (SV.foldRetainedBounded schedule evidence uniform3)

    // Deterministic reorderings (no ambient RNG — DST-replayable).
    let rng = System.Random(4)   // the common seed S=4
    for _ in 1 .. 200 do
        let shuffled = shuffle rng evidence
        let got = folded (SV.foldRetainedBounded schedule shuffled uniform3)
        Assert.True(sameDist baseline got, "reordering changed the posterior — local order leaked into the fold")

[<Fact>]
let ``falsifier 2b - the arrival-order MUTANT is caught by falsifier 2 (non-vacuity)`` () =
    // Retention keyed on ARRIVAL POSITION instead of carried phase — the local-time leak.
    // Folded by hand because the shipped API makes this un-expressible, which is the design.
    let evidence =
        [ for i in 0 .. 39 -> ev (int64 i) A ]
        @ [ for i in 0 .. 11 -> ev (int64 (40 + i)) B ]

    let foldByArrival (ev: SV.Evidence list) =
        let n = List.length ev
        ev
        |> List.mapi (fun i e -> i, e)
        |> List.fold
            (fun acc (i, e) -> if n - 1 - i < 10 then acc |> Option.bind (SV.observe e.Likelihood) else acc)
            (Some uniform3)

    let baseline = (foldByArrival evidence).Value
    let rng = System.Random(4)
    let mutable diverged = 0
    for _ in 1 .. 200 do
        let shuffled = shuffle rng evidence
        if not (sameDist baseline (foldByArrival shuffled).Value) then diverged <- diverged + 1

    // The mutant MUST diverge — otherwise falsifier 2 is a check that cannot fail.
    Assert.True(diverged > 190, sprintf "arrival-keyed mutant diverged only %d/200 times" diverged)

// ── FALSIFIER 3: IDEMPOTENCY ──

[<Fact>]
let ``falsifier 3 - widen is idempotent, non-vacuously (it actually fires)`` () =
    let concentrated = soft [ cand 0, 0.97; cand 1, 0.02; cand 2, 0.01 ]
    // Guard the test against vacuity: the operator must actually have work to do.
    Assert.True(SV.uniformShare concentrated < 0.3, "precondition: belief must be below the floor")

    let once = SV.widen 0.3 concentrated
    let twice = SV.widen 0.3 once

    Assert.False(sameDist concentrated once, "widen did not fire — test would be vacuous")
    Assert.True(sameDist once twice, "widen is not idempotent")
    Assert.True(approx (SV.uniformShare once) 0.3, "floor did not land exactly on lambda")

[<Fact>]
let ``falsifier 3b - retain is idempotent`` () =
    let evidence = [ for i in 0 .. 39 -> ev (int64 i) A ]
    let once = SV.retain (SV.window 10L) evidence
    let twice = SV.retain (SV.window 10L) once
    Assert.Equal(10, List.length once)                     // fired: 10 of 40 retained
    Assert.Equal(List.length once, List.length twice)
    Assert.Equal<int64 list>(once |> List.map (fun e -> e.Phase), twice |> List.map (fun e -> e.Phase))

[<Fact>]
let ``widen above the floor is a no-op (the max, not an increment)`` () =
    let wide = soft [ cand 0, 1.0; cand 1, 1.0; cand 2, 1.0 ]
    Assert.True(sameDist wide (SV.widen 0.3 wide))

// ── FALSIFIER 4: THE FLOOR IS NOT FREE ──
// An operator that only ever widens is as broken as one that only ever sharpens.

[<Fact>]
let ``falsifier 4 - a stationary source still converges under retraction, and does not jitter`` () =
    let stationary = [ for i in 0 .. 59 -> ev (int64 i) A ]
    let converged = folded (SV.foldRetainedBounded (SV.window 10L) stationary uniform3)
    Assert.Equal(cand 0, argmax converged)
    Assert.True(SV.confidence converged > 0.99,
                sprintf "stationary source failed to converge: confidence %f" (SV.confidence converged))

[<Fact>]
let ``falsifier 4b - widen's floor PERMANENTLY caps confidence - the cost, stated`` () =
    // This is the price of the belief-axis floor, and why `foldRetained` is the load-bearing
    // operator: no amount of consistent evidence can push confidence past 1 - λ + λ/n.
    let mutable sv = uniform3
    for _ in 1 .. 200 do
        sv <- SV.widen 0.3 ((SV.observe A sv).Value)
    let cap = 1.0 - 0.3 + 0.3 / 3.0                        // = 0.8
    Assert.True(SV.confidence sv <= cap + 1e-9,
                sprintf "confidence %f exceeded the structural cap %f" (SV.confidence sv) cap)
    Assert.True(SV.confidence sv > 0.79, "should sit AT the cap, not below it")

// ── The boundary `widen` is shipped to mark (mirror of BeliefConvergence.sharpen) ──

[<Fact>]
let ``widen interleaved with observe does NOT commute - the documented boundary`` () =
    let p0 = soft [ cand 0, 0.5; cand 1, 0.3; cand 2, 0.2 ]
    let L1 = lik [ 0.9; 0.2; 0.1 ]
    let L2 = lik [ 0.1; 0.8; 0.3 ]
    let step l s = SV.widen 0.3 ((SV.observe l s).Value)
    let order1 = step L2 (step L1 p0)
    let order2 = step L1 (step L2 p0)
    // Pinned as a NEGATIVE: if this ever starts commuting the doc comment is wrong.
    Assert.False(sameDist order1 order2,
                 "widen unexpectedly commuted with observe — the shipped documentation is now false")

[<Fact>]
let ``widen at the fold boundary DOES commute - the safe usage`` () =
    let p0 = soft [ cand 0, 0.5; cand 1, 0.3; cand 2, 0.2 ]
    let L1 = lik [ 0.9; 0.2; 0.1 ]
    let L2 = lik [ 0.1; 0.8; 0.3 ]
    let o l s = (SV.observe l s).Value
    Assert.True(sameDist (SV.widen 0.3 (o L2 (o L1 p0))) (SV.widen 0.3 (o L1 (o L2 p0))))

// ── Invariants widening must not break ──

[<Fact>]
let ``widen never refutes a candidate and preserves normalization`` () =
    let concentrated = soft [ cand 0, 0.97; cand 1, 0.02; cand 2, 0.01 ]
    let w = SV.widen 0.5 concentrated
    let ps = SV.candidates w |> List.map snd
    Assert.All(ps, fun p -> Assert.True(p > 0.0, "widening refuted a candidate"))
    Assert.True(approx (List.sum ps) 1.0, "widening broke normalization")
    Assert.True(SV.entropy w > SV.entropy concentrated, "widening did not increase entropy")

[<Fact>]
let ``widen on a point mass with one candidate is a no-op`` () =
    let pm = SV.certain (cand 0)
    Assert.True(sameDist pm (SV.widen 0.9 pm))

// ══════════════════════════════════════════════════════════════════════════════════════════
// THE NEAR-FLOOR CORNER — 081M1SA32SS087G0R0026C01ZP
//
// `falsifier 2` above uses likelihoods of 0.05/0.9, five orders of magnitude clear of the old
// `EPS = 1e-12` floor, so it could never reach the corner where the original implementation
// broke. It was NON-VACUOUS for the leak it was designed against (its mutant arm fails) and
// CONDITIONALLY VACUOUS with respect to this one — a check that passes because the input never
// approaches the guard. These tests supply the missing input.
//
// The original defect: `observe` normalized at every step, and `build` refused once total mass
// fell to or below EPS. That total is the POSTERIOR-WEIGHTED likelihood mean, so it depends on
// the prefix already folded — two nodes with the same evidence set could reach belief vs.
// contradiction. Confirmed in EXACT rational arithmetic (103/400 random sets disagreed under
// permutation at EPS=1e-12; 0/400 at EPS=0), so it was never a rounding artefact.
// ══════════════════════════════════════════════════════════════════════════════════════════

/// The counterexample from the bug, as likelihood tables. Both magnitudes sit far below the old
/// floor; their RATIO is what carries the information, which is exactly what log-space preserves.
let private tiny1 = lik [ 1.748758581843721e-13; 2.635587015937907e-12; 1e-13 ]
let private tiny2 = lik [ 8.934760094614835e-05; 8.639005238161121e-08; 1e-9 ]

[<Fact>]
let ``falsifier 5 - near-floor likelihoods commute (the corner falsifier 2 cannot reach)`` () =
    let evidence = [ ev 0L tiny1; ev 1L tiny2 ]
    let schedule = SV.window 10L
    let a = folded (SV.foldRetainedBounded schedule evidence uniform3)
    let b = folded (SV.foldRetainedBounded schedule (List.rev evidence) uniform3)
    Assert.True(sameDist a b, "near-floor evidence reordered changed the posterior")

[<Fact>]
let ``falsifier 5b - near-floor evidence still yields a posterior, not a contradiction`` () =
    // The original returned `None` for one of the two orderings. Neither ordering may now, and
    // this is the half that pins the ASYMMETRY rather than merely the agreement: two runs that
    // agree on `Contradicted` would satisfy 5 while still being the bug.
    for order in [ [ ev 0L tiny1; ev 1L tiny2 ]; [ ev 1L tiny2; ev 0L tiny1 ] ] do
        match SV.foldRetainedBounded (SV.window 10L) order uniform3 with
        | SV.Folded _ -> ()
        | other -> failwithf "near-floor evidence must still fold; got %A" other

[<Fact>]
let ``falsifier 6 - extreme dynamic range commutes over many reorderings`` () =
    // Magnitudes spanning ~1e-300, well past anything float multiplication survives without
    // log-space. Deterministic (seed 4), no ambient RNG.
    let rng = System.Random(4)
    let mk i =
        ev (int64 i) (lik [ 10.0 ** float (-60 - (i % 7) * 30)
                            10.0 ** float (-61 - (i % 5) * 30)
                            10.0 ** float (-62 - (i % 3) * 30) ])
    let evidence = [ for i in 0 .. 9 -> mk i ]
    let baseline = folded (SV.foldRetainedBounded (SV.window 100L) evidence uniform3)
    for _ in 1 .. 100 do
        let got = folded (SV.foldRetainedBounded (SV.window 100L) (shuffle rng evidence) uniform3)
        Assert.True(sameDist baseline got, "extreme-range evidence reordered changed the posterior")

[<Fact>]
let ``falsifier 7 - a genuine contradiction is reported as Contradicted, not Refused`` () =
    // Every candidate refuted by an exact-zero likelihood. Order-invariant: the survivor set is
    // an intersection. This is the one case that SHOULD refuse to produce a posterior.
    let refuteAll = lik [ 0.0; 0.0; 0.0 ]
    match SV.foldRetainedBounded (SV.window 10L) [ ev 0L refuteAll ] uniform3 with
    | SV.Contradicted -> ()
    | other -> failwithf "expected Contradicted; got %A" other

[<Fact>]
let ``falsifier 8 - the evidence-count bound REFUSES rather than serving slowly`` () =
    // The DoS guard. A refusal names its bound, which makes the divergence DECLARED - the
    // distinction the FoldOutcome type exists to carry.
    let tooMany = [ for i in 0 .. SV.MAX_EVIDENCE_COUNT -> ev (int64 i) A ]
    match SV.foldRetainedBounded (SV.window 10L) tooMany uniform3 with
    | SV.Refused (SV.EvidenceBudget (count, limit)) ->
        Assert.Equal(SV.MAX_EVIDENCE_COUNT + 1, count)
        Assert.Equal(SV.MAX_EVIDENCE_COUNT, limit)
    | other -> failwithf "expected Refused(EvidenceBudget ...); got %A" other

[<Fact>]
let ``falsifier 8b - the WORK bound catches what the count bound cannot`` () =
    // Few observations, enormous multiplicity: the count bound passes and the work bound must
    // catch it. Without this, `MAX_EVIDENCE_COUNT` alone would be a check that cannot fail for
    // the cost it is supposed to bound.
    let schedule : SV.RetentionSchedule = fun _ _ -> SV.MAX_MULTIPLICITY
    let few = [ for i in 0 .. 200 -> ev (int64 i) A ]
    match SV.foldRetainedBounded schedule few uniform3 with
    | SV.Refused (SV.WorkBudget (units, limit)) ->
        Assert.True(units > limit, "work budget refused without exceeding the limit")
        Assert.Equal(SV.MAX_FOLD_WORK, limit)
    | other -> failwithf "expected Refused(WorkBudget ...); got %A" other

[<Fact>]
let ``falsifier 8c - a fold just inside both bounds still succeeds (the bounds are not vacuous)`` () =
    // The other side of 8/8b: a guard that refused everything would pass them both while making
    // the operator useless. Pins that the ceiling is reachable-but-not-hit for ordinary input.
    let ok = [ for i in 0 .. 99 -> ev (int64 i) A ]
    match SV.foldRetainedBounded (SV.window 1000L) ok uniform3 with
    | SV.Folded _ -> ()
    | other -> failwithf "an ordinary fold must not be refused; got %A" other
