---
title: Orchestration Moat Roadmap — close the gap, go miles ahead, enforce the pattern
canonical_name: Agentic Organization
status: design
companion_to: GASTOWN_FULL_IMPL_COMPARISON.md
date: 2026-05-30
---

# Orchestration Moat Roadmap

Three asks, one thesis.

> **Thesis.** Gastown's orchestration is *advisory* (prose molecules, honor-system steps,
> singleton coordinators, polling). Ours is *enforced* (a typed observe→decide clamp on a
> deterministic, replayable org_event ledger). We close the gap by porting their best
> **tooling** onto our kernel; we go miles ahead by exploiting what an **enforced +
> deterministic + replayable** kernel uniquely enables — capabilities gastown cannot build
> without first rebuilding their substrate; we enforce the pattern with great success by
> making it **unbypassable and continuously, mathematically proven to have held.**

---

## Part 1 — Close the gap (port their best shipped tech onto our kernel)

These are the Tier-1 items from the comparison: shipped-by-them, design-only-for-us. Each
is an additive layer on existing primitives — no substrate change.

### G1. Release/merge queue with batch + bisect failure isolation
*Gap closed: gastown Refinery (`internal/refinery/batch.go`).*

**Status: shipped 2026-05-30.**

- New `ReleaseQueueState` DU + a `release-queue` cadence lane.
- Collect ChangeSets that reach `approved`; batch up to N; require an explicit release-batch
  evaluator; green → `applyChangeSet` all; red → bisect against an accumulating accepted stack to
  isolate the culprit and bounce only that ChangeSet to `changes_requested`.
- Reuses the change-control kernel as the per-ChangeSet authority. The change-control lane now
  leaves `approved` ChangeSets for the release queue instead of immediately applying them.
- **Built:** `packages/application/src/release-queue.ts` (pure batch/bisect planner, TDD),
  `apps/workers/src/org-cadence-lanes.ts` release queue lane, cadence composition wiring with a
  release gate port, Cockroach transaction-bound batch persistence, and `deploy/run-release-queue.ts`.
  KIND proof: two seeded green ChangeSets applied, one red culprit changed to
  `changes_requested`, ledger emitted two `change_set_applied` events and one `changes_requested`
  event, `PROOF: PASS`.

### G2. Model-eval harness (Class A/B downgrade)
*Gap closed: gastown gt-model-eval.*

- A corpus of real `observe()` situations (work-item triage, review-gate, memory
  promote/demote, supervisor-triage), each with an `allowed_actions` vocabulary + expected action.
- Run our `ChatCompletionPort` (Ollama, gated hosted) in two classes: **Class B** = full hat
  directive context (instruction-following); **Class A** = neutral, evidence-only (pure reasoning,
  the safe-downgrade signal). Score decision quality, not syntax.
- **Build:** `packages/model-eval/` + `deploy/run-model-eval.ts`; results recorded as org_events.
  This is the input to the self-optimization loop (M3) — not a one-off benchmark.

### G3. Recovery scanners (the lanes our NORTH_STAR already names)
*Gap closed: gastown convoy stranded-scan + reaper + witness patrol.*

**Status: shipped 2026-05-30.**

- New cadence lanes over `reaction_plans` (V9 lifecycle): `stale-reaction-plan-scan`,
  `stranded-schedule-scan`, `abandoned-run-binding-scan`, `dead-letter-classifier`.
- Two rules adopted from gastown: **event-first, recovery-scan-second**, and **fail-open on
  transient errors** (a single Cockroach hiccup must never stall the org).
- **Built:** `packages/application/src/recovery-scanners.ts` (pure scanners),
  `packages/state-cockroach/src/cockroach-recovery-scan-reader.ts` (bounded tenant-scoped
  lifecycle readers), four worker cadence lanes, and `deploy/run-recovery-scanners.ts`.
  Dead-letter evidence stores failure-message hashes, not raw terminal payload text.
  KIND proof: all four lanes found exactly one seeded incident, emitted four incident events
  and four scan-completed events, `PROOF: PASS`.

