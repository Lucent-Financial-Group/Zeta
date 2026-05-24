# DBSP chain rule — Lean proof log

Round 35 opens the push on `tools/lean4/Lean4/DbspChainRule.lean`.
The file is structured as named sub-lemmas; the conceptual wall is
**B2 (`linear_commute_zInv`)**, not a tactic gap. This document
captures the current state, the B2 algebra-contract decision, the
attack order, and the Mathlib dependencies per sub-goal so the
work is pickup-ready across rounds.

Owner: lean4-expert. Architect gate: B2 contract extension.

---

## Current closed vs. open sub-goals

| ID | Statement | State | Blocker |
|---|---|---|---|
| T1 | `zInv_zero` — `z⁻¹ s 0 = 0` | **Closed** | — |
| T2 | `zInv_succ` — `z⁻¹ s (n+1) = s n` | **Closed** | — |
| T3 | `I_zInv_eq` — `I (z⁻¹ s) n = I s n - s n` | **Closed** | — |
| T4 | `D_I_eq` — `D (I s) = s` | **Closed** | — |
| T5 | `I_D_eq` — `I (D s) = s` | **Closed round 35** | — |
| B1 | `linear_commute_I` — `f (I s) = I (f s)` if `f` is linear + TI | **Closed round 35** (statement corrected) | — |
| B2 | `linear_commute_zInv` — time-invariant operators commute with `z⁻¹` | **Closed round 35** | Elevated to axiom via `IsTimeInvariant` |
| B3 | `linear_commute_D` — linear + time-invariant operators commute with `D` | **Closed round 35** | — |
| CR-LTI | `Dop_LTI_commute` — `Dop (f ∘ g) s = f (Dop g s)` for linear+TI f, g (formerly `chain_rule`; renamed round 35 after paper-drift audit found it was Thm 3.3 corollary, not Prop 3.2) | **Closed round 35** | — |
| CR-Prop3.2 | `chain_rule_proposition_3_2` — `Qdelta (Q1 ∘ Q2) s = Qdelta Q1 (Qdelta Q2 s)` with `Qdelta := D ∘ Q ∘ I`, **no preconditions** | **Closed round 35** | — |
| CRC | `chain_rule_id_corollary` | **Closed** (aliases `D_I_eq`) | — |
| PWL→TI | `IsPointwiseLinear.toTimeInvariant` | **Closed round 35** | Tactic: case-split on `n`, `map_zero` + `zInv_succ` |
| PWL→C | `IsPointwiseLinear.toCausal` | **Closed round 35** | Tactic: `hphi` rewrite + `h_agree` |

**Round 35 fully closed every proof body.** The file type-checks
against Mathlib `v4.30.0-rc1` with zero warnings and zero errors
via `lake env lean Lean4/DbspChainRule.lean` from
`tools/lean4/`. In addition to the four proof closures, round 35
corrected two statement bugs:

* **B1 statement fix.** The earlier form
  `f (I s) n = I (fun k => f (fun _ => s k) k) n` silently
  required `f` to be pointwise-linear — the very refinement we
  disentangled via `IsPointwiseLinear`. For generic
  `IsLinear ∧ IsTimeInvariant` operators the correct statement is
  the stream equation `f (I s) = I (f s)`, proved by establishing
  that both sides satisfy the recurrence `x = f s + zInv x` and
  inducting on the tick.
* **`chain_rule` statement fix.** The earlier "expanded bilinear"
  eight-term form with cancellation was unsound for composition.
  Impulse counter-example: `f = g = id`, `s = δ₀`, `n = 0` gave
  LHS `= 1` and RHS `= 0` — the putative cancellations never
  fire on the base case. Restated to the classical form
  `Dop (f ∘ g) s = f (Dop g s)`, which is the identity DBSP §4.2
  actually proves for compositions of linear time-invariant
  operators. The polymorphic `chain_rule_poly` over three
  distinct groups (with the genuine bilinear chain rule) is a
  future-round target.

