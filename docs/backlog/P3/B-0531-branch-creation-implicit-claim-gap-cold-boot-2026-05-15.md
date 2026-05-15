---
id: B-0531
priority: P3
status: open
title: "Branch-creation IS the implicit claim — close the bus-coordinator gap"
tier: factory-infrastructure
effort: S
created: 2026-05-15
last_updated: 2026-05-15
depends_on: []
composes_with: [B-0400, B-0519, B-0530]
tags: [multi-foreground-surface, bus-claims, git-worktree, claim-coordinator, race-window]
type: chore
---

# Branch-creation IS the implicit claim — close the bus-coordinator gap

## Origin

2026-05-15 1336Z: a fresh Otto-CLI cold-boot session detected peer Otto-CLI
on `shard/tick-1336z-otto-cli-2026-05-15` — the cold-boot's exact wake slot.
The cold-boot Otto checked `tools/bus/claim.ts check --item tick-1336z-2026-05-15`
and got `unclaimed`. Branch existence was the only signal that the slot was taken.

Captured in [shard 1338Z.md](../../hygiene-history/ticks/2026/05/15/1338Z.md)
+ [PR #3487](https://github.com/Lucent-Financial-Group/Zeta/pull/3487).

## The gap

Multi-Otto coordination today uses TWO independent surfaces:

1. **Bus claim coordinator** (`tools/bus/claim.ts` — B-0400 slice 3) — explicit,
   advisory; rarely invoked for tick shards.
2. **Branch creation** (`shard/tick-<HHMM>z-otto-cli-<DATE>`) — implicit;
   universally used by all Otto-CLI shard work.

Branch creation IS the operational claim, but the bus coordinator doesn't
know about it. The race-mode failure: a peer that starts work EARLIER than
the cold-booting Otto could race to commit before either detects the other,
because each Otto's "detect peer" pass happens at a different wall-clock
moment.

Today's collision was peaceful because the cold-boot Otto woke AFTER peer
Otto's branch creation. A racing peer that started earlier could have
collided.

## Decomposable fix candidates

The minimum-viable fix doesn't require new bus protocol — only operational
discipline:

### Option A — autonomous-loop tick checks `git branch -a` before authoring

Cheap, no new code. Add to the canonical 7-step:

```bash
# Step 3 (pick work), tick-shard sub-case:
HHMM=$(date -u +"%H%M")
if git branch -a | grep -qE "tick-${HHMM,,}z-"; then
  echo "Peer Otto holds tick-${HHMM}Z slot; yielding"
  exit 0
fi
```

Captures the implicit-claim signal at the canonical detection point.

### Option B — branch creation auto-publishes bus claim

When a shard branch is created, the same tool (or a git hook) publishes a
`claim` envelope to `/tmp/zeta-bus/`. Pros: bus-as-truth; subscribers see
claims uniformly. Cons: requires either a wrapper around `git checkout -b`
or a `post-checkout` hook (which doesn't fire on all branch-creation paths).

### Option C — bus claim auto-acquired at worktree-add time

`tools/bus/claim.ts` gets a `--with-branch <ref>` flag that BOTH acquires
the claim AND creates the branch atomically. Cleanest API; requires
updating call sites. Composes naturally with the existing
`claim acquire --from otto-cli --item tick-<HHMM>z` pattern.

## Slice ordering (proposed)

1. **B-0531.1** (this row) — RCA + slice design (this file)
2. **B-0531.2** — Option A: add `git branch -a` check to
   [docs/AUTONOMOUS-LOOP-PER-TICK.md](../../AUTONOMOUS-LOOP-PER-TICK.md)
   step 3; field-test for ~10 ticks
3. **B-0531.3** — if Option A insufficient, layer Option C
   (`claim acquire --with-branch`)

## Composes with

- [B-0400](../../backlog/P1/B-0400-bus-protocol.md) — the bus protocol Options B/C extend
- [B-0519](./B-0519-multi-otto-branch-state-contamination-rca-2026-05-14.md) —
  general multi-Otto contamination patterns; this row is the narrow
  branch-as-claim slice
- [B-0530](../../../docs/backlog/) — cron-sentinel-mutex (in-flight); same
  shape of "two Ottos racing on the same resource" problem
- [.claude/rules/claim-acquire-before-worktree-work.md](../../../.claude/rules/claim-acquire-before-worktree-work.md) —
  the rule whose discipline this row would mechanize

## NOT IN SCOPE

- A new bus protocol version (B-0400 covers protocol design)
- Replacing the existing claim coordinator (this row composes WITH it)
- Cron sentinel coordination (B-0530's territory)

## Open questions

- Does `git branch -a | grep tick-<HHMM>z` reliably catch peer Otto on
  remote-only branches? Probably needs `git fetch` first → adds latency.
- Should the slot-yield path be a no-op exit or a substrate-honest
  visibility-signal-only run (like PR #3487 did via chat)?
