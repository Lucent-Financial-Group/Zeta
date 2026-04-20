# Refinement-Type Feature Catalog

**Round 35, 2026-04-19.** Motivated by the LiquidF# Day-0 Hold
verdict (`docs/research/liquidfsharp-findings.md`). The user's
ask: "pull all the good rules from LiquidF# and F\* and keep a
backlog of any we didn't port over yet — we want all the Liquid
features eventually."

This document is the single catalog. Each row is one feature
with origin, best tool in our portfolio, status, payoff, effort,
owner. Read it as a dependency-inverted backlog: we are not
trying to be F\* or LiquidHaskell, we are trying to *cover the
feature set those tools cover* using the tools we already have
(Lean 4, TLA+, Z3, FsCheck) — and escalate only when the gap
forces us to.

**Owner:** formal-verification-expert (Soraya).
**Cadence:** re-audit each round a new refinement-bearing
feature lands; full sweep every 5-10 rounds alongside the
`verification-drift-auditor` run.

---

## How to read a row

| Column | Meaning |
|---|---|
| **Feature** | Short name of the capability. |
| **Origin** | Where this feature was first shipped or named (LH = LiquidHaskell; LF = LiquidF#/F7; F\* = F\*; other). |
| **What it catches** | The bug class the feature prevents. |
| **Our tool** | Which member of our verification portfolio covers it today — or `—` if uncovered. |
| **Status** | `Ported` (we have equivalent coverage) · `Partial` (covered at a weaker level) · `Backlog` (gap, want it) · `Declined` (gap, don't want it; reason cited). |
| **Payoff** | H / M / L — how much real Zeta bug risk this feature retires. |
| **Effort** | S / M / L — Zeta-round sizing; S ≤ 1 day, M 1-3 days, L 3+ days. |
| **Owner** | Persona who owns the port, when one exists. |

---

## Core refinement-type features

| # | Feature | Origin | What it catches | Our tool | Status | Payoff | Effort | Owner |
|---|---------|--------|-----------------|----------|--------|--------|--------|-------|
| 1 | Base refinement types `{v : T \| p v}` | LH, F\*, F7 | "index out of range", "divisor zero", "length mismatch" at the type level | Z3 (post-hoc via lemmas) + FsCheck (property-level) | **Partial** | H | L | Soraya |
| 2 | Measures (user-defined Int-valued fns on ADTs, e.g. `len`, `size`, `height`) | LH | Reasoning about recursive data shape inside types | Lean 4 (as definitions) | **Partial** (Lean yes, F#-source no) | H | L | Soraya |
| 3 | Uninterpreted measures | LH | Measure exists but SMT can't unfold — useful for opaque abstractions | — | **Backlog** | L | M | — |
| 4 | Termination checking (lexicographic, structural) | LH (96% auto), F\* | Non-terminating recursion silently produces bottom | Lean 4 (Mathlib `termination_by`) | **Partial** (Lean theorems only, F# source uncovered) | H | L | Soraya |
| 5 | Totality checking | LH, F\* (Pure effect) | Partial functions crashing at runtime | Lean 4 + manual F# review | **Partial** | H | L | Soraya |
| 6 | Polymorphic refinements (refinement over `'a`) | LH | Generic combinators that carry their invariant | Lean 4 (dependent types) | **Partial** (Lean only) | M | L | Soraya |
| 7 | Bounded refinements (abstract refinement predicates) | LH | "is-sorted", "is-balanced" as abstract predicates composable across APIs | — | **Backlog** | M | L | — |
| 8 | Refined type aliases (`type Pos = {v:Int \| v > 0}`) | LH, F\* | Zero-cost documentation of pre/post-conditions at API boundaries | F# type aliases + XML docs (weak) | **Partial** | M | S | Ilyana (public-API) |
| 9 | Refined data constructors (`{Cons x xs \| len xs >= 0}`) | LH | Illegal states unrepresentable at type level | F# discriminated unions (no refinement) | **Partial** | H | M | Ilyana |
| 10 | Higher-order refinements (`(x:Int -> {v:Int \| v >= x}) -> ...`) | LH, F\* | Callback contracts: the caller enforces the callee's pre-condition | FsCheck properties over HOFs | **Partial** | M | M | Soraya |

## F\*-specific features (effect / Hoare / separation)

| # | Feature | Origin | What it catches | Our tool | Status | Payoff | Effort | Owner |
|---|---------|--------|-----------------|----------|--------|--------|--------|-------|
| 11 | Effect system (`Pure`, `Ghost`, `Dv`, `ST`) | F\* | Non-pure code in a pure context; divergence leaking into pure | F# purity-by-convention; audit via `purity-gatekeeper` | **Backlog** | H | L | — |
| 12 | Hoare triples `Pure a (req pre) (ens post)` | F\*, Dafny | Pre/post-condition violations at call site | Z3 pointwise lemmas (per-function) | **Partial** (case-by-case, not uniform) | H | L | Soraya |
| 13 | Separation logic — Pulse / Steel DSL | F\* | Heap aliasing and memory-ownership bugs in stateful code | — | **Backlog** | M | L | — |
| 14 | Tactics (Meta-F\*) — programmable proof automation | F\*, Lean | Hand-writing the same shape of proof over and over | Lean 4 tactics (`simp`, `decide`, `omega`) | **Ported** | M | — | Soraya |
| 15 | Dependent types (Π-types on values) | F\*, Lean | "output type depends on input value" — e.g. a vector indexed by length | Lean 4 (`Fin n`, `Vector`) | **Ported** | H | — | Soraya |
| 16 | Extraction to OCaml / F# / C | F\* | Verified spec becomes runnable executable without a re-implementation step | F\* → F# backend (documented dormant per round-35 Day-0) | **Partial** (backend exists but not blessed) | H | L | Soraya |
| 17 | SMT-backed automation with proof certificates | F\*, LH | Closing "obvious" obligations without hand-proof, while remaining checkable | Z3 called from TLA+ or FsCheck (no certificates stored) | **Partial** | M | M | Soraya |

## LiquidHaskell ergonomic features (gap list — we want these eventually)

| # | Feature | Origin | What it catches | Our tool | Status | Payoff | Effort | Owner |
|---|---------|--------|-----------------|----------|--------|--------|--------|-------|
| 18 | Specification in source comments (`{-@ ... @-}`) — keep proof-obligations co-located with code | LH | Proof drift when spec and code live in different files | Inline XML doc + separate Lean file (drift risk) | **Backlog** | H | M | — |
| 19 | `--reflection` (function bodies become first-class in logic) | LH | "is this proof about the same function we ship?" | Manual mirror functions in Lean | **Backlog** | M | L | — |
| 20 | `--ple` (Proof-by-Logical-Evaluation — unfold recursive functions automatically) | LH | Repetitive hand-unfold of recursive definitions in proofs | Lean `simp` + manual unfolds | **Partial** | L | M | Soraya |
| 21 | Client-side refinements (caller must prove the pre-condition to compile) | LH, F\* | API abuse at compile time rather than at test time | FsCheck precondition filters (runtime only) | **Backlog** | H | L | — |
| 22 | Counterexamples on failed verification | LH, F\* | Debug-friendly failure output rather than "couldn't prove" | Z3 model output (partial); FsCheck shrink output | **Partial** | M | M | Soraya |
| 23 | Refinement over type classes (constrained polymorphism) | LH | Generic code with instance-specific refinement | F# SRTP + Lean typeclasses | **Partial** | L | L | Soraya |
| 24 | Numeric refinements over bitvectors (e.g. `{v:BV64 \| v & 0x7 = 0}`) | LH, F\* | Off-by-one / alignment / bitmask errors at the type level | Z3 bitvector theory (per-lemma) | **Partial** | H | L | Soraya |

## Features we will not port

| # | Feature | Origin | Why declined |
|---|---------|--------|--------------|
| D1 | Haskell `IO` / laziness-aware refinements | LH | F# is strict-eager and `IO` is not a monad here. Feature has no analogue. |
| D2 | F\* `machine_int` with wrap-around semantics as a default | F\* | F# `int` wraps on overflow by default anyway; the CLR guarantee is the spec. We already audit overflow via `checked` blocks and Z3 lemmas. |
| D3 | Whole-program ANF transformation for proof obligations | F\* | F\* uses ANF internally; exposing it at the source level breaks F# ergonomics with no payoff for our bug class. |
| D4 | Classical-logic axioms beyond choice | Lean, F\* | We do not want to widen our trust base beyond Lean 4 + Mathlib + Z3 unsat cores. Each new axiom is an attack surface per Nazar. |

## Backlog rollup — what's missing, in priority order

Ranked by (payoff × bug-class-frequency) / effort. This is the
queue for the 5-10-round sweep.

1. **#11 Effect system** (H payoff) — F# has purity-by-convention
   and `purity-gatekeeper` at review time; a type-level effect
   marker would catch "I added an `ST` call inside a pure
   operator" *at compile time*. Touches the DBSP algebra core
   where non-purity is a correctness bug, not just a style one.
   Owner candidate: `fsharp-expert` + Soraya. Effort L.
2. **#21 Client-side refinements** (H payoff) — the biggest
   gap between "FsCheck catches it in a property run" and
   "compiler catches it at call site". Target use: public API
   pre-conditions on `DeltaCrdt.apply`, `BloomFilter.add`,
   `FastCdc.chunk`. Owner: Ilyana + Soraya. Effort L.
3. **#13 Separation logic (Pulse/Steel)** (M payoff but
   *high coverage* in the one place it hits — FeedbackOp
   memory ordering, open per Soraya's notebook). Effort L.
4. **#18 Spec-in-source comments** (H payoff, portability) —
   proof drift is a real ongoing cost; we just built the
   `verification-drift-auditor` skill because of it. A
   comment-level spec DSL would make drift structurally
   detectable. Effort M.
5. **#7 Bounded refinements** (M payoff) — composable
   invariants; the right abstraction for our retraction-safe
   operator interface audits. Effort L.
6. **#3 Uninterpreted measures** (L payoff) — useful but
   narrow; buy when it falls out of something else we build.
7. **#22 Counterexamples on failed verification** (M payoff)
   — ergonomic, not load-bearing. Cheap if we want it.
8. **#19 Reflection (function body as first-class term in
   logic)** (M payoff) — the long-term answer to "is the
   Lean proof about the same code we ship?". Effort L.

## Mapping to our tech radar

When a backlog row moves to **Ported** or **Partial**, the
corresponding TECH-RADAR.md row gets updated:

- F\* — currently Assess. Moves to Trial if #11 or #13 lands
  via F\* extraction.
- Lean 4 — currently Adopt. Stays.
- Z3 — currently Adopt. Stays.
- TLA+ — currently Adopt. Stays.
- FsCheck — currently Adopt. Stays.
- Future rows: Dafny / Viper / Stainless / Idris2 / Agda —
  candidates if an F\* route stalls.

## How to update this catalog

1. A new verification feature lands (e.g. we port #3 via a
   Lean typeclass wrapper).
2. Author flips the row's **Status** from Backlog → Partial
   or Partial → Ported.
3. Author adds a verification-registry row per
   `docs/research/verification-registry.md` if the landing
   cites an external source.
4. `verification-drift-auditor` re-checks the catalog on
   the next 5-10-round sweep.

## Cross-references

- `docs/research/liquidfsharp-findings.md` — Day-0 Hold for
  LiquidF# which triggered this catalog.
- `docs/research/proof-tool-coverage.md` — per-module map
  of which proof tool covers which F# file.
- `docs/research/verification-registry.md` — ground-truth
  map of artifacts-with-external-citations.
- `docs/TECH-RADAR.md` — ring assignments for the tools
  above.
- `docs/UPSTREAM-LIST.md` — canonical entries for F\*,
  LiquidHaskell, F7.
- `.claude/skills/verification-drift-auditor/SKILL.md` —
  the audit surface that keeps this catalog in sync with
  reality.
