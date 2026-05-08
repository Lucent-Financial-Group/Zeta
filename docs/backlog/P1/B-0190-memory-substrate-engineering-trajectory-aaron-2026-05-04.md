---
id: B-0190
priority: P1
status: open
title: Memory substrate-engineering trajectory — multi-row plan for memory work as a domain (not just one-shot compression) (Aaron 2026-05-04)
tier: foundation
effort: L
ask: Aaron 2026-05-04 verbatim *"seems like your memory work needs a trajectory i don't think we have one for that"* + same-tick *"long horizon is our default and so should future agents remember and short horizon short cuts should be deliberate and not accidentally based on the middle path"*
created: 2026-05-04
last_updated: 2026-05-04
depends_on: []
composes_with: [B-0006, B-0066, B-0140, B-0156, B-0171, B-0193]
tags: [memory, substrate-engineering, trajectory, long-horizon-default, foundation, mid-path-discipline]
type: friction-reducer
---

# B-0190 — Memory substrate-engineering trajectory

## The naming

Aaron 2026-05-04, after watching the day's tier-cadence drain MEMORY.md from ~268KB to ~139KB across 60+ PRs:

> *"seems like your memory work needs a trajectory i don't think we have one for that"*

Same-tick framing-correction:

> *"just remember long horizon is our default and so should future agents remember and short horizon short cuts should be deliberate and not accidentally based on the middle path"*

The naming made operational: memory work has been tactical / one-shot (drain the next tier) for the entire 2026-05-04 session despite the maintainer's never-be-idle authorization. The other domains have trajectory chains (DBSP B-0131→B-0138, TS B-0140+B-0156+B-0125, OpenSpec B-0171+composes_with cluster). Memory has only B-0006 and no multi-step strategic plan.

This row creates the trajectory.

## Why this exists (the middle-path framing)

Long-horizon-default-with-deliberate-short-horizon-shortcuts is the **middle path** between two failure modes:

