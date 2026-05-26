---
pr_number: 4789
title: "backlog(B-0714): file Soraya round-51 hand-off \u2014 3 TLA+ specs missing .cfg files (runnability gap)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-23T23:05:51Z"
merged_at: "2026-05-23T23:07:23Z"
closed_at: "2026-05-23T23:07:23Z"
head_ref: "otto/soraya-round51-b0714-tla-cfg-runnability-2026-05-23"
base_ref: "main"
archived_at: "2026-05-24T01:24:15Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4789: backlog(B-0714): file Soraya round-51 hand-off — 3 TLA+ specs missing .cfg files (runnability gap)

## PR description

## Summary

Soraya autonomous round 51 — runnability gap distinct from B-0709 registry gap.

Three TLA+ specs exist in `tools/tla/specs/` but have **no companion `.cfg` file**:

| Spec | LOC | `.cfg`? | Target |
|---|---|---|---|
| `AsyncStreamEnumerator.tla` | 71 | ❌ | F# IAsyncEnumerator contract (state-machine + concurrency) |
| `ConsistentHashRebalance.tla` | 63 | ❌ | Consistent-hash / Jump-Memento (state evolution) |
| `DictionaryStripedCAS.tla` | 59 | ❌ | DiskBackingStore stripe-CAS (multi-writer race) |

Without `.cfg`, TLC cannot be invoked — specs look like coverage but provide zero runtime verification.

## Distinct from B-0709

B-0709 = registry-coverage axis (Class 0 drift in `verification-registry.md`). This row = runnability axis. A spec can be registered yet still unrunnable for lack of `.cfg`. B-0709 + B-0714 together close both axes for these specs.

## Routing decision

- **Primary**: TLA+/TLC (correctly chosen for state-machine safety + concurrency interleaving)
- **Cross-check**: not yet warranted; `.cfg` is prerequisite per BP-16
- **TLA+-hammer guard**: CONFIRMING direction (stay with TLC); FsCheck-only would miss interleavings — CPU-month to reproduce on real hardware

## Effort

S each, total ~M. Assignee: kenji.

## Policy-flip authorization

Per Aaron's 2026-05-23 21:30Z direction: Otto auto-ships Soraya findings immediately.

## Test plan

- [ ] CI green (lint + backlog-index-integrity)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-23T23:07:28Z)

## Pull request overview

Adds a new backlog row (B-0714) documenting a TLA+/TLC runnability gap: three existing specs under `tools/tla/specs/` lack companion `.cfg` files, preventing TLC execution and CI gating.

**Changes:**
- Add `docs/backlog/P2/B-0714-…md` capturing the finding, routing rationale, and acceptance criteria for authoring the missing `.cfg` files.
- Update `docs/BACKLOG.md` to include the new B-0714 row in the P2 index.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated 2 comments.

| File | Description |
| ---- | ----------- |
| docs/backlog/P2/B-0714-soraya-round51-tla-cfg-runnability-gap-3-specs-2026-05-23.md | New backlog row describing missing `.cfg` files for three TLA+ specs and required CI wiring. |
| docs/BACKLOG.md | Adds B-0714 to the generated backlog index under P2. |

## Review threads

### Thread 1: docs/backlog/P2/B-0714-soraya-round51-tla-cfg-runnability-gap-3-specs-2026-05-23.md:36 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-23T23:07:27Z):

The LOC values in this table don’t match the current line counts of the referenced specs. `AsyncStreamEnumerator.tla` is 72 lines, `ConsistentHashRebalance.tla` is 64 lines, and `DictionaryStripedCAS.tla` is 60 lines (see `tools/tla/specs/*` in tree). Update the table so the evidence is accurate.

### Thread 2: docs/BACKLOG.md:678 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-23T23:07:27Z):

`docs/BACKLOG.md` is documented as a generated file (“DO NOT EDIT”) in `tools/backlog/README.md`. To avoid CI drift failures, ensure this change comes from rerunning `tools/backlog/generate-index.sh` (not a manual edit) so the index matches generator output.
