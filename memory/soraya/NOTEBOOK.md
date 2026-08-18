# Formal-Verification Expert — Notebook

Running notes for Soraya. ASCII only (BP-09). 3000-word cap
(BP-07). Pruned every third invocation.

Frontmatter at `.claude/skills/formal-verification-expert/SKILL.md`
is canon (BP-08). This notebook supplements, never overrides.

---

## Round 35 -- verification-drift-auditor skill adopted

Surface `.claude/skills/verification-drift-auditor/SKILL.md`; registry
`docs/research/verification-registry.md`; first report
`docs/research/verification-drift-audit-2026-04-19.md`. Motivating case: the `DbspChainRule`
mis-citation (labelled Budiu Prop 3.2, actually a Thm 3.3 corollary). Six drift classes plus
one pre-registration class, tool-agnostic. Cadence: every 5-10 rounds, or on any commit
adding a cited theorem/property/spec.

## Portfolio metric

Formal-coverage ratio = gated artefacts / paths flagged as needing one. Trend beats absolute.

### Round 21 baseline -- PRUNED 2026-08-14. Ratio was ~15/18 = 0.83 over 4 gated TLA+ specs
and 8 Z3 lemmas. Superseded: the TLA+ leg alone is now 52 gated model runs.

---

## Current-round routing recommendations

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
### Round 21 targets -- PRUNED 2026-08-14, all dispatched and long landed.

---

## Pruning log

- Round 21: seeded. First prune review: round 24.
- 2026-08-18: pruned `Round 41 -- RecursiveSigned tool-coverage audit` (843w, dispatched and
  landed) and `Safety-floor arc` (269w, 2026-06-07, all four floors closed). Both superseded by
  `docs/research/proof-tool-coverage.md`. Cap was breached at 3618w before this prune.
- 2026-08-18 (second pass, after merging origin/main): pruned `Vacuity round -- the Landauer lane`
  (483w, 2026-08-13). Superseded by the `consolidated map + vacuity sweep` round above; its
  findings survive in the artefacts it names -- `tools/Z3Verify/landauer-floor-lemma.smt2`,
  `LandauerFloor.lean`, `entropy-tracker.ts` `verifyLandauer`. Cap was 3414w after the merge
  brought in a second round-entry.

---

## Trigger Recognition Log (081KSBMG30008QG0R000WJ9FMP landing — round-69 routing decision)

