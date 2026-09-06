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
| event published | **absent** — no bus, no publication; the runtime calls its ports directly |
| rules evaluated → reaction plan | **absent** — the runtime is a top-to-bottom pipeline, not rule-driven reaction |
| leases / hat supply checked | **present** — work-market leases, RMO hat-supply voting |
| budget checked | **absent** |
| actions executed | **present** — five ports plus phase producers |
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

**The observe-act lane now is, and the wider runtime still is not.** Precisely:

- The **pipeline** takes a real ticket to a merged MR. Measured and reproducible.
- The **agent loop** chooses real work off a real cascade. Measured.
- The **join** exists, records durable ticks, measures divergence against a second selector, and
  **the gate demonstrably opens** — four dated runs against one store soak past 24h and the CLI
  prints `observe_act_primary`. That is the property the previous pass could not claim.
- The **runtime around it** is still a top-to-bottom pipeline, not the event-driven reactive loop
  the north star describes. Three elements of that loop remain absent, unchanged by this pass.

## What is still missing, honestly

1. **Event publication.** The runtime calls its ports directly; there is no bus and nothing
   subscribes. The reference has two packages for this; the register has none.
2. **Rules → reaction plan.** Reactions are coded into the pipeline's phase order rather than
   evaluated from rules against published events.
3. **Reconciliation.** Nothing verifies that the repository, the tracker and the organization's
   state agree. `changesUnlanded` is one instance of the idea; the reference generalises it in
   `change-control-reconciliation.ts`.
4. **Budget.** Not checked anywhere.

Those are named, bounded gaps in the *orchestration* layer. They do not make the observe-act work
above conditional — that lane is measured, mutated and reachable — but they are the reason this
document still does not say "the system works end to end".

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
- `agentic-organization/docs/OBSERVE_ACT_PROMOTION_GATE.md` — the rule this implements
- `agentic-organization/docs/ALWAYS_ON_ORCHESTRATION_RUNTIME.md` — the core loop the table judges against