* **Paper-drift audit (2026-04-19).** A subsequent peer-
  reviewer cross-check of the Lean statement against Budiu
  et al. `arXiv:2203.16684v1` §3 uncovered a second, more
  serious drift: the theorem named `chain_rule` was *not*
  Proposition 3.2 of the paper. The paper's Proposition 3.2
  states `(Q1 ∘ Q2)^Δ = Q1^Δ ∘ Q2^Δ` with
  `Q^Δ := D ∘ Q ∘ I` (Definition 3.1) and **no linearity or
  time-invariance preconditions**, proved in one line from
  Theorem 2.22 (`I ∘ D = id`) and composition associativity.
  Our `chain_rule` instead proved
  `Dop (f ∘ g) = f ∘ Dop g` with `Dop := f - f ∘ zInv` and
  both operators LTI — which reduces to
  `D ∘ f ∘ g = f ∘ D ∘ g` under the preconditions, i.e. a
  Theorem-3.3 corollary. Distinct theorem, different
  preconditions, different definitions. The audit landed
  three fixes in the same round:
  1. Renamed `chain_rule` → `Dop_LTI_commute` to match what
     it actually proves (a Thm-3.3 corollary), with a
     `@[deprecated]` alias for back-compat.
  2. Added `def Qdelta (Q) := fun s => D (Q (I s))` (paper
     Definition 3.1) and `theorem chain_rule_proposition_3_2`
     — verbatim paper statement, zero preconditions, one-line
     calc proof using `I_D_eq`.
  3. Scaffolded `.claude/skills/verification-drift-auditor/`
     and `docs/research/verification-registry.md` so the next
     drift of this class is caught on a scheduled audit rather
     than on a human spot-check. The round-35 audit report at
     `docs/research/verification-drift-audit-2026-04-19.md`
     logs this finding as the motivating case study.

Future work — `chain_rule_poly` over three distinct abelian
groups using a bilinear combinator, with the cross-term that
vanishes for composition but not for general `⊗`.

---

## B2 — the algebra-contract wall (resolved round 35)

The shipped `IsLinear` predicate in `DbspChainRule.lean`
(lines 174-178 pre-round-35) carried only two axioms:

```lean
structure IsLinear (f : Stream G → Stream H) : Prop where
  map_zero : f 0 = 0
  map_add  : ∀ s t, f (s + t) = f s + f t
```

Neither axiom closes B2. The failure cases were:

1. **At `n = 0`:** goal is `f (z⁻¹ s) 0 = 0`. But `z⁻¹ s` is not
   the zero stream — it is zero only at tick 0, arbitrary
   elsewhere. `map_zero` proves `f 0 0 = 0`, not `f (z⁻¹ s) 0 = 0`.
2. **At `n = k+1`:** goal is `f (z⁻¹ s) (k+1) = f s k`. No
   group-homomorphism axiom at the stream level forces this.

B2 is the statement that linear stream operators *commute with
delay*. At the DBSP paper level this is smuggled in as a
convention (Budiu et al. Proposition 3.5 uses it without
naming it); in Lean it must be an explicit part of the contract.

### Round-35 resolution — the hierarchy

Instead of forcing one monolithic predicate, round 35 landed a
stratified hierarchy in `DbspChainRule.lean`:

```lean
structure IsLinear (f : Stream G → Stream H) : Prop where
  map_zero : f 0 = 0
  map_add  : ∀ s t, f (s + t) = f s + f t

structure IsCausal (f : Stream G → Stream H) : Prop where
  causal : ∀ s t n, (∀ k, k ≤ n → s k = t k) → f s n = f t n

structure IsTimeInvariant (f : Stream G → Stream H) : Prop where
  commute_zInv : ∀ s n, f (zInv s) n = zInv (f s) n

structure IsPointwiseLinear (f : Stream G → Stream H) extends
    IsLinear f : Prop where
  pointwise : ∃ phi : G →+ H, ∀ s n, f s n = phi (s n)
```

* `IsLinear` stays as the baseline `AddMonoidHom`-shape predicate.
* `IsCausal` captures the "output at `n` depends on input at
  `≤ n`" property. True for every DBSP primitive.
