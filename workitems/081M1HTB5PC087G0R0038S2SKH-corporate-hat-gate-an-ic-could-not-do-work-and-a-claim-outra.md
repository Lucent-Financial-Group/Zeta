---
id: 081M1HTB5PC087G0R0038S2SKH
type: bug
state: backlog
priority: P2
slug: corporate-hat-gate-an-ic-could-not-do-work-and-a-claim-outra
title: "Corporate hat gate: an IC could not do work, and a claim outranked the execution it promised"
created: 2026-09-02T19:41:00.000Z
depends_on: []
composes_with: []
---

# Corporate hat gate: an IC could not do work, and a claim outranked the execution it promised

`src/Core.TypeScript/observe/room/hat-gate.ts` is the seam where the sovereign controller meets the corporate
hierarchy — `buildMenu(world)` → `hatFilter(menu, hat)` → `choose(filtered)`. Both defects below
were found by *running* it against the live world rather than by reading it, and both are
statements about a RELATIONSHIP between menu entries, which is why the existing example tests
passed over them.

## Defect 1 — the tier that exists to do the work could not do any

`do_item` was gated on `canCreateWork`, which is `false` at `individual_contributor`. Doing work
and creating work are different authorities; conflating them left the IC menu holding only free
modes. Measured against the live backlog:

| level | options | removed |
|---|---|---|
| executive_board / c_suite / director | 15 | — |
| manager / lead | 14 | edit_grammar |
| individual_contributor | 13 | **do_item**, edit_grammar |

A corporation whose ICs may not work is not a hierarchy, it is a caste system.

**Fix:** a new `canDoWork` bit, true at every level including IC; `canCreateWork` stays false at
IC, which is the distinction that made two bits necessary. Merges remain separately gated by
`canMerge`.

**Honest note carried in the code:** after this change no action in the current 16-slot grammar is
gated on `canCreateWork` — the grammar has no "create a work item" action (`decompose` creates
sub-tasks and is gated by `canDecompose`). The bit is kept because the distinction is real and the
grammar is expected to grow one, and it is called out in the type rather than left as a silently
dead field. Wiring it to an action is the grammar owner's call, not the filter's.

## Defect 2 — a claim outranked the execution it promises

`self_claim` fell through to `default: return true` and was ungated at every level. A hat could
promise to deliver an item the same hat was forbidden to touch. That is worse than either outcome
alone: the work does not happen AND a peer stands down because someone said they had it. An
unbackable commitment is the one thing a coordination primitive must not permit.

**Fix:** `do_item` and `self_claim` now share one `canExecuteItem` definition, so they cannot drift
apart again — the drift was the defect.

## The DST suite, and why examples were not enough

`src/Core.TypeScript/observe/room/hat-gate.dst.test.ts` drives seeded worlds through the gate with `splitmix64.mix` (the mixer the
C#/F#/Rust oracles already agree on), 8 seeds x 12 ticks x 6 levels, ~12,000 assertions, no clock,
no network, no filesystem. Six invariants:

1. **containment** — a filtered menu never contains a forbidden action
2. **non-coercion** — all four free modes survive at every level
3. **monotonicity** — a junior menu is a subset of every senior one
4. **claim coherence** — `self_claim` is offered only where `do_item` for the same item is
5. **determinism** — same seed replays exactly, and `fold(initial, trace)` equals the stepped world
6. **liveness** — every level with `canDoWork` is offered the work `buildMenu` selected

Invariant 6 exists because 1-4 are all SAFETY properties: **a gate returning the empty menu at
every level satisfies every one of them.** Defect 1 was over-restriction, so a safety-only suite
could never have caught it. Writing 6 is what turned the suite from plausible into load-bearing.

## Mutation results — the suite proves it goes red

| mutant | reddened |
|---|---|
| `self_claim` ungated (defect 2 restored) | 1 containment, 4 claim coherence |
| `do_item` back on `canCreateWork` (defect 1 restored) | 6 liveness |
| a free mode gated | 2 non-coercion |
| IC given an authority its lead lacks | 3 monotonicity |
| filter made order-nondeterministic | 5 determinism |

Five mutants, five distinct invariants, each catching the one it should. Baseline restored green
afterwards.

The first attempt at this matrix reported all five mutants green — because the mutator itself had
silently failed to apply. The harness now refuses loudly when its anchor is absent
(`MUTATION REFUSED`). A mutation run that no-ops looks exactly like a passing mutation test, which
is the same failure class the suite exists to catch.

## Reported, not fixed

`buildMenu` offers exactly one `do_item` — `backlog.find(i => i.ready && !i.ambiguous)` — merge or
not. So when that single first pick happens to be a merge, a level without `canMerge` is offered no
work at all even though later items in the backlog are doable. That is a `buildMenu` selection
property rather than a gate property, so it is recorded here instead of asserted in the gate suite.
Whether one-offer-per-tick is deliberate is the controller owner's call.
