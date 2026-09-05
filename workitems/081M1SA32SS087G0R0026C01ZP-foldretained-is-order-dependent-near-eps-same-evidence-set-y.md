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

## DIAGNOSIS SETTLED — it is NOT rounding error, and that makes the fix clearer

Aaron asked the decisive question: *"is th[is] because of rounding errors? if so we can beef this
up with like bigint/bigfloat. if not, then near the floor we will need to create forced consensus
and delay to enforce order, or choose to exit and fork — we don't want acci[dent]al forks, just
ones on purpose."*

**Answered by re-running the counterexample in exact rational arithmetic (`Fraction`), seed 4:**

```
EXACT Q, eps=1e-12   L1 then L2: Some [0.98564, 0.01436]
EXACT Q, eps=1e-12   L2 then L1: None (refused, total = 1.773e-13)     <-- still diverges

EXACT Q, eps=0       L1 then L2: Some [0.9856369941, 0.0143630059]
EXACT Q, eps=0       L2 then L1: Some [0.9856369941, 0.0143630059]     <-- identical
```

and generalised with a randomised property check over permutations of whole evidence sets
(2-4 candidates, 2-5 observations, dynamic range to 1e-18, 15% exact-zero likelihoods so genuine
refutations are covered), **all in exact ℚ**:

| threshold | evidence sets where some permutation disagreed |
|---|---|
| `eps = 1e-12` | **103 / 400** |
| `eps = 0` | **0 / 400** |

**So: no rounding is involved. The THRESHOLD is the defect.** The quantity being thresholded —
the posterior-weighted likelihood mean — is prefix-dependent *as mathematics*, so comparing it
against any strictly positive constant is an order-dependent test no matter how many bits it is
computed in. bigfloat with the same `EPS` would fail identically.

**But Aaron's bigint/bigfloat instinct is still the right fix, by a different mechanism.** At
`eps = 0` the predicate becomes *"is the current support empty"*, and that IS order-invariant:
the final support is the **intersection** over all evidence, intersection is commutative, and
supports shrink monotonically toward it — so no prefix can be empty unless the intersection is.
The reason `EPS` is nonzero in the first place is **float underflow**: with `float64`,
`p_i · L(i)` can reach `0.0` and silently drop a candidate. So exactness does not fix the
rounding (there is none) — **it removes the need for the guard that is causing the problem.**

### Consequence for the four candidate fixes above

Option 1 (test the predicate on the order-invariant support) and option 2 (exact/extended range)
are **not alternatives — they are the same fix and they need each other**: setting `eps = 0` is
only safe in a representation that cannot underflow to zero spuriously. The repo already has the
exact side of this (`RationalRing`, and the four-oracle byte-lock discipline that made
tempering's `p^β` unacceptable *precisely because it is irrational for rational p*).

Options 3 and 4 are now clearly inferior: they relocate the discontinuity rather than removing it.

**Cost to weigh before choosing:** exact ℚ denominators grow with fold length, which is the
ordinary reason posteriors are kept in floats or logs. Log-space *extends* the range (the corner
becomes unreachable at ~1e-308 rather than 1e-12) but does **not** remove the discontinuity —
"unreachable in practice" is the class of claim this repo refuses, so it is a mitigation, not a
fix.

### Aaron's fallback is not needed — but his REQUIREMENT names what is wrong today

Forced consensus with delay, or a deliberate exit-and-fork, would be the answer if the divergence
were irreducible. It is not. What his sentence does supply is the correct statement of the
current defect:

> *"we don't want accidental forks, just ones on purpose."*

Today, near the floor, two nodes with the same evidence **fork accidentally and silently** — one
holds a belief, the other reports contradiction, and nothing signals that they disagree. Even
under a mitigation rather than a fix, the divergence must become **detectable**, because an
undetected fork is strictly worse than a declared one.
