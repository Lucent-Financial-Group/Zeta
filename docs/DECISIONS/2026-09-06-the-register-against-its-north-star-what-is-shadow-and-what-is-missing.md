# The register against its north star: what is shadow, and what is missing

Date: 2026-09-06
Status: recorded. This document exists because "the pipeline delivers" was used to imply "the system
works", and those are different sentences. It states which one is true.

## The correction that prompted it

The previous pass reported an end-to-end run — a Jira-shaped ticket over HTTP, thirteen gates, two
real `--no-ff` merges — and called it working end to end. The pipeline did do that. **The system did
not**, because the agent loop that is supposed to drive the organization was joined to the pipeline
in one direction only:

```ts
// run-org.ts, before this pass
resultFor: (o) => o.tag === "PickWork"
  ? { workId: o.work.id, lane: o.work.lane, success: true, doraContribution: 0.5 }
  : undefined
```

Every cycle in which an agent picked work reported that the work succeeded. `run-agent.ts` supplied
no `resultFor` at all, so there the choice simply vanished.

## The north star, as the design corpus states it

`agentic-organization/docs/` — 52 documents. Two are load-bearing here.

**`ALWAYS_ON_ORCHESTRATION_RUNTIME.md`** gives the core loop:

```text
state changes -> domain event persisted -> event published -> rules evaluated
  -> reaction plan created -> leases/budget/hat supply checked -> actions executed
  -> run requests / messages / tasks / reports / escalations created
  -> outcomes observed -> reconciliation verifies reality matches Organization state
```

**`OBSERVE_ACT_PROMOTION_GATE.md`** gives three modes and the rule for moving between them:

| mode | what dispatches |
|---|---|
| `legacy` | only the legacy lane |
| `observe_act_shadow` | menu rendered, slot selected, **evidence recorded** — command and tool dispatch are SHADOW |
| `observe_act_primary` | command dispatch, tool dispatch and act-time authorization use the REAL runtime |

Promotion requires ≥100 ticks **or** ≥24h soak, zero illegal slot selections, divergence ≤5%, and
primary safety counters below the demotion thresholds. And it is explicit about who decides:

> *"Agents may select from legal menu slots, but they do not decide whether the organization is safe
> to promote a lane."*

## What that makes the previous state

Not shadow. **Worse than shadow.** A shadow lane's entire value is recording what would have
happened while everyone knows nothing did; a lane that fabricates `success: true` is
indistinguishable in the record from one that worked. It was the vacuity class sitting on top of
the fifteen passes spent making the layer beneath it honest.

## What this pass changed

`slot-dispatch.ts`:

- **Three modes**, named as the design names them.
- **A dispatch seam.** `SlotDispatcher` is a port with `meta`, so it appears in a run's fidelity
  report like every other adapter.
- **Shadow performs nothing and invents nothing.** It returns **no `WorkResult`** — not a success,
  not a failure. In shadow the work was not done: `success: true` is a lie and `success: false` is
  also a lie, because it did not fail, it was not attempted. No result leaves the agent in
  `ExecutingWork` — picked up, outstanding — which is the true state.
- **Primary reaches the pipeline**, and a failing pipeline produces a failing result. The old
  constant had no way to express that case at all.
- **The gate decides, not the caller.** `dispatcherFor` takes a *verdict*, not a mode, so "run this
  in primary" is not a sentence a caller can say.
- **An unmeasured divergence BLOCKS.** A rate of zero from a comparison nobody ran is not a clean
  rate; and this is the gate that unlocks real dispatch of side effects, so it is the worst possible
  place to read absence as permission.

The CLI now prints what it is:

```text
mode:        observe_act_shadow — the shadow window has neither 100 ticks nor 24h of soak (0 ticks, 0h)
cycle 1:     7 option(s) -> EmitHeartbeat -> Idle  [not dispatched]
```

## WHERE THIS ACTUALLY STANDS — the honest table

