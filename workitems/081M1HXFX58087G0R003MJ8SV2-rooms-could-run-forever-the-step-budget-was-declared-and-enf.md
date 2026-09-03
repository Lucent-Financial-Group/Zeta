---
id: 081M1HXFX58087G0R003MJ8SV2
type: bug
state: backlog
priority: P2
slug: rooms-could-run-forever-the-step-budget-was-declared-and-enf
title: "Rooms could run forever: the step budget was declared and enforced by nothing, and the tick runner had no deadline"
created: 2026-09-02T20:55:00.000Z
depends_on: []
composes_with: []
---

# Rooms could run forever: the step budget was declared and enforced by nothing, and the tick runner had no deadline

## The claim, and what was actually enforced

Rooms are specified to run "in test mode with injected test deps or in prod mode with real deps but
in either case they are bounded time — they can't run forever."

Measured against the code, that held nowhere:

| claim | reality before this change |
|---|---|
| test mode / prod mode seams | `SeamMode` existed in `agentic-organization/packages/application/src/room.ts` — and the sovereign room the loop runs had no notion of a mode at all |
| bounded, can't run forever | `RoomBudget.maxSteps` was **declared and read by nothing** — the identifier appears only in its own file, and `createDeterministicRoom` is called only by its own test |
| bounded, can't run forever | `src/Core.TypeScript/observe/room/room.ts` `tickRooms` **awaited `room.tick(...)` with no deadline of any kind** |

A budget that nothing consumes is the vacuity class applied to safety: it reads as a ceiling and
ceilings nothing. And a runner with no deadline does not merely *permit* a room to run forever — it
waits for it to.

## Fix

The sovereign `Room` gains `seamMode` and `budget`, and `tickRooms` enforces **two** bounds, because
either alone leaves the door open:

- **`maxSteps`** — once spent, the room is **refused**. Not throttled, not warned: `tick` is not
  invoked at all.
- **`maxTickMs`** — the runner stops waiting for a single overrunning tick.

**A timed-out tick still costs a step**, and that is the load-bearing detail rather than an
implementation nicety. If timeouts were free, a room that hangs on every tick would be retried
forever — bounded per tick and unbounded in aggregate, which is the same runaway in a smaller
costume. The step is therefore charged *before* the tick runs, so a tick that hangs **or throws**
still consumes it.

Omission cannot buy an exemption: a room that declares no budget gets `DEFAULT_ROOM_BUDGET`
(`maxSteps: 1024`, matching the org-side default so the two halves agree on the ceiling).

## Honest limit

JavaScript cannot cancel an in-flight promise. The deadline bounds **how long the runner waits**,
not the room's own execution — a hung tick's work may continue in the background until the process
ends. What the step budget then guarantees is that such a room is never *started* again. Claiming
the tick itself was killed would be a stronger promise than the runtime can keep, so the code and
the tests both say the weaker true thing.

## Verification

`room-bounded.dst.test.ts` — 7 invariants: hard ceiling; refusal is total (the tick is not called);
a timed-out tick costs a step; a throwing tick costs a step; the bound is identical in both seam
modes; a room with no declared budget is still bounded; determinism.

Mutation — 4 mutants, all caught:

| mutant | reddened |
|---|---|
| step refusal removed | 1, 2, 3, 4, 6 |
| timeout refunds its step | **3 exactly** — the load-bearing one |
| no default budget (omission = unbounded) | **6 exactly** |
| step never persisted to room state | 1, 2, 3, 4, 6 |

## Also worth recording

`tickRooms` has no production caller — it is invoked only by its own tests, exactly as
`createDeterministicRoom` is. The bound is now real wherever the runner is used; wiring the runner
into `run-loop-real.ts` is a separate piece of work and a separate decision.

Uncertainty is **not** part of this change: rooms already carry `RoomEvidenceUncertainty` in
`src/Core.TypeScript/observe/room/durable-room-evidence.ts`, so that half of the specification has a
surface already and did not need inventing.
