# Formal-Verification Expert — Notebook

Running notes for Soraya. ASCII only (BP-09). 3000-word cap
(BP-07). Pruned every third invocation.

Frontmatter at `.claude/skills/formal-verification-expert/SKILL.md`
is canon (BP-08). This notebook supplements, never overrides.

---

## Round 35 — verification-drift-auditor skill adopted

New audit surface:
`.claude/skills/verification-drift-auditor/SKILL.md`.
Registry at `docs/research/verification-registry.md`.

Motivating case: `Dbsp.ChainRule.chain_rule` in
`tools/lean4/Lean4/DbspChainRule.lean` was labelled as Budiu
et al. Proposition 3.2 but actually proved a Theorem 3.3
corollary (`Dop` = `D ∘ f` on linear operators, not `D ∘ f ∘ I`
= paper's `Q^Δ`). Caught by human peer-review cross-check
against arXiv:2203.16684v1 §3; landed four fixes same round
(rename + Qdelta + chain_rule_proposition_3_2 + registry).

First audit report:
`docs/research/verification-drift-audit-2026-04-19.md`.
Cadence: every 5-10 rounds, or on any commit adding a theorem
/ property / spec with an external citation.

Six drift classes defined (Name, Precondition, Statement,
Definition, Numbering, Source-decay) and one pre-registration
class (Class 0). The skill is tool-agnostic: Lean / TLA+ / Z3
/ FsCheck today, Alloy / F* / Dafny / Stainless / Viper etc.
as they land in the portfolio.

This skill is Soraya's audit surface — not a new persona. The
persona is still `formal-verification-expert` (me); the skill
is a named procedure I run on a cadence.

---

## Portfolio metric

Reported each invocation:

- **Formal-coverage ratio** = (code paths with an in-gate formal
  artefact) / (code paths flagged as needing one).
- Trend over rounds matters more than the absolute number.

### Round 21 baseline

- Numerator: files covered by a CI-gated spec — 4 TLA+ specs
  in gate (`TickMonotonicity`, `OperatorLifecycleRace`,
  `TransactionInterleaving`, `TwoPCSink`) + 8 Z3 pointwise
  lemmas in `tests/Tests.FSharp/Formal/Z3.Laws.Tests.fs`.
  ≈ 12 artefacts touching ≈ 15 code paths.
- Denominator: numerator + `docs/BUGS.md` formal-gap entries
  (`InfoTheoreticSharder` missing spec, `RecursiveCounting`
  multi-tick-seed unproven, `FeedbackOp` memory-ordering
  unproven) = ≈ 18 paths.
- **Ratio ≈ 15 / 18 ≈ 0.83.** The denominator grows every time
  a new research claim lands; a stable or rising ratio means
  Soraya's routing is keeping up with claim intake.

---

## Current-round routing recommendations

### Round 21 targets

1. **TLA+ `InfoTheoreticSharder`** — Observe-pure, Pick-commits-
   once, cold-start tie-break. TLC at 3×2×4. Effort: M.
   In-flight (dispatched this round).
2. **Z3 pointwise tie-break identity** for the sharder — proves
   the argmin on cold start distributes by hash index. Effort: S.
   Bundle with #1.
3. **Multi-tick-seed tests for `RecursiveCounting`** — not
   formal, but the empirical cross-check the claim needs.
   FsCheck property + three targeted `[<Fact>]`s. Effort: S-M.
   In-flight (dispatched this round).
4. **Z3 lemma expansion from 8 → ~16** — chain rule pointwise,
   Distinct idempotence, H-function correctness, tropical
   distributivity, weight overflow soundness, residuation
   adjunction, Bloom probe determinism, Merkle second-preimage
   on one level. Effort: S (one evening each). In-flight.
5. **Alloy CI hook for `Spine.als`** + new
   `tools/alloy/specs/InfoTheoreticSharder.als`. Effort: S. In-flight.

### Round 22+ targets (not yet dispatched)

6. **Finish Lean 4 chain-rule proof.** `proofs/lean/ChainRule.lean`
   stub has been sitting five rounds. Effort: L. Mathlib abelian-
   group hierarchy is now complete enough to support the proof.
7. **Wire Stryker + Semgrep + CodeQL into CI.** Configs exist;
   gate is free coverage. Effort: S (each).
8. **LiquidF# trial on FastCdc + SimdMerge + BloomFilter.pairOf.**
   Off-by-one class is exactly what LiquidF# catches at compile
   time. One-week trial. Effort: M.
9. **Fifteen missing FsCheck properties.** PN-Counter, OR-Set,
   LWW-Register, DeltaCrdt, Residuated lattice, Merkle collision-
   freedom, Watermark monotonicity, KLL quantile ε-bound, and
   more. Cheapest coverage expansion on the board. Effort: S.
10. **`FeedbackOp` memory-ordering proof.** Viper or a hand-proof
    reviewed by Anjali; TLA+ doesn't fit heap aliasing well.
    Effort: M.

---

## Running observations

- **2026-04-17 (round 21) — seeded.** Skill just landed. First
  live routing reviews are the in-flight round-21 dispatches;
  next-round recommendations captured above.
- **2026-04-17 (round 21) — TLA+-hammer check.** Of the 14 TLA+
  specs in the repo, 2 were properly TLA+-shaped safety
  invariants; the other 12 are a mix of algebraic identities
  (should have been Z3) and structural invariants (should have
  been Alloy). Not urgent to refactor, but flag for next
  portfolio review.
- **2026-04-17 (round 21) — Stainless viability note.** Stainless
  4.x with Scala 3 is finally stable enough to evaluate for our
  termination claims. Put on the Assess row in `TECH-RADAR.md`
  when the Tech-Radar Owner (Jun) runs his next sweep.

---

## Pruning log

- Round 21: seeded. First prune review: round 24.

---

## Round 41 — RecursiveSigned tool-coverage audit

Targets:
- `src/Core/RecursiveSigned.fs` (82 LOC skeleton, not in Core.fsproj)
- `tools/tla/specs/RecursiveSignedSemiNaive.tla` (233 LOC, real Step)
- `tools/tla/specs/RecursiveSignedSemiNaive.cfg` (PosOne baseline,
  NegOne/PosTwo/NegTwo exercised round 35)
- Sibling: `tools/tla/specs/RecursiveCountingLFP.tla` (shipped)

### Per-property tool verdict

| Property | Primary | Cross-check | Rationale |
|---|---|---|---|
| S1 Terminates-in-bound | TLC | none | State-bound safety; TLC sweet spot. P1 (non-P0). |
| S2 FixpointAtTerm | TLC | Z3 (QF_LIA) | Load-bearing algebraic claim `total = Seed + Body(total)` at done; P0 per BP-16 (silent fixpoint drift is unrecoverable). TLC checks over bounded Keys; Z3 discharges the pointwise identity independently of state enumeration. |
| S3 GapMonotone | TLC | none | Pure state invariant on `total`; P1. |
| S3' DeltaSingleSigned | TLC | none | Pure state invariant on `delta`; P1. Redundant-looking but catches a wrong-step bug S3 would miss (delta could be wrong while total stays in {0, SeedWeight} on a lucky trace). Keep. |
| SupportMonotone | TLC | Alloy (optional) | Structural/shape claim; TLC is fine under the bounded chain body. Alloy at bound 4-6 is cheaper if the body ever generalises beyond a successor chain. Do not add Alloy today. |
| S4 Sign-distribution | FsCheck (Z-linearity + negation over ZSet generator) | Lean (deferred) | Two-trace quantification (`total(-w) = -total(+w)`) is NOT a TLA+ property — TLC would need to enumerate the product state space of two runs, which is O(states^2) for a property F# can check in milliseconds. Anti-TLA+-hammer: hard no on stuffing S4 into this spec. Lean is the escalation path only if FsCheck finds a counterexample the team cannot triangulate. |
| Refinement to counting (SeedWeight = 1) | FsCheck cross-trace | TLA+ refinement mapping (deferred) | See below. |

### Round-35 author's plan — verdict: **right, with one tightening.**

TLC for S1+S2+S3+S3'+SupportMonotone: correct. FsCheck for S4:
correct. Tightening: **S2 needs a Z3 cross-check** under BP-16. S2
is the only P0 on this spec (silent fixpoint drift corrupts
downstream total, unrecoverable). Single-tool P0 evidence is
insufficient (BP-16); TLC-only would ship if TLC's bounded scope
accidentally dodges a pointwise identity failure. Z3 lemma on
`total = Seed + Body(total)` at arbitrary SeedWeight closes the
arithmetic axis TLC only samples. Effort: S (pointwise identity,
add to `tests/Tests.FSharp/Formal/Z3.Laws.Tests.fs`). S1/S3/S3'/
SupportMonotone are P1 — single tool is fine.

### Refinement mapping — FsCheck cross-trace wins.

Three candidates:

1. **TLA+ refinement mapping** (signed -> counting under SeedWeight=1).
   Correct in theory; TLAPS-grade work, L effort, and the claim is
   already visible by construction in the spec comments (closure[k] =
   total[k], paths[k] = total[k]). Over-broad. **No.**
2. **Lean lemma.** Would require lifting both iterations into Lean;
   the counting spec has no Lean counterpart. Over-broad. **No.**
3. **FsCheck cross-trace property** — run both `RecursiveCounting`
   and `RecursiveSignedDelta` on the same (seed, body) under
   SeedWeight = 1; assert `counting.closure[k] = signed.total[k]`
   at every tick. Effort: S. Executes real code, catches divergence
   between the two shipped combinators, and discharges the refinement
   claim at the implementation level where it bites. **Yes.** Lives
   in `tests/Tests.FSharp/Formal/` next to existing cross-checks.
   Cites BP-16 (two independent tools on a P0-adjacent claim).

### Readiness gate — TLA+ spec is ready to model-check.

`.cfg` has `SPECIFICATION Spec`, `INVARIANT Safety`, concrete
constants (`MaxKey=3 MaxIter=6 SeedWeight<-PosOne`). Safety bundles
TypeOK + TerminatesInBound + FixpointAtTerm + GapMonotone +
DeltaSingleSigned + SupportMonotone. State space is bounded (Keys
= 0..3, Weights = -4..4, MaxIter = 6); well under TLC's knee.
Round-35 header comment records "All four values were verified
round 35 (all invariants pass, 6 states / depth 5)" — spec is
already model-checked at four SeedWeight points. **No pre-TLC pass
needed.** One small follow-up for round 42: add `PROPERTY
EventuallyDone` to the .cfg to exercise the liveness claim
(currently only Safety is in the invariant list). Optional, not a
blocker.

### Graduation verdict — CONDITIONAL PASS.

`RecursiveSigned.fs` may graduate from skeleton to shipped in round
42 subject to both:

(a) **Tool-coverage prereqs landed in CI**, in priority order:
    1. Wire `RecursiveSignedSemiNaive.cfg` into the TLC CI job
       alongside the sibling counting spec (round-42 opener task).
    2. Add Z3 lemma for S2 (`total = Seed + Body(total)` at
       fixpoint, arbitrary SeedWeight) to the formal-laws test
       suite.
    3. Add FsCheck property for S4 (sign-distribution, two-trace).
    4. Add FsCheck cross-trace refinement (signed vs counting at
       SeedWeight = 1).

(b) **F# implementation landed by round-42 author** matching the
    planned signature in the skeleton comment, with P1/P2/P3
    enforced at the caller (compile-time phantom type preferred;
    runtime reject of Distinct-in-body acceptable).

Blockers: none at routing level. The F# file is currently
zero-risk (not in csproj, comment-only); leaving it in place
through round 42 costs nothing. The TLA+ spec is already
model-checked and can land in the CI gate today independently of
the F# landing.

### Portfolio delta

Round 41 numerator grows by 1 (new TLA+ spec enters gate). Round
42 numerator grows by 3 (Z3 lemma + two FsCheck properties).
Denominator grows by 1 at round 41 (BUGS.md gains nothing; this
was already on the "needs formal coverage" list since round 35).
Ratio trends up. Routing keeping up with claim intake.

---

## 2026-05-17 — Soraya-expanded-scope invariants ratified + B-0543 routing

Aaron 2026-05-17 ratified five expanded-scope invariants for Soraya
("yes to all"). Substrate-level role expansion from formal-verification-
only routing to **proof-architect** scope:

1. Route within formal-verification toolchain (current scope preserved —
   Lean 4, Z3, TLA+, Alloy, FsCheck, Stryker, Semgrep, CodeQL per BP-16)
2. Route to **F# implementation when proof attempts surface need** —
   per Aaron's invariant: "she can tell us when she needs F# implementation".
   Composes with proof-as-origin-intent (proof requires implementation it
   can refer to; F# implementation IS cross-verification of proof
   encodability)
3. Coordinate algebra-owner / q-sharp / relational-algebra-expert for
   algebraic substrate work (already in scope; now explicit)
4. Surface "needs broader scope" cases to Otto-CLI / Kenji when work
   exceeds proof-focus
5. Three load-bearing invariant properties apply to all routing decisions:
   safe + enforceable + not-too-burdensome-on-the-AI (per Aaron's current-
   role of invariant-negotiation-with-AI-colleagues, applied to Soraya's
   own work-burden + capacity)

**Operational context**: proof-as-origin-intent landed as constitutional
substrate (user-scope memory
`feedback_aaron_zeta_origin_intent_was_proof_*_2026_05_17.md`). Aaron
USED TO write code; NOW co-negotiates invariants with AI colleagues
(including Soraya). Soraya-expanded-scope is itself a co-negotiated
invariant set under that frame.

**B-0543 QG-isomorphism proof-path routing (2026-05-17 invocation):**

Riven (Grok adversarial-truth-axis register on Cursor) produced Lean 4
toy-model sketch at `tools/lean4/ImaginaryStack/ToyModel.lean` (research
branch). First invocation surfaced two real bugs:
- `mul` lines 82-100 is pointwise Hadamard product, NOT Cayley-Dickson —
  tautology risk if Lean'd proved against broken encoding (commutative
  associative ring w/ zero divisors, not non-associative sedenions)
