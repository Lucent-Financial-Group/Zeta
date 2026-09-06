---
id: 081M1M2J0P3087G0R0037K8JJK
type: task
state: in-progress
priority: P1
slug: corporate-register-in-core-typescript-org-chart-cascade-sche
title: "Corporate register in Core.TypeScript: org chart, cascade, schedule/meetings, artifact communication, wired into the loop"
created: 2026-09-03T00:00:00.000Z
depends_on: []
composes_with: []
---

# The corporate register, in the canonical package

## The architecture question, answered from the ADR rather than assumed

Whether `Core.TypeScript` is *supposed* to be an organization decides everything else, and
`docs/DECISIONS/2026-05-31-observe-act-16-direction-universal-action-grammar-local-no-cloud-llm.md`
settles it. The same `observe.ts` keystone runs in **two workflow registers**:

| register | what it is | governance |
|---|---|---|
| agentic-organization | the **corporate** workflow ("the agentic operating system") | PR-gated, static, no self-mod |
| Agora | the **sovereign** workflow / society (DIO on DID) | the ≥3-agent constitution gate |

with the direction of composition stated outright: *"the observe-algebra became canonical; Max's
corporate `Menu16` retrofits onto it."*

**So the canonical package is not an organization. It is the generic substrate, and a hierarchy is
one register's policy layered on top.** Everything below lives in `src/Core.TypeScript/corporate/`
and composes over the core; nothing in the core imports it.

## What was actually there before

`src/Core.TypeScript/observe/room/hat-gate.ts` carried `HatLevel` and says outright that it *"mirrors
agentic-organization HatLevel"*. That was the whole of the organization in 2492 TypeScript files.
`grep -r` over the package returned **zero** for `reportsTo`, `departmentId`, `ScheduleBlock`,
`DiscussionAnchor`, `DecisionRecord`, `Initiative`, `parentWorkItem`, and `rmo`.

And the one piece that did exist was **not wired**: `hatFilter` had **zero non-test callers**. The
hierarchy was fully modelled, fully tested, and consulted by nothing — an IC and the Executive Board
were handed the identical menu, so the levels were a label on a chart.

| capability | before | now |
|---|---|---|
| hat levels | yes | yes |
| reporting graph, departments, named hats | **no** | `org-chart.ts`, `org-seed.ts` |
| goal → initiative → project → task cascade | **no** | `goal-cascade.ts` |
| schedules, busy, meetings | **no** | `work-schedule.ts` |
| upward communication, escalation routing | **no** | `supervisor-signal.ts` |
| deliberation artifacts, decision records | **no** | `discussion-anchor.ts` |
| resource procurement (RMO) | **no** | seeded hat + `resource_authority` routing |
| any of it reaching the loop | **no** | `loop-policy.ts`, `work-projection.ts`, `run-loop-real.ts` |

## The three load-bearing refusals

Each is the single rule that makes its subsystem mean something:

1. **A schedule refuses overlapping occupying blocks.** The reference states it
   (`agentic-organization/docs/AGENT_WORK_RHYTHM_AND_PROMPT_FLOWS.md`), and without it "is this hat busy" has no answer —
   the honest reply becomes "in three ways at once", and every downstream question inherits it.
2. **An anchor cannot resolve without producing its expected output.** A `decision` anchor needs a
   `DecisionRecord`; everything else needs an evidenced post. Without it "we discussed it" closes a
   thread and the organization's record of why anything happened is a transcript nobody re-reads.
3. **A parent work item cannot be marked done.** Delivery rolls up from the leaves, recursively, and
   a childless goal is **not** delivered — otherwise `every` over an empty list reports a goal nobody
   decomposed as complete.

## Two defects found by running it

- **`ownerForRung` picked an owner who could not carry the next rung.** Under this chart the CTO has
  three directors at equal distance, and the first by declaration order has no manager beneath it —
  so every goal the CTO accepted produced an initiative that could never become a project. The plan
  read as staffed and was not, failing one rung *after* the decision was committed to. Fixed by
  breaking distance ties toward an owner that has a team at the level below.
- **My own "strictly higher level" reporting rule was wrong**, and the reference data refuted it: in
  `agentic-organization`'s seed the CTO reports to the CEO and **both are `c_suite`**. Relaxed to
  "no hat reports downward" — which is what makes the reach-the-root walk load-bearing rather than
  belt-and-braces, since same-level edges admit `ceo → cto → ceo` cycles the level rule cannot see.

## The architecture is a check, not a claim

`register-boundary.test.ts` sweeps every `.ts` under `src/Core.TypeScript` and fails if any core
module imports `corporate/`. It also asserts the sweep reached the core (>500 files, `observe.ts`
among them) so it cannot pass vacuously, and that the same detector fires inside the register so it
cannot be a checker that never fires.

If the core depended on the org chart, a hierarchy would be a property of the machine rather than a
policy someone chose, and the sovereign register could not run without one.

## End to end

`org-cycle.ts` runs the loop in order, every refusal surfaced rather than skipped: C-suite accepts →
cascades to initiative/project/task → the lead asks the **RMO** to staff → the RMO's answer is a
decision record on the anchor → assignees get work blocks → the accountable chain **meets** (one
atomic booking across four calendars) → blocked work signals upward with evidence → the supervisor
cannot resolve it and **escalates past itself** → delivery rolls up.

```
cto accepted the goal 'cut checkout abandonment'
engineering_director owns initiative 'fix the coupon path'
engineering_manager owns project 'coupon service hardening'
tech_lead owns task 'stop the double-apply'
tech_lead → rmo_office: request_resource for task-004
backend_implementer assigned to task-004
backend_implementer scheduled 3600000ms on task-004
the accountable chain met: tech_lead → engineering_manager → engineering_director → cto
backend_implementer completed task-004
goal goal-001 DELIVERED
```

and on the blocked path:

```
backend_implementer → tech_lead: report_blocker on task-004
tech_lead → engineering_director: request_escalation on task-004     ← over the manager's head
```

`work-projection.test.ts` closes the circuit through the **real** `createLoopRoom`: a cascaded task
becomes a `BacklogItem` in the dev's own world, the loop picks it, and the completion travels back up
so the goal becomes delivered without anyone marking it.

## Wiring into the loop

`run-loop-real.ts` gained two optional seams, both behaviour-neutral when absent:

- `authority?: HatAuthority` — applies the core's own `hatFilter`, which now has a production caller.
- `menuPolicy?: (menu) => menu` — typed over `NextAction` alone, so the core carries no
  organizational vocabulary. The register supplies one from a calendar.

Plus `--hat <level>` / `ZETA_HAT`. An unknown level is **refused**, never silently sovereign —
`--hat mangaer` would otherwise run unrestricted while reading as governed.

Two things the gate does that a weaker version would not:

- The pick is indexed against the **filtered** menu the participant was shown. Indexing the
  unfiltered one is the off-by-one that lets a gate defeat itself.
- An emptied menu **refuses**; it does not fall back to the ungated menu. A fallback would fire
  exactly when the gate had something to say, making the authority model advisory.

The NCI floor is preserved: the schedule policy never removes the four free modes. A calendar may say
what work is in scope; it may not say that an agent must work.

## Result

```
bun test src/Core.TypeScript/corporate/   184 pass, 0 fail
bun test src/Core.TypeScript/observe/    1624 pass, 0 fail   (no regression from the loop change)
tsc --noEmit                                0 errors
```