* `IsTimeInvariant` captures B2 directly — it IS the axiom
  "commutes with delay", elevated from theorem to contract
  field.
* `IsPointwiseLinear` carries an explicit `phi : G →+ H` witness
  with `f s n = phi (s n)`. Disqualifies `I`, `D`, `zInv` (all
  integrate over history or shift).

B2 (`linear_commute_zInv`) now takes `(hti : IsTimeInvariant f)`
and the body is one line: `hti.commute_zInv s n`. `chain_rule`
and `linear_commute_D` take both `IsLinear ∧ IsTimeInvariant`.

### Why time-invariance-as-axiom, not causality-as-base

Causality alone is necessary but not sufficient for shift-
commutation: a causal linear operator with a time-dependent
kernel `h(n, k)` is still causal but need not commute with
`zInv`. The DBSP paper implicitly assumes the kernel is
translation-invariant, i.e., `h(n, k) = h(n-k)`. That's the
LTI-systems discipline. Making it axiomatic (`IsTimeInvariant`)
reflects DBSP's actual contract; causality stands alongside as
a separate structural predicate for callers who want it.

### Upgrade theorems landed

Two one-way derivations relate the strong pointwise refinement
to the two structural predicates:

* `IsPointwiseLinear.toCausal` — closed round 35 by `hphi`
  rewrite.
* `IsPointwiseLinear.toTimeInvariant` — closed round 35 by
  case-split on `n`, using `map_zero` for `n = 0` and
  `zInv_succ` for `n = k+1`.

A caller proving an operator is `IsPointwiseLinear` gets
`IsLinear` (inherited), `IsCausal`, and `IsTimeInvariant` for
free — matching the intuition that pointwise-linear is strictly
stronger.

### What pointwise explicitly does NOT include

`I`, `D`, `zInv` are `IsLinear ∧ IsCausal ∧ IsTimeInvariant` but
NOT `IsPointwiseLinear`. Their "no phi witness" property is
structural: `I s n = Σ_{i≤n} s i` depends on the whole prefix,
so there is no `phi : G →+ G` with `I s n = phi (s n)`. Future
rounds that prove `IsLinear` / `IsCausal` / `IsTimeInvariant`
instances for the DBSP primitives should NOT try to promote them
to `IsPointwiseLinear`.

### Three candidate extensions

Each candidate is a different axiom to add. Trade-off:
expressiveness (how many DBSP operators still qualify as
"linear") vs. proof economy (what B2 becomes).

#### (a) Causality

Add `causal : ∀ s t n, (∀ k, k ≤ n → s k = t k) → f s n = f t n`.

*"A linear operator's output at tick n depends only on input
ticks 0…n."*

* B2 closes via `causal` + `zInv_zero` at `n = 0`:
  `f (z⁻¹ s) 0` depends on `(z⁻¹ s) 0 = 0`, and `f` applied to
  the all-zero-at-prefix input gives `0` at tick 0 by `map_zero`.
  At `n = k+1`, use `causal` to match `f (z⁻¹ s) (k+1)` with
  the value determined by inputs at ticks 0…k+1 of `z⁻¹ s`,
  which are `0, s 0, s 1, …, s k`.
* **Fit for DBSP.** Every first-class DBSP operator
  (`D`, `I`, `z⁻¹`, lifted relational operators, retraction-
  aware map/filter) is causal by construction. Bilinear
  operators (join, cartesian) are causal on each argument
  given the other is held. Good fit.
* **Cost.** One extra axiom; proofs for concrete operators need
  a short causality proof each, but these are usually `rfl` or
  one-step induction.

#### (b) Time-invariance

Add `time_invariant : f ∘ z⁻¹ = z⁻¹ ∘ f`.

* B2 becomes trivial — this axiom **is** the B2 statement.
* But: begs the question. We would be asserting what we are
  trying to prove. Adopting this as an axiom is fine only if
  we are willing to stop claiming B2 is a *theorem*. Most DBSP
  writeups treat commutation-with-delay as a definition of
  "linear stream operator", which would justify this choice.
