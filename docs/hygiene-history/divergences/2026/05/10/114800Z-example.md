---
tick: "2026-05-10T11:48:00Z"
type: divergence
loop-a:
  agent: otto
  model: "claude-opus-4-7"
  harness: claude-code
loop-b:
  agent: codex-loop
  model: "gpt-5.5"
  harness: codex
topic: "EXAMPLE — docs/hygiene-history/divergences/README.md schema demonstration"
operative-authorization: "aaron 2026-05-04: \"it**, not just the output. Grinding through failures + recoveries\""
---

<!-- THIS IS AN EXAMPLE SHARD ONLY — illustrates the schema, not a real divergence -->

## Loop A perspective

otto (claude-opus-4-7, claude-code): The divergence shard README should open
with the operational trigger conditions before explaining the background
motivation, so an agent waking cold can immediately determine whether the
current situation requires filing a shard.

## Loop B perspective

codex-loop (gpt-5.5, codex): The divergence shard README should open with the
background motivation (why the surface exists) before the operational details,
matching the established pattern in `docs/hygiene-history/ticks/README.md`,
which opens with "Why shards exist."

## Disagreement summary

Both loops agree the divergence shard README must exist and cover operational
trigger conditions + schema. They disagree on section ordering: Loop A prefers
trigger-first (operational immediacy), Loop B prefers motivation-first
(consistent pattern with ticks/README.md). Either ordering is valid; the
disagreement is stylistic.

## Reconciliation

accept-loop-b — motivation-first ordering is consistent with the established
ticks/README.md pattern; consistency aids cold-boot orientation. (Aaron,
2026-05-10)
