---
pr_number: 4763
title: "backlog(B-0708): stale-pointer cleanup across .claude/rules/ \u2014 surfaced by razor-cadence pass"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-23T20:35:50Z"
merged_at: "2026-05-23T20:37:38Z"
closed_at: "2026-05-23T20:37:38Z"
head_ref: "otto/cli-b0708-stale-pointer-cleanup-from-razor-cadence-pass-2026-05-23"
base_ref: "main"
archived_at: "2026-05-24T01:24:15Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4763: backlog(B-0708): stale-pointer cleanup across .claude/rules/ — surfaced by razor-cadence pass

## PR description

Files B-0708. Razor-cadence pass 2026-05-23 (issue #3128 closed) ran audit-rule-cross-refs.ts and surfaced 87 stale-pointer candidates across 62 rules (16% MISS rate). ~70-80 real stale pointers worth cleaning up. P2; load-bearing finding from cadence pass.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-23T20:37:30Z)

## Pull request overview

Files backlog row **B-0708** to track follow-up work from the 2026-05-23 razor-cadence pass: cleaning up stale cross-references across `.claude/rules/` after `audit-rule-cross-refs.ts` surfaced 87 candidate misses.

**Changes:**
- Added a new P2 backlog per-row file documenting scope, rationale, and acceptance criteria for the stale-pointer cleanup work.
- Updated `docs/BACKLOG.md` to include the new B-0708 entry.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated no comments.

| File | Description |
| ---- | ----------- |
| docs/backlog/P2/B-0708-stale-pointer-cleanup-from-razor-cadence-pass-2026-05-23.md | New backlog row capturing the stale-pointer cleanup work item and its acceptance criteria. |
| docs/BACKLOG.md | Adds the generated index entry for B-0708 under P2. |