* **Cost.** Philosophically light, but downgrades the proof
  status of B2 from theorem to axiom. Paper-grade readers of
  the proof artifact may object.

#### (c) Pointwise action

Add `pointwise : ∃ phi : ℕ → (G → H), ∀ s n, f s n = phi n (s n)`
where each `phi n` is an `AddMonoidHom G H`.

* B2 closes: `f (z⁻¹ s) n = phi n ((z⁻¹ s) n)` and
  `z⁻¹ (f s) n = (f s) (n-1) = phi (n-1) (s (n-1))`.
  Then case-split on `n = 0` (both sides zero via `phi 0 0 =
  0` from `AddMonoidHom`) and `n = k+1` (substitute
  `(z⁻¹ s) (k+1) = s k`, want `phi (k+1) (s k) = phi k (s k)`).
  Fails! The pointwise family can depend on `n`, but the
  **same** `phi` must be used to close the equality — so the
  axiom must additionally assert `phi n = phi 0` for all `n`
  (i.e., `f s n = phi (s n)` with a *single* homomorphism).
* **Fit for DBSP.** `D`, `I`, `z⁻¹` themselves are **not**
  pointwise — `D s n = s n - s (n-1)` uses two input ticks.
  This axiom cuts out the operators whose commutation we
  actually care about. Poor fit.

### Recommendation — causality as base, pointwise as refinement

Candidates (a) and (c) are not peers. **Pointwise ⊂ Causal** — if
`f s n = φ(s n)` then the output at tick `n` depends only on the
input at tick `n`, which is a strict subset of "depends only on
inputs 0…n". Every pointwise-linear operator is already causal.
So pointwise isn't an alternative to causal; it's a strictly
stronger predicate.

Further: `D`, `I`, `z⁻¹` themselves are **causal but not
pointwise** — they read two or more input ticks. If pointwise
were the base axiom, the fundamental DBSP operators would stop
qualifying as `IsLinear`, which is backwards.

Therefore: **(a) causality is the core `IsLinear` extension. (c)
pointwise becomes an optional refinement predicate that derives
`IsLinear`**.

Sketched hierarchy:

```lean
-- Core: causality-extended IsLinear. B2 and chain_rule use this.
structure IsLinear (f : Stream G → Stream H) : Prop where
  map_zero : f 0 = 0
  map_add  : ∀ s t, f (s + t) = f s + f t
  causal   : ∀ s t n, (∀ k, k ≤ n → s k = t k) → f s n = f t n

-- Refinement (optional): for operators that are strictly
-- pointwise. Derives IsLinear by the inclusion proved below;
-- earns extra rewrite lemmas specific to pointwise action.
structure IsPointwiseLinear (f : Stream G → Stream H)
    extends IsLinear f : Prop where
  pointwise : ∃ phi : G →+ H, ∀ s n, f s n = phi (s n)

theorem IsPointwiseLinear.toIsLinear {f} (h : IsPointwiseLinear f) :
    IsLinear f := h.toIsLinear
```

Under this shape:

* `chain_rule` and `B2` are stated once, against `IsLinear`
  (causal). No duplication.
* Strictly-pointwise operators (scalar `map (· * c)` on Z-sets,
  lifted `AddMonoidHom` over Z-set keys) get the
  `IsPointwiseLinear` instance for free and unlock future
  pointwise-specific rewrite lemmas without affecting the core
  proof.
* `D`, `I`, `z⁻¹` carry `IsLinear` (causal) only — no pressure
  to fake pointwise-ness. Correct by the DBSP literature.
* Time-invariance (candidate (b)) stays rejected — adopting it
  as an axiom begs the B2 question; time-invariance is a
  *consequence* of causality for specific operators, not an
  axiom to assume.

Trade-off note: under causality, `D`, `I`, `z⁻¹` all qualify;
hash-partitioned shuffles that re-order ticks do **not**, which
is the right answer for the DBSP literature but may be worth
flagging in a future ADR if retraction-safe reshuffle ever
becomes a thing.

