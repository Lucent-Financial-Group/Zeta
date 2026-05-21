---
pr_number: 4396
title: "fix(lint): grandfather pre-existing 0007Z-c B-0668 broken link in tick-shard baseline"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-19T16:42:45Z"
merged_at: "2026-05-19T16:46:15Z"
closed_at: "2026-05-19T16:46:15Z"
head_ref: "otto/fix-shard-lint-baseline-0007z-c-grandfather-2026-05-19"
base_ref: "main"
archived_at: "2026-05-20T12:29:12Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4396: fix(lint): grandfather pre-existing 0007Z-c B-0668 broken link in tick-shard baseline

## PR description

## Summary

Re-shipping the baseline fix that was on #4393 branch but did NOT land via the squash-merge (auto-merge fired on first SHA before the second commit pushed; merge sha d3a81595 only included substrate landing, not the lint fix).

Without this fix, tick-shard relative-paths lint FAILS for ALL future PRs that trigger full-tree scan — confirmed locally.

## Root cause

`docs/hygiene-history/ticks/2026/05/19/0007Z-c.md` (already on main) references `../../../../../../docs/backlog/P1/B-0668-compositional-dbsp-...md` via 6-level relative path, but no `B-0668-*` file landed on `origin/main` — PRs #4281 + #4386 both CLOSED-without-merge per `gh pr view --json state`.

Per tick-shard immutability discipline (`.claude/rules/tick-must-never-stop.md`), shards are write-once at `docs/hygiene-history/ticks/YYYY/MM/DD/HHMMZ.md`. The link cannot be edited in-place. Baseline-grandfathering is the substrate-honest fix.

## Verification

```
$ bun tools/hygiene/audit-tick-shard-relative-paths.ts --enforce --baseline tools/hygiene/audit-tick-shard-relative-paths.baseline.json
scanned 1109 tick shards; 13 broken relative-path links (13 grandfathered by baseline, 0 new)
exit=0
```

## Composes with

- #4180 (baseline mechanism shipped)
- #4358 (peer Otto's earlier broken-link batch fix)
- #4393 (parent PR that surfaced the regression)

## Follow-up (separate PR if pursued)

Tasks #34 + #35 corrected — B-0668 + B-0669 substrate is NOT on main. Re-shipping those backlog rows is a separate substantive work item. Until then, baseline-grandfathering keeps CI unblocked.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-19T16:44:37Z)

## Pull request overview

Updates the tick-shard relative-path lint baseline to grandfather a newly-discovered (already-merged) broken link in the 2026-05-19 `0007Z-c` tick shard, keeping the `audit-tick-shard-relative-paths` CI gate from failing future PRs.

**Changes:**
- Add a baseline entry for `docs/hygiene-history/ticks/2026/05/19/0007Z-c.md:7` pointing at the missing `B-0668` backlog-row path so it’s treated as “known historical residue” under `--enforce --baseline`.

## General comments

### @chatgpt-codex-connector (2026-05-19T16:42:49Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