| north-star element | state |
|---|---|
| domain event persisted | **present** — content-addressed shard store, folds |
| event published | **present, without a broker** — `org-reactor.ts` derives the next action from what just happened. I first recorded this as absent by looking for a bus; the module's own header answers it: *"a transport is not what makes this event-driven; deriving the next action from what just happened is"* |
| rules evaluated → reaction plan | **present** — `runReactor` is a work queue where `reactionsTo(events)` enqueues the next action, wired into the runtime at Phase 11. **My first table called this absent, and that was wrong** |
| leases / hat supply checked | **present** — work-market leases, RMO hat-supply voting |
| budget checked | **absent** |
| actions executed | **present** — five ports plus phase producers |
| **an agent's choice CAUSES the action** | **present as of this pass** — `deliverWorkItem`, reached through the dispatch seam |
| outcomes observed | **present** — fidelity, gate records with evidence, pace |
| **reconciliation verifies reality matches org state** | **absent** — the reference has `change-control-reconciliation.ts`; the register has only `changesUnlanded`, a single disagreement check |
| observe-act modes | **present as of this pass** |
| durable `observe_act_tick` window | **present as of this pass** — a fact on the log, folded into a rolling window |
| divergence measurement | **present as of this pass** — the observe-act selection compared against the legacy priority lane, every tick |

## A gate that cannot open is the vacuity class with the sign flipped

The first version of this document ended here, with the lane correctly stuck in shadow and two
named gaps. That was honest and it was not finished, because **a gate wired to a window that is
always empty refuses every time and is unfalsifiable.** Every refusal test passes; none of them
distinguishes a working gate from a disconnected one. A check that cannot fail proves nothing, and
a gate that cannot open measures nothing — the same defect, mirrored.

So the two gaps were closed rather than merely reported.

**`observe-act-window.ts`:**

- **The tick is a FACT** (`observe_act_tick`) on the same append-only log as fidelity, queues, QA
  and pace. Nothing new was invented; the missing piece was a fact nobody was emitting.
- **The window is a FOLD** — rolling, bounded, with ticks outside it dropped rather than aged down.
- **Soak is the SPAN, not the count.** Two ticks a day apart have soaked a day.
- **Divergence is defined and stated**, because the design names a rate without defining one: the
  observe-act selection compared against the **legacy priority lane** — a genuinely different
  selector, which is what lets the rate be non-zero. A measurement between one selector and itself
  reads 0% by construction and would sail through the gate proving nothing.
- **Both halves of a selection count.** Two lanes that both say `PickWork` on different items have
  diverged on the only thing that matters.
- **A partial comparison is still UNMEASURED.** A rate over the 10 ticks somebody compared out of
  100 is a rate whose denominator is not the window.

## So: is it working end to end?

**The lane runs end to end; two orchestration elements remain.** Precisely:

- The **pipeline** takes a real ticket to a merged MR. Measured and reproducible.
- The **agent loop** chooses real work off a real cascade. Measured.
- The **join** exists, records durable ticks, measures divergence against a second selector, and
  **the gate demonstrably opens** — four dated runs against one store soak past 24h and the CLI
  prints `observe_act_primary`. That is the property the previous pass could not claim.
- The **agent's choice now causes the delivery** — measured: picking work in primary opens and
  merges that exact branch, and a refused merge reaches the agent as a failure.
- **Reconciliation and budget** remain absent, and until they exist the north star's loop is not
  complete however well the rest of it runs.

## The join, closed at the return

Two rows of the table above were still decorative after the promotion gate was built, and the
second one was mine.

**`run-agent.ts` supplied no dispatcher at all.** A participant choosing `PickWork` advanced the
state machine to `ExecutingWork` and nothing ran. The reason nothing *could* be supplied honestly is
that the core's `resultFor` is **synchronous**, and reaching a delivery pipeline is asynchronous —
so the only value that fits a sync seam is one made up on the spot. The core now offers an **async
`dispatch`** on `MainDeps`, awaited by `mainAsync` after the participant has chosen, filled by the
register exactly as `surface` already was. The loop still does not know an organization exists.

**`run-org.ts` read the report of a pipeline that had already run.** Replacing the hardcoded
`{ success: true }` with a *lookup* felt like a fix and was not one: the pipeline ran because the
runtime iterated its own list, and the agent's choice was consulted by nobody. **A dispatcher that
reports an outcome it did not cause is the same lie told more quietly.**

