# Trajectory — DBSP Operator Algebra

## Scope

The mathematical core of Zeta — the DBSP operator algebra
(D, I, z⁻¹, H operators), retraction-native semantics
(Z-set algebra), composition rules (chain rule, integral rule),
homomorphism catalog (B-0051), and the theorem catalog with
formal-verification mapping (Lean / TLA+ / Z3 / Alloy / FsCheck).
Open-ended because new lemmas land continuously, the
Stainback conjecture has multiple sub-claims still in flight,
and Mathlib provides upstream lemma support that grows.
Bar: every load-bearing claim has a proof or a test; the
algebra is internally consistent; new theorems extend the
catalog without contradicting prior ones.

## Cadence

- **Per-claim**: when a claim is asserted in code/spec/research,
  it routes through the formal-verification-expert for tool
  selection (BP-16) and lands in the theorem catalog.
- **Per-Mathlib-update**: when Mathlib gains a relevant lemma,
  Zeta-side proof-port candidate.
- **Per-paper**: when a paper-grade write-up is in flight, the
  theorem catalog is the source of truth.

## Current state (2026-04-28)

- **Chain rule** — formalized in Lean
  (`tools/lean4/Lean4/DbspChainRule.lean`)
- **Integral rule** — formalized
- **Retraction-native composition** — semantics documented in
  `openspec/specs/operator-algebra/`
- **Homomorphism catalog** (B-0051) — IF1-IF4 grading per
  isomorphism candidate
- **Stainback conjecture** — chain-rule lemma landed; rest in
  flight
- **Z-set algebra** — `src/Core/ZSet.fs`; columnar storage;
  retraction discipline
- **Operator algebra reviewer**: `algebra-owner` skill (binding
  on operator-algebra changes)
- **Categorical framing**: `category-theory-expert` skill;
  retraction as functor
- **DBSP origin paper**: Budiu et al., "DBSP: Automatic
  Incremental View Maintenance for Rich Query Languages,"
  VLDB'23 best paper + 2024 ACM SIGMOD research highlight

## Target state

- Stainback conjecture fully formalized in Mathlib (eventually
  upstream-ported).
- Theorem catalog enumerates every claimed property with its
  formal-verification artifact.
- B-0051 homomorphism catalog converges to a small set of
  load-bearing isomorphisms with full proofs.
- Lean reflection (B-0050) drops the boilerplate-vs-creative
  ratio so theorem-catalog growth becomes mechanizable.
- Cross-language proof-port: Lean ↔ TLA+ for distributed-protocol
  claims; Lean ↔ Z3 for decision-procedure-style claims.

## What's left

In leverage order:

1. **Stainback conjecture next-lemma** — chain-rule done; what
   sub-claim is in flight; ETA.
2. **Lean reflection** (B-0050) — staged 5-stage trajectory;
   unlocks mechanized theorem growth.
3. **Theorem catalog format** — currently scattered across
   `tools/lean4/` + `tools/Z3/` + spec files; could benefit
   from a unified catalog index.
4. **Mathlib upstream-port audit** — proofs we've landed that
   could go upstream; scope candidates.
5. **B-0051 catalog convergence** — IF1-IF4 grading complete?
   Which homomorphisms are load-bearing vs decorative?
6. **Paper draft on the algebra** — Zeta's contribution;
   peer-review trajectory (separate from this).

## Recent activity + forecast

- 2026-04-27: chain-rule Lean proof landed.
- 2026-04-26: B-0051 isomorphism catalog with IF1-IF4 grading.
- 2026-04-26: B-0050 Lean reflection trajectory (staged 5-stage).
- 2026-04-26: B-0048 retraction-algebra isomorphism work.

**Forecast (next 1-3 months):**

- Next Stainback conjecture sub-claim formalization.
- B-0050 Lean reflection skill landing → theorem-growth pace
  accelerates.
- Possible Mathlib upstream-port PR for chain-rule-class
  lemmas if Mathlib doesn't already have them.
- Paper draft trajectory — separate trajectory candidate when
  draft-stage starts.

## Pointers

- Skill: `.claude/skills/algebra-owner/SKILL.md` (binding on operator-algebra)
- Skill: `.claude/skills/lean4-expert/SKILL.md`
- Skill: `.claude/skills/category-theory-expert/SKILL.md`
- Skill: `.claude/skills/relational-algebra-expert/SKILL.md`
- Skill: `.claude/skills/streaming-incremental-expert/SKILL.md`
- Skill: `.claude/skills/measure-theory-and-signed-measures-expert/SKILL.md`
- Skill: `.claude/skills/duality-expert/SKILL.md`
- Code: `src/Core/` (operator algebra + ZSet)
- Spec: `openspec/specs/operator-algebra/`
- Proofs: `tools/lean4/Lean4/`
- BACKLOG: B-0048, B-0050, B-0051

## Research / news cadence

External tracking required — this is an active-tracking trajectory.

| Source | What to watch | Cadence |
|---|---|---|
| Mathlib4 releases | New lemmas relevant to DBSP / measure theory / category theory / signed measures | Monthly |
| VLDB papers (DBSP origin venue) | Streaming + IVM research extending DBSP | Per-conference |
| SIGMOD / PODS papers | Database theory + streaming research | Per-conference |
| POPL / ICFP / LICS papers | Type theory + categorical semantics relevant to retraction-native composition | Per-conference |
| Differential dataflow / Materialize / Feldera releases | Industry implementations of DBSP-class systems | Per-release |
| Lean 4 release notes (impact on proof tooling) | Tactic / elaboration improvements affecting proof productivity | Per-release |

Findings capture: relevant lemma → BACKLOG row + theorem catalog
update; relevant paper → research-doc absorb under
`docs/research/`; relevant industry implementation → tech radar
row.
