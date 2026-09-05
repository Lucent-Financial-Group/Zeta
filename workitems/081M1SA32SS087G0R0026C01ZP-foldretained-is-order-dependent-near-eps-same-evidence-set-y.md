---
id: 081M1SA32SS087G0R0026C01ZP
type: bug
state: backlog
priority: P2
slug: foldretained-is-order-dependent-near-eps-same-evidence-set-y
title: "foldRetained is order-dependent near EPS: same evidence set yields belief vs contradiction"
created: 2026-09-05T17:33:04.697Z
depends_on: []
composes_with: []
---

# foldRetained is order-dependent near EPS: same evidence set yields belief vs contradiction

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1SA32SS087G0R0026C01ZP-*.md` glob. -->

## The defect

`SoftValue.foldRetained` is documented as **commutative by construction** — *"the result is a
function of the evidence SET and the phases carried in it, never of arrival order, so two nodes
that receive the same evidence in different orders reach the same posterior"* (`SoftValue.fs:427`).

**That holds for the numeric result and fails for the CONTRADICTION PREDICATE.**

`build` refuses when the total mass is at or below a floor — `src/Core/SoftValue.fs:78`:

```fsharp
if WeightedSet.isEmpty merged || total <= EPS then None    // EPS = 1e-12, :56
```

and `observe` (`:136`) feeds `build` the *posterior-weighted* likelihood mean
`Σᵢ pᵢ · L(i)`. That mean depends on the prefix already folded, so **the `None` predicate is
order-dependent even though the normalized product is not.**

## Counterexample (verified by hand, then by the math review)

Two candidates, uniform prior:

```
L1 = { c0: 1.748758581843721e-13, c1: 2.635587015937907e-12 }
L2 = { c0: 8.934760094614835e-05, c1: 8.639005238161121e-08 }

L1 then L2  ->  Some { c0: 0.98564, c1: 0.01436 }    (means 1.405e-12, 5.64e-6  — both > EPS)
L2 then L1  ->  None                                  (means 4.47e-5, 1.77e-13 — second <= EPS)
```

Hand-check of the second ordering: `L2` first gives `total = 0.5·8.93e-5 + 0.5·8.64e-8 ≈ 4.47e-5`,
passing, and a posterior ≈ 99.9% on `c0`. Folding `L1` into that then gives
`total ≈ 0.999·1.75e-13 + 0.001·2.64e-12 ≈ 1.78e-13`, which is **below `EPS = 1e-12`** — refused.
The first ordering never concentrates on `c0`, so its `L1` mean stays above the floor.

## Why this is the exact failure the operator exists to prevent

Two nodes holding the **same evidence set**, differing only in arrival order, diverge into
**belief vs. contradiction** — not two slightly different posteriors, but one node with an answer
and one node reporting that every candidate is refuted. That is a local-order leak into a shared
conclusion, which `.claude/rules/local-time-never-enters-the-shared-fold.md` forbids and which
`foldRetained` was built specifically to close.

## Why the existing falsifier does not catch it

`tests/Tests.FSharp/SoftValueWidening.Tests.fs:80` runs 200 seeded reorderings and is
**non-vacuous** for the leak it was designed against (it has an arrival-order mutant arm that
fails). But its likelihoods are `0.05 / 0.9` (`:37-38`), five orders of magnitude clear of the
floor, so the test **cannot reach this corner**. It is conditionally vacuous with respect to it —
a check that passes because the input never approaches the guard, which is the same class as a
test passing because an earlier guard fired.

## Sufficient condition for the documented behaviour to be true

**Every likelihood value on the support > `EPS`.** Then every posterior-weighted mean is
`≥ min L > EPS` and the refusal can never fire mid-fold. This condition is currently **stated
nowhere** — not in `SoftValue.fs`, not in the tests, not in a workitem.

## Candidate fixes (not yet chosen — the tradeoff is real)

1. **Test the predicate on an order-invariant quantity.** Refuse on the *support* being empty
   (every candidate exactly refuted, which is order-invariant) rather than on the mass falling
   below a floor. Loses the underflow guard the floor was providing.
2. **Carry log-weights.** Removes the dynamic-range problem at its root; changes the ring and
   touches the float/exact boundary, so it is not a local edit.
3. **Renormalize per step** so the mean cannot drift toward the floor. Cheapest, but it moves
   rather than removes the discontinuity.
4. **Document the precondition and enforce it at the boundary** — refuse likelihoods below a
   declared floor on the way in, rather than refusing the fold silently mid-way.

Option 1 is the most honest about what the operator claims; option 4 is the smallest change that
makes the current claim true. Needs a decision before code.

## Related, already filed

A **second, weaker** discontinuity — support divergence when a weight underflows to `0.0` and the
candidate is dropped permanently (`build`'s `w > 0.0` filter, `:72`) — is already tracked as
`081M0R5R1JN087G0R0031FT1C2`, but framed as *determinism across oracles*. The
order-dependence-within-one-oracle form above is the sharper statement of the same underlying
dynamic-range problem.