Both now call `deliverWorkItem` — one definition of what delivering an item means: open a change,
walk the phases, merge what passed. Four failures stay four distinct outcomes and none is rounded
into another: nothing attempted / stopped at a named phase / judged and rejected / **passed every
gate and did not merge**. That last one is the disagreement change control exists to catch, and it
scores zero.

### And the deeper form of the same defect

Wiring the dispatcher was not enough, and the run said so. The runtime delivered every staffed task
*before* the agent loop was consulted, so `candidatesFrom` — live leaves only — returned **zero**,
and the agent's only legal choices were heartbeats. Every cycle chose `EmitHeartbeat` over an empty
list, with a fully-wired dispatcher behind it that never once ran. The choice was still decorative,
one layer down.

`deliverSelf` is what fixes it: the runtime may be told to deliver nothing and leave the work live.
**Someone has to leave the work undone for the agent to do it.** With `--agent-delivers` the same
run offers 2 candidates, the agent picks `PickWork`, and the delivery happens because it chose.

### What that measurement then showed

With real work on the menu, the divergence rate stopped being zero:

```text
mode:    observe_act_shadow — divergence 0.3333333333333333 exceeds 0.05
window:  12 shadow tick(s) over 72.0h, 12 compared, divergence 33.3%
```

The observe-act lane and the legacy priority lane genuinely disagree about which item to take, the
gate refuses promotion, and it is right to. That is the divergence measurement doing real work
rather than reporting a comfortable zero — which is the strongest evidence available that it is not
vacuous.

## What is still missing, honestly

1. **Reconciliation.** Nothing verifies that the repository, the tracker and the organization's
   state agree. `changesUnlanded` is one instance of the idea; the reference generalises it in
   `change-control-reconciliation.ts`.
2. **Budget.** Named in the north-star loop, checked nowhere.

Two bounded gaps, both in the orchestration layer, neither of which makes the work above
conditional. The earlier version of this list had four entries and **two of them were my error** —
`org-reactor.ts` is the rules-and-reactions machinery I recorded as absent, because I went looking
for a broker instead of reading the module that says why there isn't one.

## The clock, because it matters here

Promotion is a claim about time, and the CLI ran on a clock frozen at epoch 0. Reading `Date.now()`
would have made every run unreplayable and leaked wall time into the shared window — the failure
`local-time-never-enters-the-shared-fold` names. So the instant enters through a **declared
channel**, `--now <iso>`, defaulting to the frozen clock. The same flags always produce the same
window, and re-running one instant re-stores the same tick shards, which is an upsert: a repeated
run cannot inflate its own soak.

## Pointers

- `src/Core.TypeScript/corporate/slot-dispatch.ts` — modes, the seam, the gate
- `src/Core.TypeScript/corporate/slot-dispatch.test.ts` — 18 falsifiers, including that shadow
  produces no result and that an unmeasured divergence blocks
- `src/Core.TypeScript/corporate/observe-act-window.ts` — the durable tick, the rolling fold, the
  divergence definition and the legacy comparator
- `src/Core.TypeScript/corporate/observe-act-window.test.ts` — 21 falsifiers, led by the one that
  matters most: a real soaked window actually PROMOTES. Mutation matrix `mut-oawindow`: **17/17
  killed**, after two survivors exposed two of these tests as vacuous — one asserted that shadow
  ticks are excluded from the primary counters using ticks that were *also* outside the 30-minute
  demotion window, so the mode filter it claimed to test was never exercised
- `src/Core.TypeScript/corporate/work-delivery.ts` — `deliverWorkItem`: what a chosen slot DOES
- `src/Core.TypeScript/corporate/work-delivery.test.ts` — 15 falsifiers, led by "picking work in
  primary opens and merges a branch" (asserted on the port calls, so it is causation and not
  correlation) and its mirror, "in shadow the same choice opens no branch at all". Mutation matrix
  `mut-workdelivery`: **11/11 killed**, after three survivors showed three uncovered properties —
  including one guarding a phase whose gate has no eligible evaluator, which needed a reduced chart
  to reach at all
- `agentic-organization/docs/OBSERVE_ACT_PROMOTION_GATE.md` — the rule this implements
- `agentic-organization/docs/ALWAYS_ON_ORCHESTRATION_RUNTIME.md` — the core loop the table judges against