**Mutation: 87 mutants across 9 modules, 87 killed.** Four survivors were fixed rather than
explained: two were tests passing for the wrong reason (an unknown signal sender rejected by a
routing accident rather than the identity check — and `request_resource` routes to a *fixed* hat, so
under that family nothing but the identity check stood between a ghost and the RMO's queue), and two
were guards unreachable through the public API, now tested against hand-built `Cascade` values since
that type is a plain literal any caller can construct.

## Second pass — the middle of the pipeline (quality gates, churn, escalation)

The gap was measured rather than guessed: the orchestration surface of `agentic-organization` is the
**import closure of its two cycle drivers** — 16 of 104 application modules. The other 88 are document
intelligence, knowledge graphs, context packs, sandboxing and credentials.

Three of the sixteen landed in this pass.

### `quality-gate.ts` — the biggest hole

The cycle went task → `done` on the assignee's own say-so. Every other refusal in this register was
in place and the middle of the pipeline had nothing at all. Now: seven ordered gates, each evaluated
by a hat that holds the scope, with recovery paths.

Two deliberate divergences from the reference:

- **One source of truth for gate ownership.** The reference keeps a `GateOwnerHats` roster AND each
  hat's `approvalScopes`, and requires both. Two lists that must agree can disagree — silently, in
  the permissive direction, the moment a hat is added to one and not the other. Here `gateOwners`
  DERIVES the roster from the scopes, so there is nothing to drift.
- **Waiving is not one of three normal verdicts.** The reference offers `waived` beside `approved` in
  every evaluation, which makes the cheapest way past a hard gate a single index. It is now behind a
  level check (Director and above) and stays distinct from `approved` in the record, so an audit can
  tell a satisfied control from a skipped one.

### `org-decision.ts` — the kernel, and why it is the same one

Determinism computes the LEGAL SET; an agent picks inside it; **the index is clamped**. That is the
observe loop's own shape at organizational scope:

```
buildMenu(world) → hatFilter(menu, authority) → participant.choose(menu)
legalOptions()   → (already filtered)         → chooser(legal)
```

The clamp is the load-bearing line — reading the option out by an unclamped index is how a model's
arithmetic slip becomes an authorization bypass. `NaN` is handled explicitly: it survives both
`Math.max` and `Math.min` untouched and is the one input that defeats a naive clamp.

### `escalation.ts` — churn broken structurally

A rejected gate is a bounce-back. Enough of them is churn, and churn is broken rather than endured:

- **Counted from the gate record**, not a counter. A counter can be reset, forgotten, or incremented
  twice; the evaluations are what actually happened.
- **Every action either changes the input or halts the loop** — `escalationEffect` is total over the
  action set, so a ninth action is a compile error until someone says which it is. "Try again" is
  deliberately not an option: an escalation whose outcome is to retry the same input is how a bounded
  retry becomes an unbounded one.
- **The architect is resolved from the chart**, not named. The reference hardcodes
  `architectHatId: "architect"` — which does exist in its own 117-hat catalog, so it is not a bug
  there, but it couples the logic to one seed and that id is absent from this one. An organization
  with nobody to bring in is told so rather than handed a dangling id.
- **The decider is resolved too.** The reference's work-OS cycle hardcodes one engineering-manager id
  even though its own authority check permits Director and above, so an escalation from anywhere else
  in that organization is decided by a hat with no relationship to the work.

A staffing hole is explicitly NOT churn — retrying cannot fix a gate nobody owns, and escalating on
it would report a broken loop where the loop never ran.

### The living loop, observed

```
task-004 turned back at gate runtime_validation → validation_process_improvement (attempt 1)
task-004 turned back at gate runtime_validation → validation_process_improvement (attempt 2)
engineering_manager escalated task-004 on churn → add_agents (changes_the_input)
goal goal-001 not delivered
```

### Result after the second pass

```
bun test src/Core.TypeScript/corporate/   248 pass, 0 fail
bun test src/Core.TypeScript/observe/    1624 pass, 0 fail
tsc --noEmit                                0 errors
mutation: 131 mutants, 12 modules, 131 killed
```

One thing worth recording: **`tsc` caught what `bun test` did not.** `preferChooser(GateOutcome.Approved)`
infers the literal `"approved"` rather than the union — 214 tests green, five type errors. Bun strips
types; it does not check them.

## Third pass — the last seven orchestration modules

The gap was measured as the **import closure of agentic-organization's two cycle drivers**: 16 of its
104 application modules. Three landed in pass two; the remaining seven are now done, and the closure
is closed.

| module | landed as | the notable divergence |
|---|---|---|
| hat-lifecycle | `hat-binding.ts` | ms not ISO; a TTL ≤ warmup is refused |
| assignment-engine | `assignment-engine.ts` | exclusions carry reasons; supply-exhausted ≠ no-candidate |
| reputation | `reputation.ts` | the whitewash threshold is COMPUTED, not claimed away |
| prioritization | `prioritization.ts` | `estimatedEffort` is actually read; three real authority rungs |
| qa | `qa.ts` | the planned executor's fallback is required, not defaulted to pass |
| work-market | `work-market.ts` | fencing tokens; self-approval refused |
| intake | `intake.ts` | length-prefixed idempotency key; triage checks instead of asserting |

### Five defects in the reference, each verified before it was claimed

Each was checked against the source rather than inferred, and one suspicion was **wrong** and
dropped — `escalation.ts` hardcodes `architectHatId: "architect"`, which I expected to be a dangling
id and which does exist in that 117-hat catalog.

1. **`estimatedEffort` is dead.** A REQUIRED field of `PriorityInputs`, supplied by callers, never
   read — beside a comment saying *"budget burn + high effort push DOWN"*. A caller raising it to
   deprioritise a large job sees nothing happen and has no way to find out why.
2. **`triageIntake` cannot refuse.** It calls `assertWorkItemTransition(..., { hasTriageFields: true,
   hasRequiredEvidence: true })` with both **hardcoded**, so a defect with no reproduction steps and
   no evidence advances exactly as one with both. The guard runs and is unfalsifiable.
3. **The intake idempotency key collides.** `` `${source}:${externalId}` `` is ambiguous whenever
   either part contains the separator: source `"a:b"` + id `"c"` and source `"a"` + id `"b:c"` both
   produce `"a:b:c"`. Two unrelated reports become one item and the loser is discarded as a
   duplicate — the least visible failure available. Fixed with length-prefixed parts.
4. **`Director` and `CSuite` have identical priority authority**, so that rung of the ladder is
   decorative. `Paused` is now reserved above Director, giving three real rungs.
5. **`createDeterministicExecutor` defaults an unplanned case to `Passed`**, turning "nobody thought
   about this case" into a green. The fallback is now a required argument.

### The whitewashing result, derived rather than asserted

Reputation uses a Beta-Bernoulli posterior, so a newcomer scores the prior mean and a damaged
identity scores lower. Working out when re-minting pays:

```
fresh > damaged  ⟺  α₀/(α₀+β₀) > (α₀+s)/(α₀+β₀+s+f)  ⟺  f/s > β₀/α₀
```

With the reference's uniform `Beta(1,1)` the threshold is **1.0** — any agent failing more than half
the time improves its rank by starting over. **No finite prior removes this**; it only moves the
threshold, paid for by penalising genuine newcomers. That is Friedman & Resnick, *The Social Cost of
Cheap Pseudonyms* (2001), not a defect.

So the module does not claim immunity. `whitewashThreshold` reports the number, and a test asserts
the closed form agrees with the posteriors `summarize` actually produces — arithmetic about the real
thing rather than about itself. A system that believes it is whitewash-proof is worse off than one
that knows its exposure.

### The fencing token

`work-market.ts` is built around the lease-expiry hazard: an agent whose lease expired does not know
it — from inside, it is still working. Reaping alone would make the system lose less work and
**corrupt more**, because the reaped agent's eventual write lands on whoever took over. A monotonic
per-shard token issued at claim time makes "has anyone claimed this since me" a single comparison.
(Anchor: Kleppmann, *How to do distributed locking*, 2016 — a lease alone is not mutual exclusion.)

### Result after the third pass

```
bun test src/Core.TypeScript/corporate/   439 pass, 0 fail   (20 modules, 16 test files)
bun test src/Core.TypeScript/observe/    1624 pass, 0 fail   (no regression)
tsc --noEmit                                0 errors
mutation: 209 mutants, 19 modules, 209 killed
```

## Fourth pass — the glue, the caller-less audit, and three live defects

### The audit that reframed this pass

An import audit of `corporate/` found **62 of 189 exported values reached by any non-test module**,
and seven modules — `work-market`, `prioritization`, `assignment-engine`, `loop-policy`,
`work-projection`, `org-seed`, `org-cycle` — reached by NONE.

Tested, correct, consumed by nothing: **the exact defect this package was started to fix, reproduced
at scale by the fixing.** The first version of the audit was itself wrong in the flattering
direction — it counted mentions in comments as callers — and the honest count came from matching
imports and call sites with comments stripped.

Closed by building the callers, not by lowering the bar:

| module | what it is |
|---|---|
| `org-runtime.ts` | the composition root — intake → prioritize → cascade → staff → schedule → loop → market → QA → gates → escalate → change |
| `org-status.ts` | the readouts. A predicate with no caller is a question the organization cannot answer about itself |
| `org-admin.ts` | the operator surface, every action authority-checked |
| `run-org.ts` | the production entry point, with exit codes |
| `change-control.ts` | the register's work as a real change |
| `hat-guardrails.ts` | may this hat do this, and did it do the work it is signing off |
| `org-event.ts` | the trace, typed and queryable |

**Result: 202/202 exported functions have a production call site. Zero orphans.** Two exports were
DELETED rather than given a contrived caller — `bindHatToLoop` (superseded by `bindWearerToLoop`)
and `triagePath` (a duplicate of `INTAKE_PATH`) — and one function I had just written,
`rungOwnerLevel`, took a parameter and `void`ed it, which is the fake-consumer shape and was removed.

### Three defects the pipeline only revealed by being RUN

1. **Staffing starved the whole pipeline.** The target-hat selection picked the first IC with a
   supervisor — `initiative_planner` — rather than an IC in the task's line, so every assignment was
   correctly refused and nothing downstream ever ran. Underneath was a model muddle:
   `goal-cascade.assign` assigns a HAT to a task; `assignment-engine.assignHat` picks an AGENT to
   wear a hat. Separating those fixed it, and a second condition — a hat not already carrying another
   task — fixed the follow-on where both tasks landed on one hat and the second was refused at the
   supply cap, reading as a capacity problem when it was a selection bug.
2. **The loop tick was a postscript.** Placed after the gates closed the tasks, it reported "offered
   0 items" every time. The loop is how a dev picks work UP; it now runs before the market, and its
   pick determines who claims the shard.
3. **A two-hatted agent acted under an arbitrary hat.** `bindWearerToLoop` took the FIRST active
   binding, so an agent wearing two ticked twice as the same one and picked the same task twice.
   A tick belongs to an (agent, HAT) pair; ambiguity is now refused rather than resolved by array
   order.

### The separation-of-duties hole

`evaluateGate` checked the approval scope and never asked who did the work. Probed on a chart where
the implementer also holds the implementation-review scope:

```
the implementer reviewing its OWN implementation: ALLOWED → approved
```

The seeded organization never configures that, which is why it went unnoticed — **the defect was in
the check, not the seed, and a check that only holds for one configuration is not a check.**

`proposerHatId` is now REQUIRED on `evaluateGate`, not optional. Optional left "unrecorded" reading
as "fine", which is the quiet-loss shape; the compiler found every call site the moment it changed.
`NO_PROPOSER` is a sentinel so "this work has no author" is something a caller says out loud rather
than an argument it forgot. `runGateChain` also excludes the proposer before picking an evaluator, so
a chart where the author is the only scope-holder BLOCKS rather than self-approving.

### Change control — the F# side

`src/Core/WorkflowEngine.fs` and its TS twin `src/Core.TypeScript/workflow-engine/agent-loop/work-lifecycle-state-machine.ts`
carry an eleven-state PR lifecycle. The register never touched it, so "delivered" meant delivered to
the organization's own bookkeeping. `change-control.ts` projects each task onto that lifecycle,
DERIVED from what the organization did:

```
Claim → StartWork → OpenPr → RequestReview → Approve → Merge
```

Two bugs came out of running it against a failing pipeline and reading what the canonical machine
refused:

- I closed the review loop with `ResolveAllThreads`, which advances straight to `Approved` — so
  every later revision request was illegal and the change read as approved while its gates were
  still failing. The loop closes with `RequestReview`.
- A cancelled task still merged, because `Merged` is terminal and the abandon was then refused.
  Cancellation short-circuits — and honours the canonical distinction between ABANDON (before a PR)
  and CLOSE (after one).

`disagreementsWith` is the check that the two records cannot drift: a merged change whose task is not
done, a done task whose change never merged, or any transition the lifecycle refused, is a REFUSAL in
the runtime rather than a line in the log.

### The trace

`runOrgRuntime` reported what happened as `readonly string[]` — readable, unqueryable. It is now
typed `OrgEvent`s, and **the supervisor chain on each one is computed by `emit` from the chart**, so
a caller cannot pass a wrong one. That single field makes `decidedUnder` possible:

```
cto's line: 23 event(s) (85% of the run), 4 decided directly
coo's line:  4 event(s) (15% of the run), 0 decided directly
```

An unknown actor gets an EMPTY chain rather than a fabricated one, and `unattributed` finds those —
a fabricated chain would attribute the act to a line it never belonged to and hide it forever.

### The reference gap map, honestly scored

`agentic-organization/docs/WORK_OS_OVERHAUL_GAPS_AND_DESIGN.md` lists G1–G16. Done: G3 intake, G5 hat-scoped observe, G8–G11
QA, G12 defect loop, G13 churn, G14 escalation, G16 typed events. Partial: G1 (four work types, not
nine), G4 (change control projects to Merged; no release workflow), G6/G7 (per-item, no work-batch
roll-up). **Not done: G2 work batches, G15 event-driven movement** — the cycle still runs once,
top to bottom, which is the same critique that doc makes of its own starting state.

### Result

```
bun test src/Core.TypeScript/corporate/   570 pass, 0 fail   (26 modules, 22 test files)
bun test src/Core.TypeScript/observe/    1624 pass, 0 fail   (no regression)
tsc --noEmit                                0 errors
mutation: 254 mutants, 24 modules, 254 killed
orphans:  0 / 202 exported functions
run-org:  exit 0 delivered · 1 not delivered · 2 unbuildable — all four modes verified
```

## Still open

### The remaining orchestration modules (of the 16)

| module | lines | what it adds |
|---|---|---|
| hat-lifecycle | 218 | bindings with expiry, succession, cooldown — makes wearing a hat temporal |
| assignment-engine | 200 | ranked assignment; today the RMO takes the first IC in the line |
| prioritization | 206 | priority classes and who may decide them — needed once goals compete |
| qa | 183 | test-case derivation + the `TestExecutor` port behind `runtime_validation` |
| reputation | 676 | Beta-Bernoulli / Normal-Gamma posteriors with decay; feeds assignment-engine |
| work-market | 978 | shards, claims, leases, quorum — scale-free work claiming |
| intake | 166 | normalizing external events into goals |

Partial: `rmo` (routing yes, supply computation / ranking / voting no), `schedule-optimizer`
(calendar and meetings yes, pressure model and correctives no), `observe-for-hat` (`projectFor` is a
simpler version).

- **No agent model drives the hat decisions.** The cycle's choosers are deterministic; the loop can
  run hatted with `--participant local-llm`, but a full org cycle driven by a model has not been run.
- **The cycle is in-memory.** The cascade, calendar and anchor board are values, not persisted to the
  event log the way `work-items/` is.
- **One initiative/project per parent in the plan shape.** `OrgCyclePlan` applies the same project
  and task titles under every parent; a real portfolio needs per-parent plans.

---

## Pass 5 — work batches and event-driven movement (G2, G15)

The critique the reference makes of its own starting state — *"the cycle runs once, top-to-bottom"* —
applied to `runOrgRuntime` as written. A pipeline's next step is whatever comes next in the source,
so a stall in phase four produces nothing at all and phase five runs anyway. Two modules close it.

### `work-batch.ts` — a batch, and the two legitimate ways to not be moving

An 8-state machine (`created → scoped → capacity_planned → scheduled → active ⇄ partially_blocked →
completion_check → done`), a roll-up that is a FOLD over recorded facts rather than a stored counter,
per-hat authority scoping derived from the chart (`own_items` / `own_batch` / `department` /
`organization`), and `movement()` — a score that carries its own triggers so a reader has already
been handed what to do about it.

### `org-reactor.ts` — the organization moving

A work queue, not a broker: `action = take next; perform; enqueue reactions to what happened`. Pure,
replayable, no polling. Quiescence and the step bound are DIFFERENT reported outcomes, so a runaway
cannot hide behind a full-looking run.

### Aligned to the canonical F# engine, not invented

`src/Core/WorkflowEngine.fs` and its TS port `workflow-engine/agent-loop/` already answered three
questions this module had answered its own way. Corrected to the canonical shape:

| divergence | canonical | fix |
|---|---|---|
| blocked state carried no dependency | `NamedBoundedWait of ctx * dep * eta` | `blockedOn` is REQUIRED to enter `partially_blocked`; holding with no named dependency is the standing-by failure, and that is now exactly the movement invariant |
| pause had no way out | *"the Paused state requires a real unpause transition"* (its own recorded finding) | `pauseBatch` / `resumeBatch`, and a paused batch's menu is exactly `[ResumeBatch]` — it returned `[]` before, which made pause terminal since the invariant also skips paused batches |
| the menu returned ONE action | *"a menu omitting valid options is COERCIVE"* | `menuFor` returns the legal SET; the reactor picks with `chooseWithinLegal` and the index is clamped. `PauseBatch` is offered on every live menu, last, so it is always reachable and never the default |

### Defects found by running it

- **A livelock.** `close → unfinished → back to Active → check → close → …` to the step bound, with
  the invariant never firing because it only runs at rest. Nothing changed between checks, so
  re-checking could not reach a different answer: the retreat now raises a signal instead.
- **`pending` and `raised` were one list.** They mean opposite things — work the loop did not reach
  versus work it created for a hat — so a healthy run read as a truncated one.
- **Quiescence was inferred from `steps < maxSteps`.** Wrong at the boundary: a run whose last legal
  action is also its last permitted step has finished. Read from the queue now.
- **Unblocking was unconditional**, so the loop marked a batch blocked and freed it on the next step
  with the blocker outstanding. A wait you may leave whenever you like is not a wait.
- **`unstaffed` counted DONE work**, so a fully delivered batch asked management to staff finished
  items forever. `stalledItems` already excluded Done — the same notion had two rules.
- **`MovementAction.None` was produced by nothing** — a dead enum member whose only use was an
  unreachable `case` that read like coverage.

### The audit instrument was itself broken

The caller-less audit reported 0/417 — implausible on its face. Its word-boundary regex was written
as a JS template literal, where `\b` is a backspace character, so nothing could ever match; a second
bug had `\s` in a plain string literal, which JS reads as `s`. Fixed, then **verified by planting a
deliberately uncalled export and confirming it gets flagged.** The earlier "0 / 202 orphans" above
was measured with the broken instrument and never actually held: three pre-existing caller-less
exports (`INTAKE_PATH`, `decideGate`, `UNIFORM_PRIOR`) had been sitting behind it.

### Verified

```
bun test src/Core.TypeScript/corporate/   633 pass, 0 fail
bun test src/Core.TypeScript/observe/     1624 pass, 0 fail  (no regression)
tsc --noEmit                              0 errors
mutation: work-batch 19/19 · org-reactor 22/22 killed
orphans:  386 / 386 exported symbols referenced in production (instrument falsified first)
run-org --admin: quiesces, per-hat scopes differ, operator drives a gate / the AUTHOR is refused
```

Still open from the reference: G1 (four work types, not nine) and G4 (no release workflow after
`Merged`).

---

## Pass 6 — the F# engine as main: the menu generator, DORA, and the leaf types

Directed to treat `src/Core/WorkflowEngine.fs` as MAIN and agentic-organization as REFERENCE. Doing
that settled one open gap and opened a bigger one.

### G4 is NOT a defect against main — settled, not built

The reference has a release workflow after `Merged`. **The F# does not, deliberately:** `Merged`,
`Closed` and `Abandoned` are the three terminal states, `isTerminal` includes `Merged`, and
`leadTimeSeconds` measures claim→merged. Building a release workflow would have diverged from the
canonical rather than completed it. Recorded and left alone.

### The gap that mattered: the menu generator did not exist

`state-machine.ts` says `transition` is *"defensive"* because **"the menu generator ensures only
valid options are offered at each state"** — and no menu generator existed. The README lists
`menu-generator.ts` under v2 scope, undone, while calling it the place *"where alignment lives"*.
The loop had a state machine, a work lifecycle, and no way to decide what to offer.

Built `src/Core.TypeScript/workflow-engine/agent-loop/menu-generator.ts` to the README's own three acceptance criteria:

- **Never coercive** — the free modes and escape hatches are on EVERY menu, in every state,
  unconditionally, and not parameterised so no future caller can gate them by passing something.
- **Never noise** — `ResumeFromPause` only when paused; work options gone when paused; a wait
  offered only for a dependency that can be NAMED; and the item already in flight is not offered
  again (picking it is a no-op that reads as a choice, so a loop can spin on it while looking busy).
- **Ordered, never gated** — scoring decides the ORDER of `PickWork` and nothing else. Ordering is
  advice; filtering is authority.

The score's uncertainty term is **up**, per `every-bug-has-economic-value` — a bug is *reducible
uncertainty*, so unresolved trouble raises a candidate. Written backwards it would rank the
already-understood work highest and systematically avoid the work that pays.

### DORA, with the unmeasurable declared rather than zero-filled

`WorkflowEngine.fs` carries `DoraMetrics` as the surface the loop is steered by; nothing computed
it. `src/Core.TypeScript/corporate/dora.ts` folds it from what the organization recorded — and returns the fields it
could NOT measure, with reasons, because a `0` meaning "unmeasured" is indistinguishable from a
measured zero, and the second is a claim.

### G1 closed — and closing it completed DORA

The reference's ladder ends at *"Task / Defect / Capability Request / Review / Incident"*. Ours had
one leaf type, and `intake.ts` mapped FOUR distinct inbound kinds onto it — the organization
classified an event as a defect or an incident and then **discarded that classification** the moment
it became work. So a restoration time had nothing to attach to: MTTR was not merely unmeasured, it
was **unmeasurable in principle**.

Added the five leaf types, made every "is this a task" check mean "is this a leaf", carried the
classification through intake AND decomposition, and derived incident windows from the run's own
trace. An incident run now reports **fully measured: true** with MTTR at 60s.

### Defects found by running it

- **`completeClaim` recorded no timestamp** while `releaseClaim` and `reapStaleClaims` both did — the
  SUCCESSFUL path was the one that lost its time, so DORA lead time was uncomputable. `nowMs` was
  already being passed in and thrown away.
- **`trajectoryHeat` read a parent's stored state.** Completion is derived from the leaves and never
  written back, so a fully delivered trajectory read HOT forever and the menu kept weighting
  finished work up.
- **`isOperationalLane` invented a rule** (`operational || backlog-row`) that disagreed with
  `dora-classify`, where `backlog-row` is not operational. The same agent would have read as
  balanced by one measure and lopsided by the other.
- **The two `Lane` taxonomies had a stated parity and no check.** Now a compile-time falsifier;
  verified by adding a lane to one side and watching it fail from both directions.
- **`work-projection` gated on `Task`**, so the moment leaves became plural the loop offered zero
  items and the organization looked idle while holding real work.
- **The non-coercion check could not fail** — nothing could make a menu coercive, because the seam a
  register would narrow through did not exist. Added `menuPolicy` (the seam `loop-policy.ts` already
  provides for the observe loop); a policy stripping a free mode is now caught.
- **The loop silently abandons in-flight work** when a new `PickWork` replaces it. The canonical
  `transition` keeps no note of the dropped item, so an agent can churn between two items forever
  while every cycle looks productive. Main is the contract, so this is REPORTED
  (`abandonedWorkId`), not changed.

### Verified

```
bun test corporate + workflow-engine + dora-classify   1153 pass, 0 fail
bun test observe                                       1624 pass, 0 fail  (no regression)
tsc --noEmit                                           0 errors
mutation: work-batch 19 - reactor 22 - menu 18 - dora 21 - bridge 31 = 111/111 killed
orphans:  442 / 442 exported symbols referenced in production
run-org:  DORA surface + 3 agent-loop cycles; incident run reports fully measured
```

Remaining honest gap: the reference nests **Goal -> Project -> Initiative**, ours nests
**Goal -> Initiative -> Project**. Recorded rather than silently changed — the reference defines a
Project as a *"long-lived product, platform, repo family"*, which is a container that outlives any
one goal rather than a rung inside one, and the F# has no work-type hierarchy to arbitrate.

---

## Pass 7 — the five open items, closed

### 1. The menu generator now exists in F#, and the treaty covers it

`workflow-treaty-transcript.json` byte-locks `transition`, `postResultTransition`, `cycleClose` and
`applyTransition` across TS and F#. It was written before `generateMenu` existed, so the newest and
most load-bearing part of the loop was the one part outside it — a cross-language treaty with a hole
in exactly the place most likely to drift.

Ported to `src/Core/MenuGenerator.fs` and locked by `MenuGeneration` vectors: the menu ORDER, every
score term, exact double equality. **Verified by mutation across the language boundary** — inverting
the uncertainty sign in the F# turns the treaty test red.

Three findings on the way:

- **`localeCompare` in the TS tie-break.** Culture-sensitive, which
  `.claude/rules/culture-invariant-by-default.md` forbids in a primitive — and it would have broken
  the byte-lock the first time two ids collated differently under a different ICU. Now ordinal on
  both sides, and the F# uses `String.CompareOrdinal`.
- **JSON cannot carry NaN.** `JSON.stringify` writes it as `null`, so a TS NaN arrived as a null
  token and `GetDouble` threw. Decoded back to NaN rather than dropping the vector — that vector is
  the one testing that both sides CLAMP a non-finite ratio identically.
- **Both replays now tally PER TYPE.** A single total cannot notice that one family of vectors
  stopped being emitted, so a regenerated transcript that dropped the menu vectors would have passed
  while silently retiring its own lock.

### 2. State is in Git, and the loop resumes

`src/Core.TypeScript/workflow-engine/agent-loop/state-store.ts` + `src/Core.TypeScript/workflow-engine/agent-loop/cli.ts`, and `src/Core.TypeScript/corporate/org-store.ts`. The README's *"state IS data
in Git append-only"* and *"the agent never holds state internally"* are now true: a paused agent's
next invocation, in a separate process, reads `Paused` off disk and is offered only the way out.

The shape is the one the repo already proved — one file per write, ZetaId-named, under a date shard,
so the merge is set union and conflicts are structurally impossible rather than merely unlikely. The
mechanics had been written three times (`tick-shards`, then this, then the org store), so they were
extracted to `src/Core.TypeScript/shard-store/shard-store.ts` first.

Findings:

- **The org store gave two different runs the same id.** The CLI passed `run-${nowMs}`, which is not
  unique when the clock is fixed — as it is in every deterministic run. Two runs collapsed into one
  and the store reported **0/1 delivered after two runs, one of which had delivered.** The run id is
  now minted from the run's own content.
- **`AgentContext.cycle` sat at 0 forever.** `transition` preserves the context by design and
  nothing advanced it, so the record's `cycle` and the state's `context.cycle` disagreed about the
  same fact.
- **`readShards` parsed any `.json` in the tree**, so a stray note or config became a record with
  whatever fields it happened to have.
- **`dateSegments` was assembled from local/UTC getter pairs.** `bun test` pins `TZ=UTC`, so a
  local-time read is invisible to the suite and only misbehaves on a contributor's machine. Rewritten
  on `toISOString`, which is UTC by definition — the mistake is now unwritable rather than untested.

### 3. A real model has driven the loop

`src/Core.TypeScript/workflow-engine/agent-loop/participant.ts`. `qwen2.5:0.5b` chose across three separate processes, persisting and
resuming each time. It picked **index 5 on the 7-option menu and index 4 on the 6-option paused
menu — the same option by content, at different positions**, so it is reading the menu rather than
emitting a constant. Same seed, same answer: DST survives a model in the loop.

The property that makes this safe is that **a model's authority is exactly one integer wide.** It
cannot invent an option, reorder the menu, or reach past it, and the three faults stay distinct — a
dead daemon is a runtime fault, unparseable output is a format failure, and an out-of-range pick is
an ILLEGAL SELECTION. Collapsing them would read a dropped connection as misbehaviour.

### 4. The rung ordering — settled, not deferred

The reference nests `Goal -> Project -> Initiative`; this ladder has them the other way round. Not a
contradiction: the reference defines a Project as a *"long-lived product, platform, repo family"*,
and a long-lived product cannot be the child of a single goal — goals are delivered while the product
persists across all of them. That top arrow is an ASSOCIATION, not a decomposition, and this cascade
models decomposition edges only.

So the real divergence is a **missing rung**, not an inverted pair: there is no long-lived container
above goals here. Recorded in `goal-cascade.ts` with the vocabulary mapping, and the rung order is
now pinned by a test so a future "align with the reference" cannot silently invert a correct ladder.

### 5. The RMO and the schedule pressure model

`rmo.ts` — supply computed from priority-weighted workload, supervisors vote, majority quorum, MEDIAN
target. `assignment-engine` already took a `supplyTarget` and already refused to over-staff; nothing
computed the number, so the one decision the office exists for was made by whoever was calling it.

`schedule-pressure.ts` — the question a calendar could not answer. A week can be conflict-free and
still impossible: booked solid with meetings, carrying twice its capacity, zero conflicts.

Findings:

- **The seniority test was inverted.** `LEVEL_RANK` is lower-is-more-senior, so `>= manager` admitted
  every level BELOW manager and locked the directors out — **a lead could authorize its own
  headcount**, which is the exact thing the vote exists to prevent.
- **Three RMO tests passed for the wrong reason.** A single vote never reaches quorum, so refusals
  about the VALUE were really refusals about the tally.
- **The parent-workload guard was never exercised** — the fixture used a `Project`, which the
  leaf-type check already excludes.

### Verified

```
bun test corporate + workflow-engine + shard-store + dora-classify   1293 pass, 0 fail
bun test observe                                                     1624 pass, 0 fail
dotnet build -c Release                                              0 warnings, 0 errors
dotnet test WorkflowEngineTests (the cross-language treaty)           passed
tsc --noEmit                                                          0 errors
mutation: 12 matrices, 204/204 killed
orphans:  509 / 509 exported symbols referenced in production
live:     a real local model drove three cycles, resuming from disk each time
```

---

## Pass 8 — the halves joined, and the organization made resumable

### 1. The two halves now meet

`src/Core.TypeScript/workflow-engine/agent-loop/cli.ts` had persistence and a participant and always ran against `emptySurface` with no
candidates — the model that drove three cycles was choosing over an organization with no work in it.
`src/Core.TypeScript/corporate/run-org.ts` had a real surface and neither persistence nor a participant. Both halves were
tested and mutation-checked; neither was connected to the other.

The core now offers `MainDeps.surface`; the register fills it (`src/Core.TypeScript/corporate/run-agent.ts`). The loop
still does not know an organization exists — the boundary test still passes. A local model picks REAL
work off a REAL run, records it, and resumes from disk.

Found on the way: the CLI path **silently abandoned in-flight work** while the bridge already
reported it — the same churn visible through one entry point and invisible through the other, and the
CLI is the one with a model and a store behind it.

### 2. The organization resumes

The trace could not support a fold as it stood, and the diagnosis is the interesting part:
`decision` is PROSE — *"owns defect 'implement the coupon fix'"* — with the work type inside the
sentence and the parent not in it at all. **`OrgEvent` was an audit trail, not an event-sourcing
log**: it answers what happened, who decided, and under what authority, and it could not answer what
IS.

State-constituting events now carry a typed `OrgFact` beside the sentence, and `org-fold.ts` rebuilds
the cascade, calendar, priorities, gate verdicts and portfolio book from the log alone. The falsifier
is the round trip — run the runtime, fold its OWN trace, assert equality node for node — which is
what makes "the log is sufficient" checkable rather than hopeful, and what fails when somebody adds
an emit and forgets its fact.

A second process now rebuilds 5 work items and 6 blocks from 17 stored facts and hands them to an
agent, with no runtime run.

### 3. The tick-shards migration — measured before it was made

`canonicalJson` sorted keys with `localeCompare(a, b, "en")`: culture-sensitive, forbidden in a
primitive, and it decides the digest that decides the filename. All **1675 shards on disk were
re-derived under both comparators and ZERO changed id**, because every `MetricsFrame` key is
lowercase ASCII where the two orders agree. The test now re-derives every shard against its own
filename, so the equivalence stays a check rather than a measurement somebody took once. A second
`localeCompare` in the frame ordering — which decides what a served rollup file contains — went with
it.

### 4. The long-lived container — a missing concept, not an inverted pair

The reference nests `Goal -> Project -> Initiative` and defines a Project as a *"long-lived product,
platform, repo family"*. A long-lived product cannot be the child of a single goal: goals are
delivered while the product persists across all of them. That arrow is an ASSOCIATION and this
cascade models decomposition only — so the divergence was never an ordering, it was a container that
outlives goals.

`portfolio.ts` is that container. It is **never delivered** — retirement is a deliberate act with a
reason, refused while its goals are live — and it accumulates goals ACROSS runs, which is the
question a cascade cannot answer because each goal is its own tree. Demonstrated: 1/1 -> 2/2 -> 3/3
across three stored runs.

### Defects found by running it

- **The RMO seniority test was INVERTED.** `LEVEL_RANK` is lower-is-more-senior, so `>= manager`
  admitted every level BELOW manager and locked the directors out — a lead could authorize its own
  headcount, the exact thing the vote exists to prevent.
- **The org store gave two different runs the same id.** `run-${nowMs}` is not unique when the clock
  is fixed, as it is in every deterministic run: it reported **0/1 delivered after two runs**, one of
  which had delivered.
- **`createId` was run-local**, so two runs sharing a store collided their work ids and the fold
  merged them into one organization.
- **`AgentContext.cycle` sat at 0 forever** while the record beside it counted properly.
- **`readShards` parsed any `.json`** in the tree as a record.
- **`dateSegments` used local/UTC getter pairs** — invisible under `bun test`, which pins `TZ=UTC`,
  and wrong only on a contributor's machine. Rewritten on `toISOString` so the mistake is unwritable.
- **The portfolio facts bypassed `openPortfolio`**, so its seniority rule could never fire — a rule
  that exists and never runs.
- Three RMO tests and several fold tests **passed for the wrong reason** (a single vote never reaches
  quorum; an identical duplicate cannot discriminate a Map).

### Verified

```
bun test corporate + workflow-engine + shard-store + dora-classify   1353 pass, 0 fail
bun test observe                                                     1627 pass, 0 fail
dotnet test WorkflowEngineTests (cross-language treaty)               passed
tsc --noEmit                                                          0 errors
mutation: 15 matrices, 250/250 killed
orphans:  539 / 539 exported symbols referenced in production
committed: 60471747b on org-implements-work (91 files) — not pushed
```

One intermittent: a single observe test failed once and passed on three subsequent full runs; it is
not in any file this pass touched and could not be reproduced.


## Pass 9 — the ports: where the organization touches reality

### The register orchestrated faithfully and performed nothing

"Implementation" moved a state to `done`. QA outcomes came from a configured fallback. Gate verdicts
were computed rather than earned. The inbound event was a hardcoded fixture. None of that is wrong —
a simulation is a legitimate thing to have — but it was **indistinguishable from the real thing at
every call site**, which is the failure `toy-is-free-metered-must-be-earned` names: unlabelled work
reads as real by default.

So this pass is not "add the real implementations". It is: make the boundary a declared, typed,
labelled seam.

### Fidelity is DERIVED, never declared

Five ports — intake, work execution, test execution, review, change control. Every provider says
whether it is `simulated` or `real`, and a `ProviderSet` derives one consequence: **a run that used a
real provider is not DST-replayable.** `replayable` is computed from the set, so the sentence a
caller would most like to write by accident — "deterministic" over a run that reached a shell — is
unwritable.

`resolve` **refuses** rather than falling back. A silent substitution would let a run configured for
real work report work it never performed, with nothing in the output to show for it.

### The ports are load-bearing, not decorative

Work no longer completes by reaching a line. Change control opens the branch BEFORE the executor
runs, because `execute` is handed `{ branch }` and that context was a promise the runtime was not
keeping — opening afterwards left every branch empty.

Same organization, same code, only the work command differing:

```
exits 0 -> DELIVERED, 2 changes projected, 2 landed, two --no-ff merges in a real repository
exits 1 -> NOT DELIVERED, leaves stay open, "work did not succeed: ... exited 1"
```

### A resumed organization inherits its market and its QA history

The log carried the cascade and the calendar and **not the work market**, so a resumed run started
with an empty queue and no test runs: an organization that had been interrupted looked exactly like
one that had never worked, and reported zero deployments however much had shipped.

Two new `OrgFact`s close it. The queue is a **snapshot** rather than a stream of deltas on purpose —
`work-market.ts` owns those transitions, and a fold that replayed them would be a second copy of that
state machine, free to drift. QA cycles **accumulate**, because a regression is *passed before, fails
now* and a fold keeping only the latest destroys every "before" it could report.

### Defects found by running it

- **A test wrote and COMMITTED into this repository.** `workdir ?? ""` makes `join` relative and
  `spawnSync` inherit the process's own directory, so under the mutation that strips `workdir` from
  the handle the worktree test operated on Zeta itself — two commits, since removed. The mutant was
  killed correctly; the side effect on its way past was the defect. The helper now refuses instead of
  defaulting, which is the discipline the adapters are built on.
- **The mutation harness could strand a mutant.** `finally` does not run when a process is killed,
  and one killed run left three mutants on disk across three files — the last found only because a
  test asserted MTTR. It now parks a pristine sidecar before the first write, restores any it finds
  at startup, and refuses a second concurrent runner. Falsified by planting a stranded mutant.
- **An ordering guarantee that could not fail.** The inbox sort was unfalsifiable through the adapter
  because filesystems already return entries alphabetically. Extracted as `inboxOrder`, which can be
  handed a list backwards — and the discriminating pair had to be chosen with care: `A` vs `b` sorts
  the same under both comparators, `Z` vs `a` does not.

---

## Pass 10 — the gates decided, the agent acting, and the last three ports shipped

### Six of the seven gates could not fail

Measured, over one run: 14 gate verdicts, 12 of them `approved (reviewed)` — a constant — and 2
`runtime_validation approved (1/1 passed)`. `CustomerRfpReview`, `BrdApproval`,
`ArchitectureApproval`, `ImplementationReview`, `FinalBusinessValidation` and `ReleaseReadiness` were
rubber stamps, and `fidelityOf` reported four ports and said nothing about it. **A gate that cannot
fail is the vacuity class standing exactly where the organization makes its quality claim** — and it
was the failure the port layer exists to prevent, sitting one layer above where pass 9 fixed it.

A fifth port. `autoApproveReview` changes no behaviour and now SAYS what it does; every verdict reads
`auto-approved — nothing reviewed this` rather than the word "reviewed", which made a constant read
as a judgement. Real adapters fail **closed**: `directoryReview` treats a missing verdict as
blocking, because "nobody has looked at this yet" and "this was reviewed and approved" are two
sentences an organization must never confuse.

Runtime validation is **not** routed to the reviewer. Green tests are green tests, and letting an
opinion outrank them would put the one earned verdict back on the same footing as the six that were
not.

### And then the override made that port decorative — measured, and removed

`deps.gateChooser` had one caller and no production path, and once the review port existed it could
do exactly one thing the port cannot: approve work whose TESTS FAILED. Its own test was named *"a
caller-supplied gate chooser still cannot approve a failing QA run by itself"* and then asserted
`delivered === true`.

With a reviewer that rejected everything:

```
before: 12 calls, all REJECT -> delivered: true,  no refusal said so
after:  12 calls, all REJECT -> delivered: false, 0 changes landed, 6 gates turned back
```

The seam and the design disagreed; the disagreement is settled in favour of the design. Both honest
uses were already ports — `agentReview` for the six gates, `simulatedTestRunner` for runtime
validation. What is gone is the ability to report `delivered` over red tests.

### An agent may act, and may not judge its own action

The fourth boundary — *the model chooses; it doesn't work* — closed at the seam rather than by
widening the model's authority. `AgentAttempt` has a summary and artifacts and **no `succeeded`
field**: an agent asked whether its own work succeeded has every incentive to say yes, no independent
view of the tree, and, being the thing under test, cannot be the thing that judges.

Measured against a real model before the tests were written. qwen2.5:0.5b, same item, same seed:

```
verifier exits 0 -> succeeded: true
verifier exits 1 -> succeeded: false
the model said, both times, byte-identically:
  "you can implement a feature that prevents the application of a coupon twice"
```

### The remaining three ports got a command line

`httpIntake`, `agentWorkExecutor` and `agentReview` were exported, tested and mutation-checked, and
reachable from nothing but tests — unshipped by this file's own standard. `--tracker` (with
`--tracker-map externalId=key --tracker-map title=fields.summary`), `--work-agent` + `--work-verify`,
and `--review-model` close that. `gitWorktreeChangeControl` gives every change its own checkout, so
`gitChangeControl`'s sequential-only limit is no longer a property held by an accident of the caller.