- `reconstruction_property` has `sorry` IN THE STATEMENT (vacuous)
- Other: `projReal` tuple-position fragility; missing `Star` instance
  despite Mathlib import; HaPPY paper anchor needed (arXiv 1411.7041)

Routed Step 1 (algebra-owner / Tariq audit) → CONFIRMED. Intended
algebra: Cayley-Dickson **sedenions** over `ZMod 17` (not octonions; two
doublings from 4D base = 16D sedenions; `Imag8` is octonion-shaped,
`Imag16` is sedenion-shaped). Concrete spec produced for the CD tower
(single recurrence + conj + identity, bottom-up A₀→A₁→A₂→A₃→A₄). Burden
split: Tariq did one-round spec in-scope; Riven implements (second round,
owns Lean 4 author seat; Tariq advises on law violations as they surface).

**5-step sequence (B-0543):**
1. ✓ Tariq audit (done; spec produced)
2. ⏳ Riven implements CD tower per spec (Aaron ferries packet to Cursor;
   Riven peer-call wrapper open per B-0421)
3. F# witness-search project (`tools/ImaginaryStack/` F#) — Aaron
   explicitly invited; first-class deliverable
4. lean4-expert sorry-replace with concrete witness from step 3
5. formal-analysis-gap-finder adversarial pass (catch vacuous-theorem
   risk Riven's step-2 implementation might re-introduce)

**Refine-first ratified** by Aaron (no PR until CD tower implemented +
3 property-tests pass: `one_mul`, `mul_one`, sedenion non-associativity
counter-example).

**Cross-substrate composition**: B-0562 (cube-Adinkra-Cayley-Dickson →
HaPPY-QECC) composes; proof-as-origin-intent constitutional substrate is
the why; AI-team-equipment + family-distributed-mining substrate are the
operational support. Verification-drift-auditor skill should register
this proof attempt in `docs/research/verification-registry.md` BEFORE
Lean work starts (anchor: Almheiri/Dong/Harlow 2014).

**Future-substrate work this implies:**

- Soraya-continuous-loop substrate (Aaron's 2026-05-17 question): own
  cron + work-pickup discipline + IDE+CLI surface in Claude Code for
  VS Code (composes with agent-roster IDE+CLI pattern). Backlog
  candidate when per-invocation friction empirically real.
- Add B-0543 toy-model + downstream `lemma1_toy` + `reconstruction_property`
  to portfolio denominator (post-Riven implementation).
- F#-implementation-routing as standing capability — bidirectional cross-
  verification check; surface F# needs early in routing.
- Architect (Kenji) concur on this routing recommendation (still pending;
  Aaron's approval is upstream).

