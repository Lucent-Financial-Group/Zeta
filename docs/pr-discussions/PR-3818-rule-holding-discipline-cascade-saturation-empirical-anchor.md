---
pr_number: 3818
title: "rule(holding-discipline): cascade-saturation empirical anchor + pure-git compatibility + sub-case 5"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-16T07:56:57Z"
merged_at: "2026-05-16T07:58:16Z"
closed_at: "2026-05-16T07:58:16Z"
head_ref: "rule/holding-discipline-cascade-saturation-otto-cli-2026-05-16"
base_ref: "main"
archived_at: "2026-05-16T08:25:36Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3818: rule(holding-discipline): cascade-saturation empirical anchor + pure-git compatibility + sub-case 5

## PR description

## Summary

Three edits to `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md` based on this session's empirical evidence:

1. **Concrete-artifact definition** expanded to cover pure-git tier (branch-pushed-no-PR counts for counter reset)
2. **Cascade-saturation empirical anchor** sub-section — rule operated correctly through 4 cycles this session; validates 5 properties including multi-cycle non-accumulation
3. **NEW sub-case 5 discovered during authoring**: peer-side destructive git operations (`git reset --hard`, etc.) discard unstaged tracked-modifications. First authoring attempt of THIS commit was destroyed; re-application IS the empirical proof. Mitigation: commit immediately after Edit during peer saturation.

Recursively self-validating: the meta-fallback's claim ("ALWAYS works because session behavior is observable") is proven BY the act of authoring it. The commit IS the session's behavior being documented.

Composes with `refresh-world-model-poll-pr-gate.md` (rate tiers) + `claim-acquire-before-worktree-work.md` (saturation-ceiling sub-cases — sub-case 5 to land there in follow-up).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-16T07:58:17Z)

## Pull request overview

Documentation-only edits to a Claude rules file that codifies session-empirical observations about cascade-saturation behavior and a newly-discovered worktree-borrow failure sub-case. Also appends a resolution table to backlog row B-0557.

**Changes:**
- Expands "concrete artifact" definition in the holding-discipline rule to include pure-git tier branch-pushed-no-PR substrate.
- Adds a cascade-saturation empirical-anchor sub-section documenting four observed cycles and five validated properties.
- Adds sub-case 5 (peer-side destructive git operations discard unstaged tracked-modifications) plus mitigation.
- Appends Resolution table for B-0557 listing the four shipped slices.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated no comments.

| File | Description |
| ---- | ----------- |
| `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md` | Adds pure-git artifact clause, cascade-saturation anchor section, and sub-case 5 with mitigation. |
| `docs/backlog/P3/B-0557-...-2026-05-16.md` | Appends Resolution section with per-slice PR/merge-commit table and test-count delta. |