### Defects found by running it

- **The agent and the verifier judged different trees.** `commandProposal` ignored `ctx.workdir`, so
  the agent wrote into the shared repository while the verifier looked in the worktree — every item
  failed with the agent confidently reporting success. Found by the first end-to-end run, not by
  reading, and it is the same "reaches the verifier but not the agent" gap as the worktree adapter's,
  in the sibling written next to it.
- **A test suite sized against a budget it nearly exhausted.** The pass-8 note above — *"a single
  observe test failed once and passed on three subsequent full runs"* — was chased down this pass by
  recreating the load it happened under. `gitCommitToMain > the undo does not touch a concurrent
  uncommitted edit in another file` **timed out at 5000ms**, having taken 7360ms. A timeout, not an
  assertion: the undo clobbered nothing. Those eight real-git tests take ~31s idle — ~3.9s each — so
  they ran at ~78% of bun's default with nothing else on the machine. That is not a flaky test; it is
  a budget that was never right. Now 30s, ~8x measured, and falsified by setting it to 1ms.

### Verified

```
bun test corporate + workflow-engine                  1447 pass, 0 fail (1449 ran, 2 skipped)
bun test observe                                      1630 pass, 0 fail
tsc --noEmit                                             0 errors
mutation: 13 matrices, 119/119 killed, 0 survivors, 0 stale anchors
dotnet build -c Release                                  0 warnings, 0 errors
dotnet test Zeta.sln (incl. the cross-language treaty) 6207 pass, 0 fail, 8 skipped
  — the workflow treaty ran and passed; it is not among the skips, checked by name
pushed: org-implements-work (F# untouched by this arc; every commit is TypeScript)
```