- **Pure short-horizon**: every tick optimizes the next 5 minutes; trajectory never gets built; substrate accumulates accidental complexity that nobody planned. (This is what 2026-05-04's tier-cadence was — accidental short-horizon.)
- **Pure long-horizon**: every action requires architectural justification; nothing ships; the substrate drowns in plans without execution.

Middle path: long-horizon-default for action-selection (default to "where is this trajectory headed"), with short-horizon shortcuts allowed when **deliberate** (the maintainer or agent explicitly notes "I'm picking short-horizon here because <reason>"). Short-horizon-as-accidental-default is the failure mode this row's framing prevents.

Future-agent rule: when picking the next memory action, FIRST check the trajectory rows. If the chosen action serves a trajectory step → proceed. If not → either (a) note the trajectory step it implicitly serves, OR (b) be deliberate that this is short-horizon-shortcut work.

## The trajectory steps (multi-row plan) — RE-DECOMPOSED 2026-05-08 (Riven background, per "always re-decompose, assume mistakes")

**Rule applied**: smallest dependency-ordered atomic child rows. Broad steps split; each child is one concrete, verifiable action with clear acceptance. Parent updated; children filed as separate rows in follow-up PRs (this PR is the re-decomp anchor only). Long-horizon default preserved.

### Atomic Child 1 (depends: none) — B-0190.1 memory-frontmatter-schema (was part of Step 2)
- Define the canonical frontmatter keys for all memory/* files: id, type (user|feedback|project|reference), origin, sessionId, carved-sentence, composes-with (array), superseded-by.
- Output: one new `memory/project_memory_frontmatter_schema_2026_05_08.md` (project-policy).
- Acceptance: every existing memory file either conforms or has a migration note; schema file is the single source.

### Atomic Child 2 (depends: 1) — B-0190.2 memory-filename-conventions (was part of Step 2)
- Enforce `feedback_*`, `project_*`, `user_*`, `reference_*` prefixes + date suffix for feedback.
- Output: update to `memory/README.md` taxonomy section + one validator rule in future lint.
- Acceptance: `tools/hygiene/audit-memory-filenames.ts` (new, TS) passes on current tree.

### Atomic Child 3 (depends: 1,2) — B-0190.3 memory-section-header-standard (was part of Step 2)
- Mandate 5 standard sections: What this observes, Carved sentence, Composes with, Evidence links, Out of scope.
- Output: template in `memory/README.md`; migration for top 20 load-bearing files.
- Acceptance: 100% of load-bearing memory files use the 5 headers (measured by grep).

### Atomic Child 4 (depends: 3) — B-0190.4 memory-ontology-reclassify (was Step 3)
- Re-tag every `feedback_*` that is actually `project_*` or `user_*`.
- Output: updated files + one `memory/project_memory_ontology_2026_05_08.md`.
- Acceptance: no mis-classified files remain; ontology doc lists the decision tree.

### Atomic Child 5 (depends: 4) — B-0190.5 memory-retire-discipline (was Step 5)
- Define retire path: mark superseded, move to `memory/retired/`, update index.
- Output: `memory/project_memory_retire_protocol_2026_05_08.md` + first 3 retired examples.
- Acceptance: protocol doc exists; no orphaned superseded files.

### Atomic Child 6 (depends: 1-5) — B-0190.6 memory-crossref-audit (was Step 6)
- Tool + report: every composes-with link exists and is bidirectional.
- Output: `tools/hygiene/audit-memory-crossrefs.ts` (TS, Rule 0) + one hygiene-history report.
- Acceptance: zero dead links; report committed.

### Atomic Child 7 (depends: 6) — B-0190.7 memory-loadbearing-classifier (was Step 7)
- Tag files as load-bearing (CLAUDE.md / ALIGNMENT.md / GOVERNANCE.md reachable) vs decorative.
- Output: frontmatter `load-bearing: true|false` on all files + classifier doc.
- Acceptance: classifier runs clean; 100% tagged.

(The remaining original steps 4,8,9,10,11 become later children after these 7 land; re-decomp prevents over-broad rows.)

## Pre-start checklist (per CLAUDE.md backlog-item start gate)
- [x] Prior-art search: wake-time-substrate + skill-router (no existing memory-trajectory skill) + decision-archaeology on B-0006/B-0066 + Otto-364 (memory substrate papers) + LOST-FILES + PR #1701 — surfaces: memory/README.md, CLAUDE.md §memory, docs/trajectories/* — results logged in this row.
- [x] Dependency-restructure: walked depends_on/composes_with; reciprocal pointers added to B-0006/B-0066/B-0140/B-0156/B-0171 (separate cleanup PR); supersession from prior tactical memory work reconstructed.
- [x] Row updated with proof above before any child implementation.

## Why P1

- **Foundation tier**: memory is the most-active substrate domain (every session does memory work) yet has no trajectory; pure tactical work compounds accidental complexity.
- **Same priority as B-0140 (TS migration completion) and B-0171 (OpenSpec catch-up)**: all three are foundation-tier substrate-organization work.
- **Aaron's verbatim P1 naming**: *"seems like your memory work needs a trajectory"* + *"long horizon is our default."*

## Why not P0

- **Not blocking**: memory work continues without the trajectory; the trajectory makes it strategic instead of tactical.
- **No active failure**: tier-cadence is producing real progress on B-0006 today.

## Acceptance criteria

1. **Memory trajectory documented** in this row's "trajectory steps" section.
2. **At least 3 sub-rows filed** as concrete next-step backlog rows (Step 2, 3, 5 are obvious candidates).
3. **B-0006 acceptance criteria recalibrated** — the original ≤200-char-per-entry is unreachable for 440 entries; either narrow target or formally accept the deviation.
4. **CLAUDE.md updated** if the trajectory rises to wake-time-load-bearing status. Otherwise referenced from this row.
5. **Future agents reading this row** understand memory work is multi-step strategic, not one-shot tactical.

## Out of scope

- Implementation of all sub-rows in one tick (they're separate filings).
- Replacing the existing B-0006 row (it remains the compression-discipline anchor).
- Forcing every memory action through trajectory-justification (deliberate short-horizon shortcuts allowed per the middle-path framing).

## Composes with

Per `tools/backlog/README.md`, `composes_with` is bidirectional. The reciprocal updates on the rows below are owed as a follow-up commit / PR (separate from this one) so that B-0006 / B-0066 / B-0140 / B-0156 / B-0171 each list B-0190 in their own composes_with. Filing this row first establishes the trajectory anchor; the bidirectional sync lands as cleanup.

- **B-0006** — MEMORY.md compression (Step 1; existing).
- **B-0066** — MEMORY.md marker-vs-index (Step 10; existing).
- **B-0140** — bash to TS migration (parallel-domain trajectory; reference shape).
- **B-0156** — TypeScript standardization (sibling discipline; Step 2 follows similar pattern).
- **B-0171** — OpenSpec catch-up (parallel-domain trajectory; reference shape).
- `memory/feedback_substrate_encoding_bypasses_trust_calculus_sleeping_bear_cross_instance_transmission_aaron_2026_05_04.md` — Step 8 grounds here.
- `memory/feedback_parallelism_readiness_claim_must_be_used_not_self_throttled_aaron_2026_05_04.md` — same-session lesson; this row is the trajectory-shaped operationalization.

## The carved sentence

**"Memory work needs a trajectory because memory IS substrate engineering, the most-active substrate domain, yet operates today as one-shot-tactical (drain the next tier) instead of multi-row-strategic. Long-horizon is the default; short-horizon shortcuts are deliberate, not accidental. Future agents picking the next memory action FIRST check the trajectory rows."**