Record as ADR
`docs/DECISIONS/YYYY-MM-DD-bp-NN-islinear-causality-hierarchy.md`
once the Architect concurs. The ADR records both predicates and
the inclusion theorem, so future readers see both layers at once.

---

## Attack order for round 35 and beyond

1. **Architect decision on B2 contract extension.** 30-min
   conference — lean4-expert + algebra-owner. Output: picks (a)
   causality (recommended) or documents counter-evidence.
   *Round 35.*
2. **Close T5** — telescoping sum `I (D s) = s`. Mathlib:
   `Finset.sum_range_succ_comm`, `Finset.sum_range_induction`.
   Est. 1 afternoon. *Round 35.*
3. **Close B1** — `f (I s) = I (f ∘ s)`. Mathlib:
   `AddMonoidHom.map_finset_sum` or equivalent over the
   `Finsupp.sumAddHom` surface. Est. 1 day. *Round 35.*
4. **Extend `IsLinear` per (a) + re-prove `D`, `I`, `z⁻¹` as
   `IsLinear` on their canonical lifts.** Est. 0.5 day. *Round
   35.*
5. **Close B2 using causality.** Case-split on `n`, close tick-0
   via `zInv_zero` + `map_zero` + `causal`, close `n = k+1` via
   `causal` restricted to prefix `{0, …, k+1}` of `z⁻¹ s`. Est.
   1 day. *Round 35.*
6. **Close B3 from B2.** Trivial: `D s = s - z⁻¹ s`, distribute
   `f` via `map_add`/`map_neg`, apply B2. Est. 1 hour. *Round 35-36.*
7. **Close `chain_rule`** via the `calc` block sketched in
   comments at `DbspChainRule.lean:376-388`. Est. 2 days. *Round
   36.*
8. **Ship `chain_rule_poly` in a future round** — fully
   polymorphic G → H → J chain. Nice-to-have; not a v1
   blocker. *Post round 36.*

If rounds 35 and 36 both close, **Zeta ships a machine-checked
DBSP chain rule in Q2 2026** — the top item in
`docs/research/proof-tool-coverage.md`.

---

## Mathlib dependencies by sub-goal

Snapshot against Mathlib v4.30.0-rc1 (the installed toolchain).

| Sub-goal | Mathlib imports needed |
|---|---|
| T5 | `Mathlib.Algebra.BigOperators.Group.Finset` (`Finset.sum_range_succ`, `Finset.sum_range_induction`) |
| B1 | `Mathlib.Algebra.Group.Hom.Defs`, `Mathlib.Algebra.BigOperators.Group.Finset` |
| B2 | only the new `causal` axiom; no new Mathlib imports |
| B3 | `Mathlib.Algebra.Group.Basic` (`neg_add_cancel`) |
| CR | all of the above, plus `abel`/`ring` tactic |

Already imported in `DbspChainRule.lean:70-74`. No `Cargo.toml`-
equivalent change required.

---

## Related BACKLOG cleanup

BACKLOG.md:142-145 cites the retired path `proofs/lean/ChainRule.lean`.
The proof migrated round 23 to `tools/lean4/Lean4/DbspChainRule.lean`.
Update the BACKLOG entry to the current path as part of round 35.

TECH-RADAR row "Lean 4 + Mathlib" (round-10 Assess) should move
to Trial when B2 closes and to Adopt when `chain_rule` closes.

---

## Reference patterns

* `tools/lean4/Lean4/DbspChainRule.lean` — the proof file
* `docs/research/proof-tool-coverage.md` — the roadmap
* `docs/research/mathlib-progress.md` — prior Mathlib navigation notes
* `.claude/skills/lean4-expert/SKILL.md` — the tactic driver
* `.claude/skills/formal-verification-expert/SKILL.md` — tool-fit
  routing (Soraya); confirms Lean is right for this goal
* `docs/DECISIONS/` — where the B2 contract extension ADR will land