### The second load-sensitive test, found and closed

The occurrence this pass first recorded as unidentified is now named. It was **not** the git test: it
was a SECOND test of the same class, and it was lost twice only because both times the run was
tail-captured. Caught on the next attempt by capturing everything:

```
src/Core.TypeScript/observe/tick-shards.test.ts:
(fail) the key sort is ORDINAL, and the change re-keyed nothing
       > EVERY SHARD ON DISK still resolves to its own filename [23630.63ms]
  ^ this test timed out after 5000ms.
```

**A different cause from the git one, and the difference is the interesting part.** The git tests sat
at ~78% of budget while IDLE, so any load tipped them. This one is *fast* at rest — the whole file
runs in ~440ms — but it re-derives **1675 shards**: 1675 file reads plus 1675 hashes. Its wall time
is set by filesystem CONTENTION rather than by its own cost, and contention is the one thing a
per-test default cannot know about. Under ten concurrent suites it stretched ~50x, to 23.6s.

Budget: 60s, ~2.5x the worst contention actually observed, and falsified by setting it to 1ms.
Deliberately not "disable the timeout" — a walk that never returns must still be caught. Verified by
re-running the full observe suite four times under the exact load that produced the failure: 1630/0
each, at 43–53s.

**And the class was swept, not just the instance.** Every observe test doing directory walks or
process spawns was timed: apart from these two, no single test averages above ~130ms, which is ~38x
headroom. No speculative budgets were added to tests that have never failed.

