---
id: 081M1JCW23P087G0R000WC8259
type: task
state: backlog
priority: P2
slug: observe-act-promotion-gate-a-lane-earns-dispatch-it-does-not
title: "Observe-act promotion gate — a lane earns dispatch, it does not assert it"
created: 2026-09-03T01:02:00.000Z
depends_on: []
composes_with: []
---

# Observe-act promotion gate — a lane earns dispatch, it does not assert it

Port of `agentic-organization/docs/OBSERVE_ACT_PROMOTION_GATE.md`. Its load-bearing sentence is the
reason it is worth having here:

> *"The gate is deterministic. Agents may select from legal menu slots, but they do not decide
> whether the organization is safe to promote a lane."*

That is the shape this whole harness is built out of — a guardrail the agent cannot argue with —
applied to the one decision that matters most: whether the loop's actions reach the world.

## The two modes

| mode | what happens |
|---|---|
| `shadow` | the loop observes, builds the menu, chooses and RECORDS; dispatch is a shadow implementation |
| `primary` | dispatch uses the real injected runtime |

Thresholds are the org doc's, unchanged: promote on ≥100 ticks **or** ≥24h soak, zero illegal slot
selections, divergence ≤5%; demote on ≥2 selector rejections **or** ≥1 control-bypass rejection in
the last 30 minutes.

## Four properties, each a fail-open if dropped

1. **Demotion outranks promotion**, evaluated first and unconditionally. Otherwise a window that
   satisfies every promotion threshold while actively rejecting control checks gets congratulated on
   its soak.
2. **An insufficient window resolves to shadow.** Absence of evidence is not evidence of safety.
3. **A non-finite metric resolves to shadow.** The sharp one: every comparison against `NaN` is
   `false`, so a naive `divergence > MAX` reads a corrupt counter as "not too divergent". The window
   is validated *before* any threshold is applied.
4. **A refusal emits evidence too.** All six evidence refs are produced on every decision — a gate
   that only records its yeses cannot be audited for its noes.

Two more, on the executor side:

- The shadow executor reports `ok: true`, not a refusal — otherwise every shadow tick would read as
  a broken tick and would poison the very divergence rate the gate reads, so no lane could ever soak
  its way out of shadow.
- It reports tier `fake`, because nothing ran. Same rule the room sandbox follows: never misdescribe
  where work ran.

## Wiring

`run-loop-real.ts` evaluates the gate each tick and passes `executorForMode(gate.mode, executor)` to
`execute()`. Shadow **discards** the real executor rather than wrapping it — a shadow executor
holding a reference to the real one is one refactor away from calling it. Window path overridable
via `ZETA_PROMOTION_WINDOW`; default `db/promotion/window.json`.

## Honest scope

This is the DECISION, not the plumbing. The org side folds its window from durable
`observe_act_tick` events in Cockroach; here the window arrives as a value, so the gate stays pure
and replays under DST. What the gate cannot do is verify the numbers it was handed are true — a lane
reporting its own clean window is trusting the reporter. That is a property of the window SOURCE,
and it is stated in the module rather than implied away.

## Falsifiers

```
bun test src/Core.TypeScript/enforcement/promotion-gate.test.ts \
         src/Core.TypeScript/observe/execution-mode.test.ts     # 36 pass
bun src/Core.TypeScript/lint/lint-typescript.ts                 # exit 0
```

Mutation matrix: **13/13 killed** — validation moved after the thresholds (NaN slips through),
demotion checked after promotion, soak turned from OR into AND, an unreadable window treated as
safe, an absent window promoting, `parseWindow` defaulting a missing counter to zero, shadow mode
dispatching anyway, and the shadow executor misreporting its tier.
