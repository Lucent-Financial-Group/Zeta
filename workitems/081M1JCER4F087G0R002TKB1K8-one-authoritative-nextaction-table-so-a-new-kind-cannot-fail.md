---
id: 081M1JCER4F087G0R002TKB1K8
type: task
state: backlog
priority: P2
slug: one-authoritative-nextaction-table-so-a-new-kind-cannot-fail
title: "One authoritative NextAction table so a new kind cannot fail open"
created: 2026-09-03T00:52:00.000Z
depends_on: []
composes_with: []
---

# One authoritative NextAction table so a new kind cannot fail open

Port of the technique in `agentic-organization/docs/STATE_RECONCILIATION.md`, which solved the same
problem one layer up (work-item state named differently by the Work OS, the V0 schema, the UI and the
event names). The technique, in its own words: hold the mapping as a `Record` so it is
**compile-exhaustive** — *"adding a `WorkItemState` is a type error until a row is supplied (OCP — a
new state breaks the build, not just a runtime test)."*

## The divergence this side actually had

`NextAction` has 16 kinds and knowledge about each was spread across four surfaces, **three of which
failed open** on a kind they had never heard of:

| surface | shape | consequence for a new kind |
|---|---|---|
| `src/Core.TypeScript/observe/room/hat-gate.ts` `isAuthorized` | `default: return true` | authorized at every hat level |
| `src/Core.TypeScript/observe/room/room.ts` `isActionInScope` | trailing `return true` | in scope for every room |
| `grammar-16-render.ts` `leadSlot` | `default: return null` | silently slotless |
| `grammar-16-render.ts` `FREE_MODE_KINDS` | a private const listing four kinds by hand | a fourth copy of the NCI roster |

A `default: return true` is the vacuity class in gate form — it looks like a decision and decides
nothing. A 17th kind added tomorrow was authorized everywhere, in scope everywhere, and no test went
red. All four now read `ACTION_RECONCILIATION`, so a 17th kind fails to **compile**.

## The live defect it surfaced

`self_claim` carries an item and was reaching the scope predicate's trailing `return true`. A room
could therefore **claim work outside its own envelope** — commit to delivering an item it was never
scoped to touch. `hat-gate.ts` had already fixed the authority half of exactly this (a claim is a
promise to execute, so it is gated as the execution is); the scope half was still open. One row now
settles both, and a test pins it.

## What the table deliberately does NOT do

It does not invent the `kind -> slot` projection. `grammar-16.ts` states that projection is the next
slice and is *"left OPEN here on purpose — fabricating a clean total mapping would paper over a real
design question"*. So the `leadSlot` column records only what the renderer already answered, and
`null` means *the ADR has not assigned one*.

Likewise `not_yet_assigned` is a named row value rather than a silent `true`: the cartography,
time-travel and memory-sector kinds are ungated **today**, and `UNGATED_KINDS` makes that roster
visible and countable instead of implicit in a fall-through. Naming a gap is not closing it —
closing it is the grammar owner's call, and the roster is pinned by a test so it can only change
deliberately.

## Falsifiers

```
bun test src/Core.TypeScript/observe/action-reconciliation.test.ts   # 16 pass
bun test src/Core.TypeScript/observe/                                # 1472 pass
bun src/Core.TypeScript/lint/lint-typescript.ts                      # exit 0
```

Mutation matrix: **12/12 killed** — including both restored fail-opens (item scope returning true;
the operator channel ungated), the reverted `self_claim` defect in each of its two halves, an NCI
violation (a free mode acquiring a gate), and the slot-14 free-mode ordering that muscle memory
depends on.

The seven failures in the `observe/` suite are pre-existing Windows-only ones (POSIX path assertions
and `core.symlinks=false`) — verified identical with the change stashed.