**The lesson that cost the most is procedural, not technical.** Both diagnoses were lost to
`| tail -n`, which drops the one line that names the failure. A suite run that might fail is captured
whole, or its failure is anonymous.


## Pass 11 — three places the register still spoke in a voice it had not earned

Every pass before this one closed a boundary between the register and reality. This one closes the
three remaining places where the register **described** a run in terms the run had not earned — the
same defect three times, at three different distances from the work: in memory, in prose, and on
disk. The pattern is worth naming because it is the one that keeps recurring: **a disclosure that
does not change when its inputs change discloses nothing.**

### The pure cycle said DELIVERED and could not say what decided it

`runOrgCycle` is deliberately a function of its inputs — no clock, no randomness, no I/O. That is a
feature and it is not the defect. The defect was the SILENCE beside it. Measured before the fix:
**14 of 14 gate verdicts approved** (runtime validation included), with no field anywhere in the
report from which a reader could learn it, while `run-org.ts --cycle` printed `task-004 passed the
gates` and `goal DELIVERED` in **exactly the same voice** as the run that reaches a real repository.

`cycleFidelity(deps)` now derives what answered each of the four decisions — gate, escalation,
staffing, work outcome — and renders the summary from that table rather than beside it:

```
this cycle PERFORMED NOTHING and reached nothing: 2 of 4 decisions came from the caller
```