---

## Part 2 — Go miles ahead (exploit the enforced + deterministic kernel)

The differentiator is not "more features." It is that our kernel is a **pure decide() over a
deterministic ledger**. That single property unlocks four capabilities gastown's prose-and-Dolt
substrate cannot have. This is the moat.

### M1. Conformance checker — turn "we enforce the pattern" into a proven theorem
**The killer feature.** Replay the entire `org_events` ledger back through the kernel and assert,
for every transition recorded, that `to ∈ legal<X>Transitions(from, …)`. Any divergence = an
illegal transition reached durable state = a kernel bypass = a P0.

- Run it three ways: (a) a **CI gate** on every PR (replay fixtures); (b) a **cadence lane** in
  the live worker (continuously replay the tail of the ledger); (c) a **deploy proof** that
  replays the in-cluster ledger after each kind run.
- **Why gastown cannot:** there is no kernel to replay against — their workflow is prose an
  agent read. We can *prove* the org only ever took legal transitions. That is the strongest
  possible form of "the orchestration pattern was enforced."
- **Build:** `packages/application/src/conformance.ts` — `replayLedger(events): ConformanceReport`
  (pure) + CI job + lane.

### M2. Org simulator / Deterministic Simulation Testing (DST) of the whole organization
Because `decide()` is pure and ids are content-addressed/deterministic, we can **fork org state,
apply a policy delta (autonomy level, gate config, hat guardrail, model selection), replay a
recorded or synthetic intake stream, and diff the outcomes** — *before* shipping the change.

- "What if we make the security stage a 5-of-5 quorum?" "What if release-manager runs on Haiku?"
  Answer with a simulation, not production.
- **Why gastown cannot:** Dolt + tmux + live git side-effects are not replayable or forkable;
  their actions touch the real world mid-flight.
- **Build:** `packages/simulator/` — a seeded harness that runs the cadence lanes against the
  in-memory stores with an injected intake script + a policy overlay; outputs an outcome report.
  Composes directly with the in-memory fakes we already test against.

### M3. Self-optimizing decision loop — an org that measurably improves
Close the loop already half-built: **model-eval (G2) → per-hat model/policy config (tenant_config,
M5) → memory KPI-correlation measures the realized decision outcome → re-eval.** The org tunes
which model + which policy each hat uses, with evidence from its own outcomes, recorded as
org_events.

- We already have the two hard halves: memory KPI-correlation (which cited memories preceded a
  merged outcome) and the model-eval scaffold. M3 is the controller that joins them.
- **Why gastown cannot:** no memory-KPI substrate, no enforced config to tune, no ledger to
  measure against.
- **Build:** `packages/application/src/decision-optimizer.ts` — reads eval + KPI org_events,
  proposes a `tenant_config` delta as a *ChangeSet* (so the change to the org's own policy goes
  through the same enforced change-control kernel — the org governs itself by its own rules).

### M4. Formal verification of the clamp
Make the legal-transition functions provably total and safe: property-based tests (every DU
variant × every actor authority) + a model check that no path reaches a terminal/illegal state.
- **Build:** extend the existing exhaustive-DU tests with a generative property suite over
  `legalWorkItemTransitions` / `legalChangeSetTransitions` / `legalMemoryTransitions` /
  `legalConfidencePromotions`; assert totality + the safety invariants (no gate bypass, no
  terminal escape). This is the proof that M1's replay can trust the kernel it replays against.

### M6. Replay-context closure — make every transition event self-describing
M1 exposed a deeper proof ratchet: `org_events` is universal, but some events carry phase
strings while others carry stage ids, cycle summaries, or same-state flags. The conformance
checker can prove the transition kinds that are self-contained today; the next leap is to make
every durable state transition event explicitly name its kernel scope and transition context.

