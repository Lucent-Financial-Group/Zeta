---
id: 081M1HYDSCG087G0R0033RSEXV
type: task
state: backlog
priority: P2
slug: wire-tickrooms-into-run-loop-real-so-the-loop-s-pick-is-a-bo
title: "Wire tickRooms into run-loop-real so the loop's pick is a bounded room"
created: 2026-09-02T21:20:00.000Z
depends_on: []
composes_with: []
---

# Wire tickRooms into run-loop-real so the loop's pick is a bounded room

## Why this is not just tidiness

`tickRooms` had no production caller — it and its budget were exercised only by their own tests. So
"a room cannot run forever" was a true statement about a code path the loop never took.

The bound is not decorative in the loop. `participant.choose` has **no timeout of its own**, so a
`cloud:<persona>` or `local-llm` participant that never returns hangs the tick process indefinitely
— and the tick is driven by cron, so a wedged process is a wedged lane.

## What changed

The loop's pick now runs through `tickRooms`:

```
buildMenu -> createLoopRoom(...) -> tickRooms([room], world) -> execute
```

`createLoopRoom` is exported precisely so the wiring is testable — a test can drive the loop's own
room with a hanging participant rather than a lookalike.

The room is deliberately **behaviour-neutral**: its scope admits exactly the backlog the loop already
had, keeps the operator channel, and declares no PR numbers so `scopeWorld` leaves `forgeState`
untouched. It bounds the tick; it does not narrow what the loop may see. `maxSteps: 1` is the honest
budget — this entrypoint runs one tick — and `maxTickMs` defaults to 120s (`ZETA_LOOP_MAX_TICK_MS`
overrides), generous because a cloud persona or a cold local model can legitimately be slow.

On `timedOut`, `budgetExhausted` or `scopeViolation` the loop **executes nothing** and exits 1. A
tick with no pick has nothing to append, and guessing an action there would be worse than stopping.

`seamMode` follows `--dry-run`: a dry run binds mock seams, a real tick binds live ones — same code
path either way, which is the point of the seam model.

## Verified

- `bun test observe/run-loop-room-wiring.test.ts` — 5 pass. The first test is the one that matters:
  a hanging participant times out, returns **no action**, and still consumes its step so it cannot be
  retried forever.
- The loop runs end to end: `[room] loop-otto seams=mock step=1/1`, same pick as before the wiring.
- Whole `observe/` suite: 1444 → **1449 pass**, with its 7 pre-existing Windows path failures
  unchanged.
- `tsc` — pass, checked by capturing the real exit code rather than a pipeline's.

## createDeterministicRoom: deliberately NOT given a caller here

The other half of the "no production caller" observation resolves differently, and forcing it would
have been wrong. `agentic-organization/packages/application/src/room.ts`'s `createDeterministicRoom` produces a
**different `Room` abstraction** that happens to share the name:

| | org `Room` | sovereign `Room` |
|---|---|---|
| shape | `roomId`, `seams`, `clock`, `ids`, `hatIds`, `sandbox`, `credentialProxy` | `id`, `scope`, `state`, `tick()` |
| role | seam/identity container | scoped tick unit |

The loop needs the second. It cannot call the first without an adapter, and `src/Core.TypeScript`
has **no import of `agentic-organization` anywhere** — only path strings in manifest audits. Adding
one to make a bullet point go away would create a new cross-package coupling across a boundary the
repo has kept clean.

So: its production caller belongs to the org runtime's own composition, not to the sovereign loop.
Recorded rather than manufactured.

## The masked-failure class: measured, and it is not a repo defect

The other thing worth checking was whether the repo could silently ship a type error. Searched: the
`verification-command | tail` pattern that bit me locally appears in **no** committed workflow or
script — that was my ad-hoc shell, so there is no repo defect to lint for and adding one would be a
guard against a mistake the repo does not make.

The repo *does* document the adjacent hole itself, in `gate.yml`: `lint (TS)` is non-blocking, and
TS2322-class errors have reached `main` twice ("Slice 9 (PR #882) shipped a real TS2322 to main";
and on 2026-08-17 the identical class recurred while `gate (required)` reported SUCCESS). The file's
own words: *"codified rules (tsconfig strict mode) without a gate aren't a control."*

Making `lint (TS)` blocking is a branch-protection change, which this repo classes as a
treaty-amendment consent path and explicitly "a human call, not mine"
(`agencysignature-enforcement.yml`). So it is surfaced here for that decision rather than taken.