Two properties were the point, and both are mutation-checked:

- **It is a measurement, not a label.** Supplying a `gateChooser` moves exactly one row to `caller`
  and leaves the escalation row a `preference`. A block that read the same whatever the caller
  supplied would be the vacuity class wearing a disclosure.
- **The early return carries it too.** `runOrgCycle` returns early when the goal is not accepted, and
  that return builds its report by hand — precisely where a new field goes missing with nothing
  noticing. Both paths are asserted.

Deliberately **no** `replayable: true` field: a flag typed as the literal `true` is the vacuity class
in its purest form, and this register has already shipped one.

### The direction was reversed and the record said the opposite

The maintainer's *"typescript is what we want to turn into the canonical"* sits four passes after
this item's own `## Pass 6 — the F# engine as main`. A reader arriving at either alone draws the
wrong conclusion, so the reconciliation is written down rather than left to be re-derived:
`docs/DECISIONS/2026-09-04-typescript-is-the-canonical-implementation-and-what-that-does-not-license.md`.

The two statements do not conflict. Pass 6 deferred to the implementation that **had already thought
a problem through** (named bounded wait, a real unpause transition, a menu that is not coercive).
Deferring to a better answer is not appointing a source of truth, and conflating them is how a good
decision becomes an appointed hub — `itron-hub-patent-boundary-p2p-is-the-upgrade.md` draws exactly
that line, and the discriminator is **exit, not degree**.

The direction was cheap to state because it was already the operating reality: the treaty transcript
lives in the TS tree, `generate-workflow-transcript.ts` writes its 283 vectors, and
`WorkflowEngine.Tests.fs` replays them. TS-first, F#-follows, treaty makes it checkable.

What it does **not** license is the useful half — three things, argued, two of them checkable today:

1. **Not a treaty with a hole.** Canonical-TS makes holes more tempting, not less: if TS is the
   source of truth, the reflex is that F# conformance is optional. A single implementation cannot be
   falsified — nothing exists to disagree with it.
2. **Not "TS-only is a gap" by default.** The distinction that matters is **adapter vs rule**.
   `directoryIntake` and `gitWorktreeChangeControl` are adapters and each host should differ;
   `fidelityOf` is a **rule** and would need vectors the day a second implementation appears.
3. **Not a private format.** A persisted format read by one program is an internal detail; read by
   **two** it is a wire format. The moment a second implementation reads the org event log, the
   `OrgFact` shapes join the treaty — said out loud so that transition cannot happen silently.

### Fidelity died at the disk boundary — and the store was losing events

`fidelityOf` told a **live** run whether it had touched anything. Nothing wrote it down. Measured: a
store built from real commands and real `--no-ff` merges resumed **identically** to one built from a
pure simulation — same run count, same `delivered: true`, same facts, same work items. That is the
failure the port layer exists to prevent, displaced in time and strictly worse: after the fact it is
not recoverable even in principle, because the evidence was never written.

Same shape as the three before it — a fact (`run_fidelity`), a fold (`foldRunFidelity` +
`everyRunWasSimulated`), and the CLI printing it — with the standing discipline that it is derived
from the ProviderSet rather than declared:

```
simulated  deliveryRate={"runs":1,"delivered":1,"deliveredForReal":0,
                         "deliveredSimulated":1,"deliveredUnknownFidelity":0}
           recorded runs=1  allSimulated=true   realPorts=[]
real       deliveryRate={"runs":1,"delivered":1,"deliveredForReal":1,
                         "deliveredSimulated":0,"deliveredUnknownFidelity":0}
           recorded runs=1  allSimulated=false  realPorts=[work_execution,change_control]
```

**UNKNOWN is a third answer, not a default.** Runs predating the fact carry no fidelity, and reading
that silence as "nothing was real" would invent a fact about history nobody observed — the same
refusal `directoryReview` makes when no verdict was filed. So `RunRecord.replayable` is optional,
absence is reported as `deliveredUnknownFidelity`, and **no field is written** for a run that has
none: a defaulted `false` would assert something unmeasured *and* change the run's minted id.
`everyRunWasSimulated([])` answers `false` for the same reason.

### The defect this uncovered was older and quieter than the one being fixed

A new test asserted two fidelity reports and got one. The cause was not in the new code.

`identifyEvent` deduped by the **writer's** `event.id` rather than by content. Two genuinely
different events that happened to share an id landed at different paths, were **both written**, and
then one was **dropped on read**. `run-org.ts --store S` run twice with different flags — which
mints the same ids every invocation — left:

```
78 event files on disk, 58 returned by readEvents   (20 events lost, nothing anywhere saying so)
```

Identity is now the content address: **78/78**. The original intent survives — byte-identical copies
still collapse, so a re-run or a merged branch does not duplicate history — and what no longer
collapses is two events that merely share a name. A third test asserts the reader's count equals the
file count, so "two files" and "two events" are one statement rather than two that can disagree.

**This is the fourth defect in this arc found by running the thing rather than reading it**, and the
count is now itself the finding: `commandProposal` ignoring `ctx.workdir`, `gateChooser` making the
review port decorative, the two load-sensitive observe tests, and now twenty silently unreadable
events. None was visible in review; all four were visible on the first real run.

### Falsifiers

Green proves nothing until mutated. 13 new mutants; the two that survived the first pass were real
holes and are named because they are the more useful half of the exercise:

| survivor | what it would have allowed |
|---|---|
| the delivered buckets counted **all** runs | a refused run inflating the only number that says how much of the history shipped — and silently, since the buckets still summed against each other |
| the event's `decision` **prose** was unchecked | the log reading `performed nothing` over a run that merged to a real branch — the same defect relocated from the field to the sentence a human actually reads |

Both closed, then 13/13. The `identifyEvent` fix carries its own mutant (`return event.id`), which
now goes red across three suites.

### State at the end of pass 11

```
bun test src/Core.TypeScript/corporate/            996 pass, 0 fail  (42 files)
tsc --noEmit                                         0 errors
mutation: 18 matrices, 140/140 killed, 0 survivors, 0 stale anchors
commits: a4c6e1ceb (cycle fidelity)  7cc97c107 (the decision)  3cc8afbc1 (fidelity on disk)
         13 files, +861 / -14
```

## Pass 12 — the fifth boundary, and three things that only came out under a real run

Passes 9 through 11 closed the four boundaries the ports were built for, and pass 11 shipped the
disclosure that says which of them a run actually crossed. This pass exists because that disclosure
immediately said something nobody had asked it: `run-agent.ts --store S` could only ever record
`replayable: true`, and no flag could change it.

### The two CLIs each held half of "end to end"

| | `run-org.ts` | `run-agent.ts` |
|---|---|---|
| real ports | all five, 27 flags | **none** — zero references to `providers` |
| model participant | **none** — zero references to `participant` | yes |
| persistence, `--resume` | `--store` | yes |

Measured, not read off the source:

```
bun run-agent.ts --agent alexa --at ... --store S
  deliveryRate = {"runs":1,"delivered":1,"deliveredForReal":0,"deliveredSimulated":1,...}
  run: delivered=true replayable=true realPorts=[]
```

The choosing was real in one and the doing was real in the other, and no single invocation had
both — which is what "end to end" was supposed to mean. `run-agent.ts` now parses the same flags
with the same `parseArgs` and maps them with the same `providersFromArgs`. One mapping, deliberately:
two would be two sets of defaults to drift, and the default is the answer that decides whether a run
touched anything. `--work-model` gives `modelProposal` the command line it never had.

The falsifier, against a real repository:

```
run: delivered=true replayable=false realPorts=["work_execution","change_control"]
git log --oneline
  fe4300a merge work/task-...-015@task-...-015
  195f39a merge work/task-...-013@task-...-013
  65bf61d work task-...-015
```

### Three defects, and the pattern is now the finding

**A performer with no verifier silently simulated.** `--work-agent claude` with no `--work-verify`
fell past every branch to `simulatedWorkExecutor(true)`. An operator who forgot the verifier got a
run in which every item succeeded, disclosed only by one line reading `simulated`. That is the
fallback the port layer exists to refuse, arriving through the argument parser instead of the
registry. `argRefusals` refuses it before the organization is built.

**A merge that moved nothing reported success.** `git merge --no-ff <branch>` where the branch sits
at the same commit as HEAD prints "Already up to date." and **exits 0**. Both git adapters read that
zero as a merge, so a run whose work produced no commit reported real delivery over a repository
nothing had happened in — and `deliveredForReal` counted it. Every unit test committed inside the
change before merging, so the empty case was never constructed and 12 of 12 mutants passed over a
branch no test reached.

**A refused merge did not contradict DELIVERED.** The runtime's own comment beside that call has
always said a refusal contradicts the claim rather than being logged beside it. It did not:
`delivered` was `isDelivered(cascade, goalId)` alone. The fix is narrow on purpose — it can only
bite where the change record and the repository disagree, which a simulated change control never
does — and the full suite stayed at 996/0 across it, which is also how we know nothing covered it.

**Five defects in this arc have now been found by running the thing rather than reading it**:
`commandProposal` ignoring `ctx.workdir`, `gateChooser` making the review port decorative, two
load-sensitive test budgets, twenty silently unreadable events, and now these three. The count is
the finding. None was visible in review; all were visible on a first real run.

### A false claim in a test header

`cli-adapters.test.ts` said it gave `agentReview` a command line. `run-org.ts` has never referenced
it — the adapter actually wired was `modelReview`. A file claiming to have closed a gap it did not
close is worse than one that never mentioned it, because the claim is what stops anyone checking.
Corrected in place rather than quietly widened.

`agentReview` takes a judge FUNCTION, and a function cannot come from argv. It is an embedder seam,
exercised in `review-adapters.test.ts`; its CLI-expressible siblings are the three that do have
flags. Inventing a fourth flag that spawned a process would be `commandReview` under another name.

### Falsifiers, and the six that had to fail first

20 new mutants across four matrices. Six survived the first pass, and each named a real hole:

| survivor | what it meant |
|---|---|
| both CLIs computed refusals and fell through to `if (false)` | `main` was untested for its own refusal path |
| `ports` parsed and never attached | nothing called `main` with a port flag and then read the record |
| `gitChangeControl` merging an empty branch | two adapters, one rule, and only one had a falsifier |
| an unparseable count read as `1` | unreachable through any adapter — so `commitsAhead` is exported and both unknown paths are falsified directly |

Then a seventh, found by the regression sweep rather than the new matrix: **the empty-branch guard
absorbed the case that used to cover the conflict refusal**, leaving `gitChangeControl`'s git-level
failure reached by no test at all. A genuinely conflicting merge now constructs it.

And two matrices had **juries too narrow to see the suite that would have judged them** —
`mut-adapters` and `mut-noopmerge` did not list `git-worktree.test.ts`, which the harness's own
docstring warns is exactly how a matrix reads as a result without being one. Both now name every
suite that exercises `adapters.ts`.

### State at the end of pass 12

```
bun test src/Core.TypeScript/corporate/         1025 pass, 0 fail  (43 files)
bun test src/Core.TypeScript/observe/           1630 pass, 0 fail  (111 files)
tsc --noEmit                                       0 errors
markdownlint, scoped to the branch diff             0 findings
mutation: 22 matrices, 160/160 killed, 0 survivors, 0 stale anchors
commit: aa4ace959
```

## Pass 13 — the disclosure asked about itself

Pass 12 closed the fifth boundary because the pass-11 disclosure said something nobody had asked
it. This pass exists for the same reason, one turn later: asked what its own `realPorts` field was
measuring, the answer was *the configuration*, and the sentence beside it said *"touched
something"*. Two defects, and the first hid the second.

### A. The fact was missing on every early return

`runOrgRuntime` has three `return empty()` paths — nothing workable, no matching item, goal not
accepted — and the emission sat past all of them. `empty()` carried `fidelity` in the **returned**
report, so a live caller was fine and the store was not:

```
the RUN RECORD says : {"replayable":true,"realPorts":[]}
the EVENT LOG says  : []
they disagree       : true
```

Two records of one fact in one store. `everyRunWasSimulated` and `run-agent --resume` both read the
**log**, so a resumed organization printed *"no run recorded its fidelity — UNKNOWN, not
simulated"* about a run whose fidelity was sitting in the same store.

Same shape as the `identifyEvent` loss in pass 11 — two views of one store, one silently short.
And the same early-return hole that pass closed for `runOrgCycle`, in its own words: *"AND SO DOES
THE EARLY RETURN — the path that never reaches a goal."* Its sibling was never checked.

### B. "Touched something" was not what the field measured

`fidelityOf` reads the ProviderSet's **labels**. Measured: a run with a real review port and no
workable goal reported `realPorts: ["review"]` with **zero gate evaluations** — the reviewer was
configured, not called.

A run now reports three things, all derived:

| | |
|---|---|
| `reached` | real **and** called — the only set "reached" can honestly name |
| `configuredNotCalled` | real and never called — its own answer, folded into neither of the others |
| `replayable` | configuration-derived, **unchanged**, deliberately conservative |

`replayable` stays a property of the **set**. A set holding a real adapter cannot be promised to
replay whether or not this particular run got that far, and answering otherwise is a promise the
next run breaks. Only the sentence overreached, so only the sentence changed.

The narrowing is honest in both directions: the never-reached case does **not** fall back to
"performed nothing", because the run is still un-replayable — the same set run again would reach.

### One recorder, one wording

Invocation is recorded by a single wrapper rather than by fourteen adapters counting themselves.
Fourteen places to be right about, three of which would quietly not be; here there is one, and
`invoked()` is the only way to learn the answer, so it cannot drift from what ran. The wrapper
passes each adapter's own `meta` through untouched, so `fidelityOf` over the wrapped set is
identical to `fidelityOf` over the raw one — with a falsifier for exactly that, since if wrapping
altered the metadata every label in the system would be one indirection from true.

`fidelityLine` is now the one wording. The emitted fact and both CLI prints had **independently**
said "touched something" about a field measuring configuration, which is how it drifted at all:
three copies is three chances to say what the report cannot support.

### Measured after

```
A.  the RUN RECORD says : {"replayable":false,"realPorts":["review"]}
    the EVENT LOG says  : [{"replayable":false,"realPorts":["review"]}]
    they disagree       : false

B.  reached=[]  configuredNotCalled=["review"]  replayable=false (still conservative)
    "no real port was called; configured real and never reached: review"

...and the happy path, end to end against a real repository:
    "these port(s) reached something real: change_control, work_execution"
    invoked=["change_control","intake","review","test_execution","work_execution"]
```

### Falsifiers

17 new mutants across two matrices. Two problems on the first pass, both real: a stale anchor on
the mixed sentence (reached one port, skipped another), and **a mutant that stopped recording the
review port survived** — the recorder's own tests covered intake and change control, and nothing
asserted what a full run's `invoked` contained. All five ports are now named in both a unit test
and an end-to-end one, because five wrappers is five chances to miss one.

Four anchors in earlier matrices went stale against these edits and were refreshed rather than
accepted. The three in `mut-runtimefid` moved into `noteFidelity` and were re-pointed so they stay
distinct from the new matrix rather than becoming duplicates of it.