- Add a typed transition-context envelope to future state-changing events: kernel (`work_item`,
  `change_set`, `memory`, `doc`, `graph`), scope id, prior state, next state, and any replay
  parameters the pure clamp needs (for example change-control pipeline cursor / stage count, or
  doc load-bearing status).
- Turn skipped-event counts into a coverage ratchet: every new lifecycle must either be
  replayable by construction or explicitly marked non-transition. CI should fail if a new
  `OrgEventKind` is ambiguous.
- **Why gastown cannot:** prose workflow logs cannot be upgraded into proof-grade replay context
  without replacing the substrate. Here it is an additive tightening of the existing ledger.

---

## Part 3 — Enforce the pattern with great success (make it unbypassable)

Enforcement is only as strong as its weakest side-door. Three hardening moves close them.

### E1. Single-source authority — no write reaches durable state except through the kernel
- Every state transition flows through the command pipeline → `legal<X>Transitions` clamp →
  atomic effects. Add a **guard/lint** (and a conformance assertion, M1) that no store write
  bypasses the pipeline. The kernel is the *only* door.

### E2. Real authority + non-forgeable evidence (kill the two current stubs)
**Status: shipped 2026-05-30.**

- Replace the **permissive command-authorization stub** with a real authority port (hat
  definition → allowed command types + tool kinds). A TPM *structurally* cannot emit an
  implementation command.
- Make **evidence non-forgeable**: gate satisfaction must cite content-addressed evidence
  artifacts (a test-run id, a quorum-vote record, an external-approval id), not a boolean an
  agent can assert. The clamp already requires evidence; make the evidence un-fakeable.
- **Built:** durable `HatAuthorityPort`, `hat_id` on the Cockroach authority projection with an
  additive fail-closed upgrade for existing KIND databases, recomputable content-addressed
  evidence artifacts for approved / waived quality gates, review-stage evidence propagation into
  `org_events`, and `deploy/run-real-authority-evidence.ts`.
  KIND proof: TPM + `write_code` denied and observed, `release_operator` + `write_code`
  accepted, plain approval evidence rejected, content-addressed approval evidence accepted, and
  a review-stage approval event persisted the content-addressed evidence ref. The proof also
  executes the worker composition path. `PROOF: PASS`.

### E3. Continuous proof + emergency stop
- The conformance checker (M1) runs as a **live lane + CI gate**: the org is *continuously*
  proven to have only taken legal transitions. A breach pages immediately.
- Add **ESTOP** (Part-2 of the comparison, Tier-2): a `control_plane` flag every lane + agent
  checks each tick — distributed freeze, coordinator-exempt, for when a human must halt the org.

---

## Sequence (highest leverage first)

1. **M1 conformance checker** + **M4 clamp property tests** — cheapest, and they convert our
   central claim ("we enforce the pattern") into a continuously-verified theorem. Foundation for
   everything else; gives the moat immediately.
2. **G3 recovery scanners** — cheap (framework exists), closes the self-healing gap, hardens
   liveness.
3. **G1 release queue (batch+bisect)** — the biggest single capability gastown has and we lack.
4. **E2 real authority + non-forgeable evidence** — removes the two stubs that currently soften
   enforcement.
5. **G2 model-eval** → **M3 self-optimizer** → **M5 layered config** — the self-improving-org
   loop; this is the "miles ahead" payoff that compounds over time.
6. **M2 simulator / DST** — what-if the org before shipping policy changes.
7. **E3 ESTOP**, then Tier-3 polish (OTel traces, integration branches, provider-contract API).

## The one-line moat

> Gastown can tell an agent what the workflow is. We can **prove the workflow happened**, **simulate
> changing it before we ship it**, and **let the org improve it through its own enforced change
> control** — none of which is possible without the enforced, deterministic, replayable kernel we
> already shipped. Build M1+M4 first and the claim becomes a theorem; build M2+M3 and the org
> becomes self-improving; that is miles ahead.
