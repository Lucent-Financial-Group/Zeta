---
pr_number: 3336
title: "fix(shards): canonical bun tools/github/poll-pr-gate.ts command in 2 tick shards"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-15T00:55:33Z"
merged_at: "2026-05-15T01:01:00Z"
closed_at: "2026-05-15T01:01:00Z"
head_ref: "fix/tick-shards-canonical-poll-pr-gate-command-2026-05-15"
base_ref: "main"
archived_at: "2026-05-15T01:33:36Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3336: fix(shards): canonical bun tools/github/poll-pr-gate.ts command in 2 tick shards

## PR description

## Summary

Resolves Copilot post-merge finding on [PR #3332](https://github.com/Lucent-Financial-Group/Zeta/pull/3332). Two recently-merged tick shards used the shorthand \`poll-pr-gate.ts\` in their 7-step trace, but the canonical invocation per [\`.claude/rules/refresh-world-model-poll-pr-gate.md\`](../../.claude/rules/refresh-world-model-poll-pr-gate.md) is \`bun tools/github/poll-pr-gate.ts <PR>\`. Fixed in:

- \`docs/hygiene-history/ticks/2026/05/15/0036Z.md\` (line 18)
- \`docs/hygiene-history/ticks/2026/05/15/0049Z.md\` (line 19)

Future cold-boot agents copy-pasting from these shards now get the executable form.

## Discipline anchor

[\`.claude/rules/verify-before-deferring.md\`](../../.claude/rules/verify-before-deferring.md) — cited commands must be executable; shorthand fails the cold-boot copy-paste test.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-15T00:57:12Z)

## Pull request overview

This PR updates two hygiene-history tick shards to use canonical Bun-based PR gate polling commands, improving copy-paste reliability for future cold-boot agents.

**Changes:**
- Replaces shorthand `poll-pr-gate.ts` references with `bun tools/github/poll-pr-gate.ts`.
- Keeps the edits scoped to historical tick trace command text.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated 1 comment.

| File | Description |
| ---- | ----------- |
| `docs/hygiene-history/ticks/2026/05/15/0049Z.md` | Updates a single-PR refresh command to the executable canonical form. |
| `docs/hygiene-history/ticks/2026/05/15/0036Z.md` | Updates a refresh command, but it still does not match the documented multi-PR canonical form. |

### COMMENTED — @AceHack (2026-05-15T00:59:16Z)

_(no body)_

## Review threads

### Thread 1: docs/hygiene-history/ticks/2026/05/15/0036Z.md:18 (resolved)

**@copilot-pull-request-reviewer** (2026-05-15T00:57:11Z):

This still doesn't match the documented canonical command for a multi-PR refresh: `.claude/rules/refresh-world-model-poll-pr-gate.md:15-16` says single PR uses `poll-pr-gate.ts <PR>`, while multiple PRs should use `poll-pr-gate-batch.ts <PR1> <PR2> …`. As written, the backticked command omits the PR numbers and points copy-pasters at the single-PR script for a two-PR check.

**@AceHack** (2026-05-15T00:59:16Z):

Addressed in this push — 0036Z now uses `bun tools/github/poll-pr-gate-batch.ts 3320 3322` per the canonical multi-PR row of .claude/rules/refresh-world-model-poll-pr-gate.md:16.
