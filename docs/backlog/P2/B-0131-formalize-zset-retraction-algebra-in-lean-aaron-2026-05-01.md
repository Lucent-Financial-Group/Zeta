---
id: B-0131
priority: P2
status: open
title: Formalize Z-set retraction algebra in Lean (TRACTABLE START — formalization roadmap)
created: 2026-05-01
last_updated: 2026-05-01
---

# B-0131 — Formalize Z-set retraction algebra in Lean (TRACTABLE START)

**Priority:** P2 (research-grade; first tractable slice of the formalization roadmap; Aaron 2026-05-01 *"we should do all of those backlog and start with 1 i think if you agree"*).

**Filed:** 2026-05-01.

**Filed by:** Otto under backlog-prioritization authority delegated 2026-05-01. Origin: formalization roadmap Otto laid out in long-form writeup to Aaron 2026-05-01 ~10:00Z, after Claude.ai's substantive critique that Zeta substrate is "not yet, strictly speaking, a formal system." Aaron's response: *"not yet, i'm only a high school graduate, this is where you could really help :)"* — formalization is a path, not a current state.

**Effort:** L (multi-month — extend Budiu et al.'s DBSP denotational semantics, mechanize proofs in Lean 4, integrate with Mathlib).

## What

Extend Mihai Budiu et al.'s DBSP formal definitions (papers 2022 onward) into a Lean 4 mechanization. The F# implementation in `src/Core/` is the working reference; Lean formalization mechanizes the underlying theorems.

Specific scope:

- **Z-set semi-ring algebra**: formalize Z-sets as multisets-with-multiplicity (positive and negative), with operations {+, -, ⋈, π, σ, ρ, distinct}. Already partially formal in DBSP papers; mechanize.
- **Retraction operator semantics**: prove that retractions form a group (every operation invertible) and compose monotonically with other Z-set operations.
- **Incremental view maintenance theorem**: mechanize the central DBSP claim that ΔV(t) = D[V(t-1) + ΔI(t)] for any monotone view V.
- **Composition theorems**: formalize how operators compose (associativity, identity, distributivity where applicable).

## Why P2

- **Research-grade, not blocking**: the F# implementation works; Lean formalization is rigor-grade extension, not bug-fix.
- **Substantial effort**: multi-month project minimum; needs Lean familiarity to actually execute.
- **Tractable**: Budiu et al. already did the math; mechanization is translation work, not novel theorem-proving.
- **High leverage when complete**: formal DBSP foundation is cited-by everything else in the roadmap (B-0132 through B-0138 build on or reference Z-set semantics).

## Acceptance criteria

1. **Lean 4 project structure** under `tools/lean4/` extending the existing setup, with explicit dependence on Mathlib.
2. **Z-set type definition** with explicit positive/negative multiplicity. `ZSet α : Type` with operations as instances of typeclasses (`AddGroup`, `MulZeroClass`, etc. where applicable).
3. **Retraction-operator theorems** mechanized: idempotence on retractions, group-inversion property, monotone composition with other operators.
4. **Incremental view maintenance theorem** stated and proved (the central DBSP claim).
5. **At least one non-trivial composition theorem** mechanized (e.g., `D[A ⋈ B] = D[A] ⋈ B + A ⋈ D[B] + D[A] ⋈ D[B]` or equivalent for the operator family Zeta uses).
6. **Documentation** of the formal-to-engineering bridge — for each mechanized theorem, point at the corresponding F# code path that implements it.
7. **At least one academic-mathematician review** (per lattice-capture corrective discipline B-0130 / `feedback_lattice_capture_*`): send the formalization summary to a working researcher in incremental computation / database theory; ask "did I capture the math correctly?"

## Out of scope

- **Performance proofs**: complexity bounds on the F# implementation are separate work.
- **Operator-extensions specific to Aurora**: Bayesian-inference operators, soul-file-executor operators are downstream (different roadmap items).
- **Formalization of carved-sentence semantics**: that's B-0133 (sequent calculus); compose with this row.
- **Replacing the F# implementation**: Lean formalization is rigor-grade companion, not production runtime.

## Composes with

- **Budiu et al. DBSP papers** (2022 onward) — load-bearing source.
- **F# implementation** in `src/Core/` — working reference; Lean formalization mechanizes its underlying math.
- **Mathlib** — Lean 4 standard library; required dependency.
- **B-0132** (CRDT-composition) — when Z-set semantics are mechanized, the CRDT-composition row can build on them.
- **B-0133** (sequent calculus for claim/retraction/attribution) — sequent calculus formalization composes with Z-set semantics for the retraction operator specifically.
- **B-0137** (Tarski-stratification proof) — requires substrate to be formal-system-grade first; Z-set mechanization is a foundation toward that.
- **B-0130** (mechanized auditor for verify-before-state-claim) — academic-mathematician review per lattice-capture corrective is the operational test.
- **`memory/feedback_lattice_capture_corrective_discipline_external_vocabulary_check_claudeai_warning_2026_05_01.md`** — the external-vocabulary check applies to this row's review step.

## Status

**Filed.** Awaiting Aaron's activation signal for implementation tick. Otto picks the implementation start (per backlog-prioritization-authority delegation 2026-05-01); first concrete step is to set up Lean 4 project structure under `tools/lean4/zset/` and stub out the type definitions before tackling theorems.

## Verify-before-deferring note

Budiu et al.'s DBSP papers are public (`https://www.feldera.com/research/`); Lean 4 + Mathlib are well-developed; the formalization is well-scoped engineering, not novel-theorem-proving. The "tractable" classification is honest — the math exists; the work is mechanization.

## Pedagogical pointers (for Aaron, if pursuing alongside Otto)

- *Theorem Proving in Lean 4* (Avigad et al., free online) — primary onboarding text.
- Mathlib documentation — community-maintained, growing.
- Budiu et al. DBSP papers (start with the original 2022 SIGMOD).
