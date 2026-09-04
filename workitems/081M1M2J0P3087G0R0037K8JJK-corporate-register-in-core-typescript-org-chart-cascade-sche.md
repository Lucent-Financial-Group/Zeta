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

`observe/room/hat-gate.ts` carried `HatLevel` and says outright that it *"mirrors
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
   (`AGENT_WORK_RHYTHM_AND_PROMPT_FLOWS.md`), and without it "is this hat busy" has no answer —
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

`src/Core/WorkflowEngine.fs` and its TS twin `workflow-engine/agent-loop/work-lifecycle-state-machine.ts`
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

`WORK_OS_OVERHAUL_GAPS_AND_DESIGN.md` lists G1–G16. Done: G3 intake, G5 hat-scoped observe, G8–G11
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

Built `workflow-engine/agent-loop/menu-generator.ts` to the README's own three acceptance criteria:

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
it. `corporate/dora.ts` folds it from what the organization recorded — and returns the fields it
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

`agent-loop/state-store.ts` + `cli.ts`, and `corporate/org-store.ts`. The README's *"state IS data
in Git append-only"* and *"the agent never holds state internally"* are now true: a paused agent's
next invocation, in a separate process, reads `Paused` off disk and is offered only the way out.

The shape is the one the repo already proved — one file per write, ZetaId-named, under a date shard,
so the merge is set union and conflicts are structurally impossible rather than merely unlikely. The
mechanics had been written three times (`tick-shards`, then this, then the org store), so they were
extracted to `shard-store/shard-store.ts` first.

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

`agent-loop/participant.ts`. `qwen2.5:0.5b` chose across three separate processes, persisting and
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

`agent-loop/cli.ts` had persistence and a participant and always ran against `emptySurface` with no
candidates — the model that drove three cycles was choosing over an organization with no work in it.
`corporate/run-org.ts` had a real surface and neither persistence nor a participant. Both halves were
tested and mutation-checked; neither was connected to the other.

The core now offers `MainDeps.surface`; the register fills it (`corporate/run-agent.ts`). The loop
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

**One honest open item.** The observe suite failed once more, in a chained run that took 139s against
a 25s baseline, and **it is not identified** — I captured only the tail, losing the name, which is the
same mistake that cost the first occurrence a diagnosis. Five subsequent full runs under deliberate
concurrent load, and a replay of the exact chained sequence, were all 1630/0. It may be the same
timeout at a load level 30s does not cover, or a second load-sensitive test; there is no evidence to
choose between those, so neither is claimed. **Next occurrence: capture the full output.**
