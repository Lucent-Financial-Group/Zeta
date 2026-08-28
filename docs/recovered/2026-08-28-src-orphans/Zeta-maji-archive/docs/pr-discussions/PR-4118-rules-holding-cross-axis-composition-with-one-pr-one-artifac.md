---
pr_number: 4118
title: "rules(holding): cross-axis composition with one-PR-one-artifact-type \u2014 saturation cadence is NOT license to bundle (forced-#6 meta-fallback)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-17T22:50:22Z"
merged_at: "2026-05-17T22:55:53Z"
closed_at: "2026-05-17T22:55:53Z"
head_ref: "otto/forced-6-meta-fallback-cross-axis-blob-pr-compose-2026-05-17"
base_ref: "main"
archived_at: "2026-05-17T23:35:26Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4118: rules(holding): cross-axis composition with one-PR-one-artifact-type — saturation cadence is NOT license to bundle (forced-#6 meta-fallback)

## PR description

## Summary

Forced-#6 meta-fallback on the 2207Z post-merge brief-ack chain. Adds a small cross-axis composition note to [PR #4110](https://github.com/Lucent-Financial-Group/Zeta/pull/4110)'s `Pre-empt-substrate-pool-saturation` anchor.

## The composition

- **Cadence rule** ([PR #4110](https://github.com/Lucent-Financial-Group/Zeta/pull/4110)) governs **WHEN** to pre-empt: ~3-4 Otto-initiated pre-empts per ~30-min GraphQL reset window, then forced-#6 + meta-fallback.
- **One-PR-one-artifact-type rule** (memory [`feedback_otto_cli_blob_pr_lesson_maji_antigravity_caught_4112_*`](https://github.com/Lucent-Financial-Group/Zeta/blob/main/memory/feedback_otto_cli_blob_pr_lesson_maji_antigravity_caught_4112_mixed_shard_rules_memory_2026_05_17.md) landed via [PR #4116](https://github.com/Lucent-Financial-Group/Zeta/pull/4116)) governs **HOW** each pre-empt should be shaped: split mixed artifacts.

Both bind independently. The cadence is NOT a license to bundle artifact types into a single pre-empt PR to fit more substrate per cycle.

## Why this matters

The 2026-05-17T22:07Z session arc demonstrated the failure mode: [PR #4112](https://github.com/Lucent-Financial-Group/Zeta/pull/4112) bundled three artifact types in one PR; [PR #4114](https://github.com/Lucent-Financial-Group/Zeta/pull/4114) Maji antigravity check flagged it as a blob; [PR #4116](https://github.com/Lucent-Financial-Group/Zeta/pull/4116) absorbed the lesson via single-artifact landing.

The blob-PR pattern fits within the cadence numerically (would count as 1 pre-empt) but VIOLATES the per-artifact-shape discipline. Future-Otto cold-boot must read both rules composably.

## Recursive application

This commit is itself the forced-#6 meta-fallback for the 22:07Z post-merge brief-ack chain (reached #6 at 22:46Z without genuine new substrate available). The single-file rule edit recursively applies the one-PR-one-artifact-type discipline being added.

## Test plan

- [ ] CodeQL passes (single-file rule edit)
- [ ] markdownlint passes
- [ ] Auto-merge fires when checks clear

## Composes with

- [PR #4110](https://github.com/Lucent-Financial-Group/Zeta/pull/4110) — the cadence anchor this composes with
- [PR #4112](https://github.com/Lucent-Financial-Group/Zeta/pull/4112) — the blob PR
- [PR #4114](https://github.com/Lucent-Financial-Group/Zeta/pull/4114) — Maji shadow log
- [PR #4116](https://github.com/Lucent-Financial-Group/Zeta/pull/4116) — blob-PR lesson absorption

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-17T22:51:42Z)

## Pull request overview

This PR updates a Claude rule to clarify that the substrate-saturation pre-empt cadence composes with the one-PR-one-artifact-type discipline, preventing cadence from being read as permission to bundle unrelated artifact types.

**Changes:**
- Adds a cross-axis composition note to the pre-empt-substrate-pool-saturation anchor.
- Links the new rule guidance to the memory file that captured the blob-PR lesson.

## Review threads

### Thread 1: .claude/rules/holding-without-named-dependency-is-standing-by-failure.md:359 (resolved)

**@copilot-pull-request-reviewer** (2026-05-17T22:51:41Z):

P1: This adds direct persona-name attribution on a current-state rule surface, which is outside the history-surface and roster-mapping carve-outs. Please rewrite the new prose to use role references (for example, the applicable loop-agent / antigravity-checker roles) while preserving the PR and memory links.
