---
pr_number: 3253
title: "feat(b-0461): file B-0442 slice 5.3 row (missed-substrate-cascade handler)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-14T21:25:45Z"
merged_at: "2026-05-14T21:28:07Z"
closed_at: "2026-05-14T21:28:07Z"
head_ref: "otto/b0461-missed-substrate-cascade-handler-2026-05-14"
base_ref: "main"
archived_at: "2026-05-14T21:31:39Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3253: feat(b-0461): file B-0442 slice 5.3 row (missed-substrate-cascade handler)

## PR description

## Summary

Closes the broken `composes_with` edge surfaced by [`audit-backlog-items.ts`](tools/hygiene/audit-backlog-items.ts) on origin/main: B-0460 frontmatter listed `composes_with: [..., B-0461]` but B-0461 didn't exist as a file. The reference existed as a placeholder in two rows (B-0449 design pass + B-0460 sibling table) explicitly naming "B-0461 — `missed-substrate-cascade` handler (slice 5.3)". This PR makes it real.

## Sibling row family (per [B-0449](docs/backlog/P1/B-0449-bg-services-slice-5-subscriber-agent-design-pass-2026-05-13.md) Option C design)

| Slice | Topic | Producer | Row |
|-------|-------|----------|-----|
| 5.1 | `infinite-backlog-nudge` | `standing-by-detector` (B-0440) | [B-0459](docs/backlog/P1/B-0459-b0440-slice-5-infinite-backlog-nudge-handler-2026-05-14.md) |
| 5.2 | `work-assignment` | `backlog-ready-notifier` (B-0441) | [B-0460](docs/backlog/P1/B-0460-b0441-slice-5-2-work-assignment-subscriber-handler-2026-05-14.md) |
| 5.3 | `missed-substrate-cascade` | `missed-substrate-detector` (B-0442) | **B-0461 (this PR)** |

## Audit verification

```text
Before: **Broken composes_with edges: 1** (B-0460 → missing B-0461)
After:  **Broken composes_with edges: 0**
```

The audit drove the gap-detection; this PR closes the gap.

## Scope (stub handler)

- Reads + logs `missed-substrate-cascade` envelopes from the bus dir
- Reports drift to tick output (visibility)
- Does NOT auto-open recovery PR — that's [B-0503](docs/backlog/P1/B-0503-b0442-slice5a-open-recovery-pr-core-function-2026-05-14.md) (core) + B-0504 (wiring)

## Why P1

The audit-driven completeness of the slice-5 row family unblocks future implementation of all three subscriber handlers as a coherent set. Without B-0461, edge references in B-0460 are ambiguous.

## Test plan

- [x] `markdownlint-cli2` clean
- [x] `bun tools/hygiene/audit-backlog-items.ts` → broken-composes_with edges: 0 (verified)
- [x] Composite branch-guard + `gh pr create --head` used
- [ ] CI clears
- [ ] Auto-merge

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-14T21:29:22Z)

## Pull request overview

Adds the missing B-0461 backlog row for the B-0442 slice 5.3 `missed-substrate-cascade` subscriber handler, completing the sibling row family referenced by B-0449/B-0460.

**Changes:**
- Creates B-0461 as a P1 backlog item.
- Documents origin, intended handler scope, acceptance criteria, dependencies, and related rows.
- Links the row to the B-0440/B-0441/B-0442 subscriber-handler family.

## Review threads

### Thread 1: docs/backlog/P1/B-0461-b0442-slice-5-3-missed-substrate-cascade-handler-2026-05-14.md:2 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-14T21:29:20Z):

This PR adds B-0461 but does not regenerate `docs/BACKLOG.md`; that generated index currently has no B-0461 entry. The backlog-index-integrity workflow runs `bun tools/backlog/generate-index.ts --check` when `docs/backlog/**` changes, so this will fail until the regenerated index is committed with the row.

### Thread 2: docs/backlog/P1/B-0461-b0442-slice-5-3-missed-substrate-cascade-handler-2026-05-14.md:55 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-14T21:29:21Z):

The documented payload shape does not match the current producer. `tools/bg/missed-substrate-detector.ts` publishes `branchName`, `missingCommits`, `recommendedAction`, and `urgency`; it does not publish `branchRef`, `headRefOid`, `squashCommit`, `missedCommitCount`, or `rationale`. Leaving this schema here will cause the future handler to read nonexistent fields.

### Thread 3: docs/backlog/P1/B-0461-b0442-slice-5-3-missed-substrate-cascade-handler-2026-05-14.md:68 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-14T21:29:21Z):

This acceptance criterion asks the handler to log `rationale`, but the B-0442 producer's `MissedSubstrateCascadePayload` has no rationale field. Align the logging requirement with the actual payload fields, otherwise implementers will either log undefined data or invent a field the producer never sends.

### Thread 4: docs/backlog/P1/B-0461-b0442-slice-5-3-missed-substrate-cascade-handler-2026-05-14.md:104 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-14T21:29:21Z):

This dependency chain makes B-0503/B-0504 look downstream of B-0461, but their row frontmatter does not depend on B-0461 (`B-0503` has no dependencies and `B-0504` depends only on `B-0503`). Representing them as children of this row will mislead backlog traversal; show them as related/parallel recovery work unless you also intend to add a real dependency edge.