Per-round trigger-fired-but-row-not-filed substrate. One line per round where a trigger fired and routing decision was made WITHOUT filing a new backlog row (substantive recognition that didn't produce row substrate). Forward-only logging; backfill optional.

Format: table with columns `Round | Trigger | Outcome | Artifact`. One row per round where a trigger fired without row-filing; `Trigger` cites the PR / observation that fired; `Outcome` is `routed` / `held` / `escalated` / `recognition-without-row-filing` (with rationale parenthetical); `Artifact` is the resulting file/PR/section if any (or `n/a (chat-only)`).

| Round | Trigger | Outcome | Artifact |
|---|---|---|---|
| 59 | PR #4795 (081KSBMG30008QG0R003B46GWG) merged | recognition-without-row-filing (umbrella covers subitem (b) acceptance criteria; execution is Kenji's lane) | n/a (chat-only) |
| 66 | PR #4797 (081KS923C0008QG0R000TE1589) merged | recognition-without-row-filing (audit execution is Kenji's lane; Soraya does not pre-empt sizing) | n/a (chat-only — gap that 081KSBMG30008QG0R000WJ9FMP audit-of-audit then surfaced) |
| 69 | PR #4810 (081KSBMG30008QG0R000WJ9FMP) merged | **routed to Option 1: NOTEBOOK Trigger Recognition Log** (this section); rejected Option 2 (081KS923C0008QG0R000TE1589 in-place — wrong change-rate partition) + Option 3 (new cross-cutting ledger — premature; no consumer demand) | this section |

If this section saturates (NOTEBOOK approaches 3000-word cap from log entries alone), revisit Option 3: create a separate cross-cutting ledger (e.g., `docs/research/verification-routing-decisions.md` — does not yet exist; hypothetical destination).


## 2026-08-14 -- Meno braided ladder: Q3 then Q1. Balanced, and it stops there.

Routed and answered the last open MATHEMATICAL question on the Meno board. Checked Q3 first
because it gates whether Q1 is even about Meno.

**Q3 -- obstruction NOT real as stated.** The brief's premise ("our ambient tensor is described
in our own source as cartesian") misreads `Meno.fs:38`, which says the DETERMINISTIC
SUBCATEGORY is cartesian. Ambient `(x)_Kronecker` is not cartesian (not the product in Mod_Z;
`unitObject` not terminal), so Mathlib `Subsingleton (SymmetricCategory C)` does not apply.

**But the adjacent obstruction IS real and sharper than the brief's version.** A cartesian
monoidal category has a unique BRAIDING -- not merely a unique symmetric structure. I is
terminal, naturality against `!_A : A -> I` forces both projections of `c`, product universal
property pins `c = swap`. And `braidR` is built with `Meno.arr`, i.e. it lives in the cartesian
deterministic subcategory. The escape: every `<V>` morphism is a BASIS BIJECTION, and copy is
not surjective / discard is not injective, so neither can enter. Fox 1976 then gives
non-cartesian. Nothing needs constructing -- the "minimal non-cartesian tensor" is the ambient
one under a hom-restriction, and `MenoBraided.rep` already IS it. Deliverable is a GUARD.

**Q1 -- balanced, and the two prior reviews were wrong in the same way.** Both read the axiom as
`theta_{A(x)B} = theta_A (x) theta_B`. Real axiom has `. c_{B,A} . c_{A,B}` on the right, so
`theta_V = id` forces `theta_{V(x)V} = c^2`, NOT `c^2 = id`. `<V>` is balanced, uniquely, with
`theta_{V^n} = rho(Delta_n^2)` -- the Garside full twist. `theta_V = id` is forced by B_1 being
trivial and is correct, not degenerate.

Routing: REJECTED the brief's suggested Z3-over-{S3,S4,Q8} search -- it answers a different
question. `Hom_{<V>}(V^n,V^n) = rho(B_n)` and rho is faithful, so the problem is central
elements of B_n, not set-maps G^n -> G^n. Encoding free-group rewriting into SMT-LIB is ~a week
producing something less trustworthy than `Braid.equal`, which we already ship and test.
REJECTED Lean-first: general n needs Garside normal form, which Mathlib does not carry.
ACCEPTED exact computation over the shipped faithful `Braid.equal`. Hours, not weeks.

BP-16 honoured, and this time I did not repeat the `chsh` mistake: the F# check runs against the
SHIPPED `Braid.fs` (not a private copy), and the second implementation is an independent
re-write from the spec. Both agree for all m+n <= 7. Four planted mutants -- theta=id (the
reviewers' own reading), theta=Delta, theta=Delta^4, single block-swap -- all REJECTED by both.
An all-pass run with no mutant that dies is a tautology; these die.

**Q4, and it is the useful part.** Balanced was worth hours and it CLOSED a line. Above it buys
nothing: ribbon would give a Markov trace scalar link invariant, strictly weaker than the
faithful `Braid.equal` we already have, and it is blocked at the object anyway (V has no dual in
Mod_Z). MTC is false, not open. Recommendation: STOP at balanced. Climbing further is aesthetics.

Portfolio: Meno lane goes 1 gated artefact (`MenoBraidedRMatrix.lean`, reachable from the `Lean4`
root -- orphan guard checked, it is fine) to 1 gated + 2 routed
(081KZZVC3DD087G0R0035SZN58 Lean certificate, 081KZZVC6SE087G0R001SXE8BV copy/discard guard).
Denominator unchanged. Also fixed a garbled sentence in `MenoBraided.fs` left by a bad edit on
2026-08-13 -- the kind of damage that makes a docstring stop being readable evidence.

## 2026-08-14 -- Z-EPS run: the AmplitudeEmu threshold drop SIGNALS. Verdict: conjecture HOLDS.

Handed by Lumen (PR #10551 open, docs/research/2026-08-14-the-quorum-fold-is-not-a-join-...).
My doc: docs/research/2026-08-14-z-eps-run-the-threshold-drop-signals-...-soraya.md.
Artefact: tests/Tests.FSharp/Formal/AmplitudeEmuSignalling.Tests.fs (12 tests, in-gate).

ROUTING CALL. Property class is NOT on the table: IEEE-754 arithmetic near a hard threshold,
and the claim is EXISTENTIAL. Route = analytic construction + executable witness on shipped
code. Rejected: TLC (no reals; the exact carrier it would need makes the defect INVISIBLE --
false green on a P0, the sharpest wrong-tool cost I have logged); Z3 (right for the 3-line
non-linearity lemma, unknown for the claim); Lean (weeks, wrong object); FsCheck as primary
(witness set is measure-zero -- a green run would have been a FALSE NEGATIVE). FsCheck is
correct AFTER the witness -- Adaeze's lane, filed as open item 3.

THE LESSON WORTH KEEPING: the offered framing was that the algebra might settle it without an
experiment. It does not, and the error is a converse slip. "Linear implies no-signalling" has
contrapositive "signalling implies nonlinear", NOT "nonlinear implies signalling" -- global
renormalisation is nonlinear and signals nothing. Algebra voids the GUARANTEE; only a witness
establishes the CLAIM. Gisin 1990 is a genericity result, not a theorem about a given map.
Generalise: whenever a conjecture cites an impossibility theorem, check which direction of the
implication the citation actually licenses before routing to a prover.

RESULT. Bob-local, trace-preserving op moves Alice's marginal 0.2647 -> 0.0000 (26 points).
Support flips [0;1] -> [0]. Survives on a unit-norm state (1.44e-12 -> exactly 0, support still
flips). Control = the SAME RAY at 1e6 -- invariant to 1e-16, drop fired 0 times. Exact-integer
arm gives 9/34 under both settings. Drop-fired asserted by branch count in BOTH arms.

NON-VACUITY. Mutation check run: EPS := 0.0 kills exactly the 5 drop-dependent tests and leaves
preconditions + controls + exact arm green. Correct kill pattern. Every arm calls shipped
AmplitudeEmu.step -- the chsh-probe failure (own copy of the definitions) is not repeatable here.

CONSEQUENCE. "Tune EPS" is dead as a class, not just inelegant: for any EPS > 0 there is a ray
where the shift is order 1, because the shift is scale-dependent and the theory is not. Raises
urgency on 081KZZYWBN2087G0R003NAQQAF (exact carrier) -- did NOT do it, separate item.

RING NOTE. Nothing moved. Confirms the standing FsCheck ring caveat: random search is the wrong
generator for measure-zero witness classes; it must be seeded by construction.

DENOMINATOR. +1 path (AmplitudeEmu drop) flagged; +1 numerator (now in-gate). One NEW gap
opened and named, not closed: WSet.consolidate carries its own isZero at 1e-12 on COMPONENTS,
six orders tighter than AmplitudeEmu's on INTENSITY. Same shape, un-run. Do not assume it
inherits this result.
## Round 2026-08-14 — the flags a spec is measured under ARE part of the claim

Closed `081KZYRDMZW087G0R0012K4QA0`, which I raised and then raised P2 to P1 after it bit me.

The defect was not in a model. `QuorumPhaseCancellation` went red on CI with exit 11 because my
recorded runs were driven by a script passing `-deadlock` (which DISABLES deadlock checking) and
the gate passed no such flag. **A hand-run green and a gated green were not the same result and
nothing anywhere said so.** Adding `-config` was necessary and not sufficient: the next mismatch
would have been a different flag.

Routing call, and it generalises past TLC: **a recorded verdict that does not carry the exact
invocation that produced it is a claim about an unknown experiment.** So the fix is not a flag,
it is `registry/tlc-models.json` -- 53 pinned model runs, both consumers building argv from that
one file, the id quotable next to any result.

Portfolio delta: configs executing in the PR lane **34 -> 52 of 53**. Configs no runner opened
**19 -> 0**. Negative configs that fail when the witness stops firing **0 -> 14**. Exhaustive
state counts asserted **0 -> 37**. One model (`BftLiveness`) is `extended` tier with a written
reason: at `-workers 1` it takes ~26 min against the `11min 14s` recorded from a 4-worker run.
Declared gap, not a silent one.

**Verdict on a `tlc-solver-floor.json` sibling to `smt2-solver-floor.json`: NO, and the cheaper
answer is better.** z3/cvc5 come from the runner `apt`, so their version is ambient and degrades
silently -- a floor is the only lever. `tla2tools.jar` is COMMITTED to git (since #8053), so the
toolchain is already byte-pinned by the diff. What was missing was not a floor but an assertion
that the jar loaded is the pinned one; the registry now carries its sha256 and version banner and
the gate checks the banner on every run. One field, not a second registry.

Two things found while pinning, both real:

- `tools/setup/manifests/from-url` downloads `tla2tools.jar` to `tools/tla/tla2tools.jar`, **a
  path no runner reads**, unchecksummed. The committed jar reports `2026.05.18.174321`, not the
  `v1.8.0` two docs claim.
- My own state-count parser matched a TLC *progress* line rather than the final summary, reading
  122647 off `BftConsensus` against a pinned 4665495. The tempting fix was to relax the pin. The
  correct one was to chase the number -- **the assertion caught my parser on its first real run,** 
  which is what a falsifier is for.

Carried forward: the deadlock caveat is now IN the artefact, not only in prose.
`QuorumCollateral` and `WagerSolvency` stutter, so their deadlock checks cannot fail; each model
records `deadlock` as `off-cfg` / `on-vacuous` / `on`, and the linter cross-checks `off-cfg`
against what the `.cfg` actually declares.

Not exposed to the bun 5s cap (`081KZZ3JHP1087G0R00027ARRR`, reproduced here: `bunfig.toml`
`timeout = 20000` is ignored, a 6s test dies at 5002ms). The gate is `dotnet test`; the bun-side
TLC tests only run metadata commands. A comment in `run-tlc.test.ts` names the hazard so nobody
adds a real model check there and reads a 5s truncation as a failed proof.

---

## 2026-08-18 -- consolidated map + vacuity sweep

Deliverable: `docs/research/2026-08-18-formal-verification-consolidated-map-proofs-math-and-code-pushed-together.md`

### Portfolio metric (this round)

Gated formal artefacts, counted from the runners' own rosters (NOT from
`audit-formal-artifacts.ts`, which mismeasures -- see below):

- TLA+/TLC: 53 pinned model runs, 52 `gate` + 1 `extended`; 14 expect VIOLATION.
- Lean 4: 48 files, ~30 headline lemma families under `#print axioms`, via `run-checked.ts`.
- Z3/SMT: 9 `.smt2` + `Z3.Laws.Tests.fs`; z3 4.16.0 / cvc5 1.3.4 pinned in gate.
- Alloy: 6 models via `Alloy.Runner.Tests.fs`.
- FsCheck: 587 test attributes under `tests/Tests.FSharp/Formal/`.
- Mutation: Stryker cannot fail (`break: 0`, 2 files); `mutation-runner.ts` not in gate.

Ratio is NOT quoted this round. Both prior denominators are unusable: the
`audit-formal-artifacts.ts` "unreferenced" count is a docs-mention count, not a
wiring count. Reinstate once that tool reads the rosters.

### Vacuity sweep -- 4 found, 3 repaired

1. `lint-discharge-certificate-consistency.ts` scanned ZERO rows and printed a
   tick. Added a section-A ANCHOR check with live jurisdiction (49 anchors); the
   empty certificate scan is now reported as empty. Widening filed:
   081M0B2R2BQ087G0R000EC2E9Y.
2. Section-A row 25 cited `ReticulumTransport.fs` -- never existed. Repaired to
   `src/Bayesian/MeshLatencyModel.fs`. Found BY the new check, on `main`.
3. `ComputeReceipt.Tests.fs` CR-6/CR-7 -- dead `Some` arm, only reachable
   statement was `Assert.True(true)`. Rewritten to construct `{ Candidates = [] }`
   directly + a negative control. Mutation-proven (guard -> `if false`, both die;
   mutant reveals `IV = infinity`).
4. `Formal/NtpNoninterference.Tests.fs` -- `Assert.Equal(cardsOf links, cardsOf links)`.
   Rewritten to exact grid extraction under both clocks. Mutation-proven, AND my
   own first draft (`Assert.Contains`) survived the mutant. Run the mutant; do not
   reason about it.

### Standing rules produced this round

- **A determinism assertion `f(x) = f(x)` is metered iff the callee's transitive
  call graph can reach an ambient source.** Otherwise it is unmetered decoration.
  41 F# + 33 TS instances triaged under this; most are genuine section-13
  noninterference falsifiers and must NOT be deleted.
- **Inside section A, backticks mean "this is an anchor."** Prose about a dead
  name must not wear them, or the anchor check re-flags the repair note.
- **New TLA+ specs land with a `registry/tlc-models.json` entry that names their
  own vacuity, or they do not land.** 22 of 53 runs already declare
  `deadlock: on-vacuous`. That registry is the honesty standard for the portfolio.

### Not done, deliberately

- Did not widen the discharge matcher blind (43-row table with nested sub-tables;
  naive widening flags 23, mostly false).
- Did not touch open PR #12014 (`CliffordPeriodicity`). Its two mod-8 predicates
  ARE the same predicate -- Aaron's own find; routing call is refactor, not test.
- `CliffordPeriodicity.fs` is NOT on main as of 90e96dc542.

---

## 2026-08-18 -- homoiconic seam audit (Aaron's meta-formal-system question, engineering half)

Doc: `docs/research/2026-08-18-soraya-where-the-uncoded-coded-seam-actually-lands-in-our-ir.md`.
Lumen has the pure-math half (is a coded rep ever still regular); not touched.

**The seam is real and it is `ZetaIrNormalizer.normalize`** -- not a reason-layer/wire-layer
boundary. It lowers v1-v4 ops into the "core four" minimal generating set and is NOT injective
(`Rotl 7` and `XRotXor [0;7]` share one normal form; likewise `XorShr 13` / `XShrXor [13]`), while
preserving denotation. Syntax forgotten, meaning kept -- the code-quotient signature. Two failure
modes now kept apart: **type break** (YinYang carries `Acts` as an opaque serialized string --
refactorable) vs **quotient break** (non-injective -- a mathematical obstruction no refactor
removes). Only the second is Lumen's obstruction.

**Refuted the vF/uF mapping**, and structurally, not just empirically: mu-F/nu-F is
least-vs-greatest fixpoint; uncoded/coded is free-vs-quotient. Orthogonal invariants. Corroborated
by grep -- zero ECC on any transport surface, and `no-binary-in-proof-lineage` *mandates* the
replay layer be uncoded hex-in-JSON. We also reason over coded data routinely (AdinkraCode has ~20
consumers, nearly all reasoning surfaces). Holds in exactly one lane (generator-IR), which is
coincidence-strength, not identification.

**Retracted a cell of my own 2026-06-20 routing doc.** I had "self-dual = homoiconic, made
checkable" citing `AdinkraCode.isSelfDual`. Inverted: doubly-even => self-orthogonal => k <= n/2, so
self-dual is the MAXIMAL code, giving the SMALLEST quotient -- the most minimal adinkra, i.e. the
furthest possible from the regular representation. Independent of Lumen's open branch (maximal =>
inside the case already closed 2026-08-14). Both are "shape A", which is the trap: every idempotent
is shape A.

**Ran my own 2026-06-20 falsifiable test.** Can unchanged `zeta-ir-v1` express gen's own transform
logic? **No** -- six constructors, all `word -> word`, nothing with an IR term in its domain;
meanwhile `codegen-from-ir.ts` is 740 lines of TS. The homoiconic carrier here is `DynamicValue`
(MixIr/MixCogen pass in their domain), and `zeta-ir-vN` is a coded sublanguage riding on it.

**Routing.** TLA+ out on all five properties -- no state machine, no temporal property, nothing to
interleave; naming that is the point. P1 (seam exists, an exists-statement) and P3 (YinYang opacity) ->
xUnit characterization tests, shipped. P2 (semantics preservation) already carries a BP-16 triple
(`ZetaIrMinimalSet.Tests` + `NormalizerCorrect.lean` + the `gen-smt2-from-ir.ts` SMT lane) -- do not
re-prove. P4 -> **no tool**, decided by inspecting a 6-case DU; machinery there is the hammer's
mirror. P5 (`HomoiconicFixpoint.lean` proves a conditional whose antecedent our IR does not satisfy
-- there is no `apply : IR -> IR -> Prog`) -> named as a gap, no CI check possible.

Ratio this slice: **3/5 = 0.60** gated, one deliberate non-gate, one honest hole. Mutation-checked:
`normalizeOp := id` makes SEAM 1a fail. Ran it rather than claiming it.