**And a tautology of my own**, written into the new test file: `expect(x).toBe(cond ? x : x)` — a
check that cannot fail, in a file about checks that cannot fail. Replaced with the assertion it was
pretending to be.

### State at the end of pass 13

```
bun test src/Core.TypeScript/corporate/         1045 pass, 0 fail  (44 files)
bun test src/Core.TypeScript/observe/           1630 pass, 0 fail  (111 files)
tsc --noEmit                                       0 errors
mutation: 24 matrices, 177/177 killed, 0 survivors, 0 stale anchors
commit: 607c2804c
```

## Pass 14 — the record inside the code had drifted from the code

Three passes running, the next defect came from asking the previous pass's output a question. This
one came from asking a different question — *what does this register still say about itself that is
no longer true?* — and the answer was in the source files rather than in the reports.

### Three stale stated-limits, and why they are not documentation nits

"Stated rather than hidden" is used throughout this register to convert a limit into a promise about
the code. That makes a **stale** limit worse than an undocumented one: it sends the next reader to
build something that already exists.

| the claim | what was true |
|---|---|
| `run-agent.ts` header: *"its cascade and calendar are still recomputed rather than folded from the stored trace … it is the next thing"* | `--resume` has folded exactly those since **pass 8** |
| the docstring above `resumedSurface`: *"`queue` and `qa` are EMPTY"* | three lines below it, the code's own comment reads *"The queue and the QA history come from the LOG, not from an empty stand-in"* — one file contradicting itself |
| `org-store.ts` header: *"not yet a resumable runtime … is the next step and is not claimed by this module"* | `org-fold.ts` **opens by quoting that sentence** as the thing it closed |

Each now says what is true and records what it used to say, so the correction is legible rather
than silent.

### Nine docstrings that documented the wrong symbol

`run-agent.ts` held three doc comments stacked with nothing between them, so an editor showed
`mergeQueues` a docstring reading *"Run the organization and turn it into the surface the loop looks
at"* — a different function.

**The cause is mechanical, and it is mine.** Inserting a function by anchoring on
`export function X(` and pasting before it lands the new code **between X's doc comment and X**. The
diff is clean, the suite passes, and nothing anywhere says the docstring above X now belongs to
something else. Three times in two days — `requireReplayable`, `gitChangeControl`,
`providersFromArgs` — and caught by none of tsc, eslint, the suites, or review.

Two of the nine were older and neither was an insertion: `gateChooserFrom`'s docstring sat **after
its own function body**, above `agentsFromChart`, since the pass that extracted it; and
`goal-cascade.ts` carried two blocks for one const, which are merged rather than moved.

### The lint, and why the narrowing is the whole design

`src/Core.TypeScript/hygiene/lint-orphaned-doc-comments.ts`. A top-level doc comment immediately
followed by another, with no code between them, is always a bug.

A noisy lint gets suppressed, and a suppressed lint is a check that did not run — so:

- **File headers are exempt**, judged by POSITION rather than by reading the text. "Is this the
  first block?" is a fact; "does this read like a header?" is a guess. That case was **44 of the
  first draft's 101 findings**; the true tree-wide number is **57**.
- **Indented blocks are never flagged** — inside an interface or a union the pattern is correct.
- **Both delimiters must sit at column 0**, which is what makes a line scan safe: a regex cannot
  tell a closer inside a string from one that ends a block, and a lint that mis-parses is worse
  than no lint.

Wired to `hygiene:no-orphaned-doc-comments` and a `gate.yml` step, **scoped to `corporate/`** where
it is clean. The 57 elsewhere are pre-existing; widening is a separate change, because a step that
lands red is a step people learn to ignore.

**Registering it without wiring it was caught within the minute** by `hygiene:linter-coverage`:
*"a check that exists, can fail, and is wired to nothing reads exactly like a check that passed."*
That audit did to this lint precisely what this lint does to a docstring.

### Falsifiers

15 tests, **half of them for what must NOT fire** — that half decides whether anyone keeps the lint.
10 mutants, one survivor on the first pass: no test built a top-level block containing an INDENTED
closer, which happens whenever a docstring quotes code and under the mutant would misparse the rest
of the file. Constructed, then 10/10.

**And a contradiction of my own, inside the test that pins the boundary.** I asserted zero findings
under a comment claiming the case *"SHOULD fire"* — prose disagreeing with the code beneath it, in
the falsifier for a pass about prose disagreeing with the code beneath it. Rewritten to state the
actual behaviour and why the narrowing is deliberate.

### State at the end of pass 14

```
bun test corporate/ + the new lint            1060 pass, 0 fail  (45 files)
tsc --noEmit                                     0 errors
hygiene:no-orphaned-doc-comments                83 files clean (corporate/)
hygiene:linter-coverage               13 tools, 33 scripts agree
gate.yml parses; 233 steps, the new one present
mutation: 25 matrices, 187/187 killed, 0 survivors, 0 stale anchors
commit: 265174aa4
```

## Pass 15 — the lifecycle the maintainer actually described

The task was two things: port three modules recorded as unported, and then audit the delivery
lifecycle against a description of what it should be. The first turned out to be mostly done and
checking that was most of its work; the second was where the code was missing.

### The port list was stale, and the check is the finding

| module | measured against the reference |
|---|---|
| `observe-for-hat` | **fully ported** — `scopeOf` / `batchesInScope` in `work-batch.ts` are the same functions under corporate's names, exported and in use |
| `hat-lifecycle` | ported except one predicate; `hat-binding.ts` carries the transitions, succession and more |
| `schedule-optimizer` | pressure, correctives, meetings, calendars all present. One capability genuinely absent: **pace** |

A name-matched diff reported 0 of 15 schedule exports present, which was wrong in the direction
that produces fifteen duplicate functions. Same class as pass 14's stale stated-limits: a list of
what is missing, itself gone stale, read as a work plan.

### The chain was too short for the process it claimed to run

Seven gates covered discovery, BRD, architecture, implementation review, runtime validation,
business sign-off and release — and left out most of what a delivery does between them. Six added:

`business_context_grooming` · `peer_review` · `architecture_design` · **`adversarial_review`** ·
`qa_uat` · `final_architecture_review`

The adversarial gate is the distinctive one. It sits **after** the design and **before** the build,
because the interesting failures are between the documents and changing them is still cheap there;
and it is owned by three departments so the pass can come from outside the line that produced the
plan. `final_architecture_review` exists because `architecture_approval` judged a drawing six gates
earlier — approving the drawing is not approving the building.

All six are staffed in `org-seed.ts`; the runtime refuses to start when any gate has no owning hat,
so an unstaffed phase could never have merged as a silent no-op.

### The determinism claim, with falsifiers instead of a comment

`lifecycle.test.ts` drives the chain adversarially — ORDERED, OWNED, UNFORGEABLE, each asserted in
**both** directions so none is satisfied by a chain that simply never works. Every gate but the
first is refused from an empty history, tested for all of them by a hat that genuinely owns each;
`mayEvaluate` and `gateOwners` are cross-checked for every (hat, gate) pair; no gate lets a hat
approve work it did itself.

**A defect of mine, caught by the test I wrote for it**: thirteen `GateKind` values declared,
twelve wired into `ORDERED_GATES`. `final_architecture_review` was a phase that existed as a name
and was in no chain.

**And a test I damaged while fixing others.** Sixteen tests broke on the chain extension, each
because it had written down a position in the chain rather than asked for one. An automated rewrite
replaced the `passed` set in "OUT OF ORDER is refused" with that gate's own priors — making the call
in-order and leaving the test green while asserting nothing.

### A gate approval now says what it consulted

`GateEvaluation` recorded who, which, when, the outcome and a reason — not what they looked at. The
`Review` port already received evidence; none of it survived into the record.

**The first version REFUSED an evidence-free approval, and reversing that is the point.** It looked
like enforcement and was none: any string satisfies a presence check, and `autoApproveReview` —
"reads no evidence and consults nobody" — returns `auto-approved:<gate>:<workId>`, which passed
while consulting nothing. A control the null adapter satisfies is the vacuity class.

The shipped claim is the narrower true one: an attested approval is **distinguishable** from a bare
one, and the null reviewer **names itself** in the record. Before this both looked identical. What
stays impossible is making a fabricated reference impossible, and that is written down rather than
papered over.

### Pace, wired rather than shipped beside the runtime

`mission-trajectory.ts` answers a different question from `schedule-pressure.ts`: PACE, not LOAD.
An organization can be unloaded and badly behind, or slammed and exactly on time.

It landed unwired for one commit — the exact "library the loop does not consult" failure this whole
survey began from — and an audit over `corporate/` for modules nothing in the runtime or a CLI
imports is what caught it. Now on both return paths, with `--window-start` / `--window-target`,
refusals for a half-declared or backwards window, and the count taken from the cascade's own leaves
so the pace cannot disagree with the work.

### Escalation on an unknown

`EscalationTrigger.UnknownEncountered` — the trigger the other four could not express. Each of them
is a symptom observed from OUTSIDE; this one is raised by the worker itself, and it is the only
honest thing to do with a genuine unknown. Its legal actions deliberately exclude `AcceptRisk`:
accepting a risk you cannot describe is not a decision, it is the guess the trigger prevents.

### The audit

`docs/DECISIONS/2026-09-06-the-delivery-lifecycle-audited-against-what-was-asked-for.md` walks the
requested lifecycle against the implementation with a measurement for every row, and says how far
each gap was closed. Two stay open: "adversarial" is a name rather than a behaviour, and no single
invocation has driven a model through all thirteen gates against a real tracker and repository.

### State at the end of pass 15

```
bun test src/Core.TypeScript/corporate/     1092 pass, 0 fail  (46 files)
tsc --noEmit                                   0 errors
hygiene:no-orphaned-doc-comments              86 files clean
markdownlint, scoped to the diff               0 findings
mutation: 27 matrices, 200/200 killed, 0 survivors, 0 stale anchors
```
