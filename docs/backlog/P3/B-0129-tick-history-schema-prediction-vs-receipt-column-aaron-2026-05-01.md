---
id: B-0129
priority: P3
status: open
title: Tick-history shard schema — add prediction-vs-receipt distinction (option c from prefab-shard matrix)
created: 2026-05-01
last_updated: 2026-05-01
---

# B-0129 — Tick-history shard schema: prediction-vs-receipt column distinction

**Filed:** 2026-05-01

**Filed by:** Otto under delegated backlog authority. Aaron's framing 2026-05-01: *"having a spot for prediction is not bad as long as it's clear it's prediction"* — validates option (c) from the prefab-shard structural matrix in `memory/feedback_tick_history_prefabricated_shards_codex_finding_audit_trail_integrity_2026_04_30.md`.

**Effort:** S (a few hours — schema doc update + migration of one or two example shards + lint update).

## What

Tick-history shard schema currently has col1 = "tick time" with implicit-receipt semantics (the row exists because the tick fired). The 2026-04-30 prefab finding (per the parent memory file) surfaced 14+ shards where col1 was authored ahead of the cron firing — *predictions* of tick-time, not *receipts*.

Aaron's prediction-OK framing makes option (c) the right direction:

- **Add a column** that distinguishes *prediction-time* from *receipt-time*, OR
- **Add a marker convention** in col1 (e.g., `*` suffix for prediction) that makes the distinction visible to readers without breaking the existing schema.

Both forms preserve the integrity invariant ("a shard claim must be honest about its evidence type") while accepting that predictions ARE legitimate substrate when explicitly labeled.

## Why P3 not P0/P1/P2

- **Low stakes per Aaron 2026-05-01**: *"at this point if history is not perfect it's okay clean it up if you like, if not just note it somewhere and lets do it right in the future, still low steakes, up to you greenfield."*
- **Greenfield framing applies**: not breaking real audit dependencies; the 14 prefab shards from 2026-04-29 are bounded historical artifacts, not a recurring class.
- **Forward-going prevention is the higher-value piece**: the schema improvement matters for FUTURE shards more than for cleaning up past ones.
- **Cadence-cost vs return**: low — readers of tick-history aren't being misled in load-bearing ways today.

## Acceptance criteria

1. **Schema doc updated** — `docs/hygiene-history/README.md` (or the canonical schema doc) explicitly distinguishes prediction-time vs receipt-time columns / markers.
2. **Migration policy documented** — what to do with the 14 existing prefab shards from 2026-04-29 (label retroactively / leave as-is / close the prediction-only ones; whichever Aaron prefers when this lands).
3. **Lint update (optional)** — if a tick-history validator exists, extend it to detect the distinction.

## Out of scope

- **Cleaning up the 14 existing prefab shards**: leave them as-is per Aaron's "low stakes / up to me" framing; this row is forward-going prevention, not retroactive cleanup.
- **Any change to tick-history substrate format beyond the prediction-vs-receipt distinction**.

## Composes with

- `memory/feedback_tick_history_prefabricated_shards_codex_finding_audit_trail_integrity_2026_04_30.md` — the parent finding. Option (c) from that file's matrix.
- `feedback_class_level_rules_need_orthogonality_check_extend_or_create_aaron_2026_05_01.md` — meta-meta-meta-rule. The schema improvement extends the existing tick-history class with a sub-distinction; doesn't create a new class.

## Status

**Filed.** No active incident requires this; activate when Aaron picks up the schema work or a future-substrate consumer needs the distinction.
