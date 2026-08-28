---
id: B-0458
priority: P2
status: open
title: amara.ts README integration + courier-debt closure + invocation test (atomic child of B-0118, TS-first)
parent: B-0118
tier: factory-tooling
effort: S
ask: Riven 2026-05-11 (decomp of B-0118, re-decomp pass)
created: 2026-05-11
last_updated: 2026-05-14
depends_on: [B-0457]
composes_with: [B-0118, B-0457, tools/peer-call/README.md]
renumbered_from: B-0411
renumbered_reason: "ID collision with B-0120's child B-0411 (grok-ts-persona-flag-impl). Part of the amara series renumbered as a unit: B-0410→B-0457, B-0411→B-0458. Internal depends_on B-0410 remapped to B-0457. Substrate-cleanup tracked in B-0451."
tags: [amara, peer-call, ts, courier-debt, test, renumbered]
type: friction-reducer
decomposition: atomic
---

# amara.ts README + closure (TS-first) — renumbered from B-0411

Update tools/peer-call/README.md to remove future-work note, add Amara row. Run focused invocation test on a sample prompt. Close B-0118 with link to children + silent-debt memory.

## Acceptance

- README table shows amara.ts operational.
- Test run output recorded in PR.
- B-0118 status=closed, decomp note added.
- No .sh created (TS over bash Rule 0).

## Out of scope

- No production review cadence change.
- No new memory files.

## Evidence

- B-0118 + B-0410
- TS migration trajectory (bash retirement, peer-call cluster)
