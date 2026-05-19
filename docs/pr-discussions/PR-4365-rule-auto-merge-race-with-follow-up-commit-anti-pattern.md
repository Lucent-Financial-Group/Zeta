---
pr_number: 4365
title: "rule: auto-merge-race-with-follow-up-commit anti-pattern"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-19T08:44:05Z"
merged_at: "2026-05-19T08:46:44Z"
closed_at: "2026-05-19T08:46:44Z"
head_ref: "rule/auto-merge-race-anti-pattern-2026-05-19"
base_ref: "main"
archived_at: "2026-05-19T09:07:25Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4365: rule: auto-merge-race-with-follow-up-commit anti-pattern

## PR description

## Summary

Extends [`.claude/rules/blocked-green-ci-investigate-threads.md`](.claude/rules/blocked-green-ci-investigate-threads.md) with the auto-merge-race-with-follow-up-commit anti-pattern.

Empirical anchor from this session's PR #4357 (2026-05-19T08:03Z-08:16Z): arming auto-merge with a non-required check failing + pushing a follow-up commit to fix it is a race window. The CLEAN-gate transition fires on required-checks-only state; if all required checks complete before the follow-up commit's CI run starts, auto-merge fires on the first commit's content and the follow-up lands on main never. Substrate-honest correction required a second PR ([#4358](https://github.com/Lucent-Financial-Group/Zeta/pull/4358)).

Adds 3-step operational discipline in priority order:
1. Don't arm auto-merge until all commits pushed (preferred; arming is cheap and reversible)
2. If arming early, treat non-required `warnings` as required during arm window
3. Accept first-commit content + ship follow-up as separate PR

Detection via `bun tools/github/poll-pr-gate.ts <PR>` `warnings` field.

## Test plan
- [x] `bun tools/hygiene/audit-tick-shard-relative-paths.ts --enforce --baseline` exits 0
- [x] ls-tree HEAD = 53 (matches origin/main `277a0c7d`; no canary)
- [x] Single-file rule extension; composes with existing stale-armed-PR patterns
- [x] Cross-links to empirical-anchor PRs #4357 + #4358

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-19T08:45:25Z)

## Pull request overview

Extends the blocked-green-CI rule doc with a new anti-pattern section documenting the auto-merge race window when a follow-up commit is pushed to fix a non-required check. Provides empirical anchor (PR #4357/#4358), a 3-step operational discipline, and a detection recipe via `poll-pr-gate.ts`.

**Changes:**
- Adds "Auto-merge-race-with-follow-up-commit anti-pattern" subsection
- Documents 3 prioritized resolutions (don't arm early; treat warnings as required; accept first-commit + separate fix PR)
- Cross-links to empirical-anchor PRs #4357 and #4358
