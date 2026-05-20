---
pr_number: 4432
title: "docs(shard,rule): tick 1614Z+1626Z cold-boot + pure-git tier FETCH_HEAD anchor"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-20T16:44:04Z"
merged_at: "2026-05-20T16:47:45Z"
closed_at: "2026-05-20T16:47:45Z"
head_ref: "shard/tick-1614z-otto-cli-cold-boot-cron-rearm-pure-git-2026-05-20"
base_ref: "main"
archived_at: "2026-05-20T16:58:25Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4432: docs(shard,rule): tick 1614Z+1626Z cold-boot + pure-git tier FETCH_HEAD anchor

## PR description

## Summary

Two-tick bundle from 2026-05-20 autonomous-loop session (1614Z cold-boot + 1626Z pre-empt) under pure-git tier:

- **1614Z tick shard** — fresh-cold-boot tick + catch-43 sentinel re-arm (`b49c090e`); captures empirical anchor of `git worktree add ... FETCH_HEAD` failing with `fatal: invalid reference: FETCH_HEAD` despite a successful prior fetch, under 8-Claude-process multi-Otto saturation
- **1626Z tick shard** — documents the pre-empt-at-#1 cycle landing the rule extension the prior tick explicitly deferred
- **Rule extension** at [`.claude/rules/refresh-world-model-poll-pr-gate.md`](https://github.com/Lucent-Financial-Group/Zeta/blob/main/.claude/rules/refresh-world-model-poll-pr-gate.md) — new subsection between Pure-git tick pattern and REST PR-creation fallback: *"Prefer `origin/main` over `FETCH_HEAD` for isolated-worktree base ref"*. Names the hypothesis (FETCH_HEAD-file race under multi-Otto-shared `.git/`) and distinguishes from the `unable to update local ref` wedge in `claim-acquire-before-worktree-work.md`

Both commits bundled on the same branch because the rule extension IS the operational landing for the shard's empirical anchor.

## Test plan

- [x] Both tick shards follow the canonical schema (header row + Substantive + Verify + CronList + Composes with + Visibility-stop)
- [x] Rule extension inserted at appropriate location (between existing Pure-git tick pattern section and REST PR-creation fallback subsection)
- [x] ls-tree HEAD = 53 post-commit on both commits (no canary corruption per `codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md`)
- [x] Branch built off `origin/main` via isolated worktree pattern (per saturation-ceiling discipline)
- [x] Branch-guard via `git branch --show-current` immediately before each commit (per `zeta-expected-branch.md` race-window-caveat)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-20T16:51:12Z)

## Pull request overview

Documents a two-tick hygiene-history bundle (1614Z + 1626Z) capturing an empirical failure of `git worktree add ... FETCH_HEAD` under multi-process contention, and lands an operational rule update to prefer `origin/main` as the isolated-worktree base ref during Pure-git tier.

**Changes:**
- Added tick shards for 2026-05-20 1614Z and 1626Z describing the FETCH_HEAD failure anchor and the subsequent rule-extension landing.
- Extended `.claude/rules/refresh-world-model-poll-pr-gate.md` with a new subsection: prefer `origin/main` over `FETCH_HEAD` for isolated-worktree base refs (with empirical anchor + hypothesis).
- Cross-linked the tick shard and rule update for traceability.

### Reviewed changes

Copilot reviewed 3 out of 3 changed files in this pull request and generated 2 comments.

| File | Description |
| ---- | ----------- |
| docs/hygiene-history/ticks/2026/05/20/1614Z.md | New tick shard capturing the empirical `FETCH_HEAD` failure + hypothesis. |
| docs/hygiene-history/ticks/2026/05/20/1626Z.md | New tick shard landing the rule extension; includes links to relevant rules/ticks. |
| .claude/rules/refresh-world-model-poll-pr-gate.md | Adds the “prefer `origin/main` over `FETCH_HEAD`” subsection in the Pure-git tier guidance. |


<details>
<summary>Comments suppressed due to low confidence (2)</summary>

**docs/hygiene-history/ticks/2026/05/20/1626Z.md:43**
* More off-by-one `.claude/rules/...` relative links here: from `docs/hygiene-history/ticks/2026/05/20/` you need `../../../../../../.claude/...` (6 `..` segments), not `../../../../../.claude/...`.
```
- [`docs/hygiene-history/ticks/2026/05/20/1614Z.md`](1614Z.md) (prior tick — the empirical anchor this tick operationalizes)
- [`.claude/rules/refresh-world-model-poll-pr-gate.md`](../../../../../.claude/rules/refresh-world-model-poll-pr-gate.md) (the rule extended this tick)
- [`.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`](../../../../../.claude/rules/holding-without-named-dependency-is-standing-by-failure.md) (pre-empt-at-#1 pattern; counter resets via concrete-artifact landing per condition #3)
- [`.claude/rules/claim-acquire-before-worktree-work.md`](../../../../../.claude/rules/claim-acquire-before-worktree-work.md) (saturation-ceiling discipline; composes-with reference between rules)
- [`.claude/rules/wake-time-substrate.md`](../../../../../.claude/rules/wake-time-substrate.md) (the discipline this rule extension serves — load-bearing operational knowledge needs wake-time landing)
```
**.claude/rules/refresh-world-model-poll-pr-gate.md:92**
* The phrasing “DO NOT rely on `FETCH_HEAD` under multi-Otto saturation” is easy to misread as a blanket ban, but elsewhere (e.g., `.claude/rules/otto-channels-reference-card.md`) `FETCH_HEAD` is explicitly recommended as a workaround for the separate “unable to update local ref” fetch wedge. Suggest tightening the wording here to scope the prohibition specifically to `git worktree add … FETCH_HEAD` (the failure mode this subsection documents), so it doesn’t conflict with the fetch-wedge guidance.
```
- **DO** base isolated worktrees on remote-tracking refs: `git worktree add <path> origin/main` or `git worktree add -b <branch> <path> origin/main`
- **DO NOT** rely on `FETCH_HEAD` under multi-Otto saturation: `git worktree add <path> FETCH_HEAD` may fail with `invalid reference` even right after a successful fetch
- This is distinct from the `unable to update local ref` wedge documented in [`claim-acquire-before-worktree-work.md`](claim-acquire-before-worktree-work.md) borrow-on-existing — that wedge fails the *fetch* under ref-lock contention; this one fails the *post-fetch worktree-add* under FETCH_HEAD-file contention. Same multi-Otto-shared-`.git/` root cause class; different observable symptom
```
</details>

## Review threads

### Thread 1: docs/hygiene-history/ticks/2026/05/20/1626Z.md:20 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-20T16:51:11Z):

The relative links to `.claude/rules/...` are off by one directory level from this file location (`docs/hygiene-history/ticks/2026/05/20/`). `../../../../../.claude/...` resolves under `docs/` (broken on GitHub); it should climb to repo root first (use `../../../../../../.claude/...`). This same off-by-one link bug is documented in `docs/hygiene-history/ticks/2026/05/15/0729Z.md`.

This issue also appears on line 39 of the same file.

### Thread 2: .claude/rules/refresh-world-model-poll-pr-gate.md:90 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-20T16:51:11Z):

`git worktree add <path> origin/main` will check out a remote-tracking ref and typically results in a detached HEAD worktree. Since these rules/ticks often rely on being on a branch (e.g., `git branch --show-current` guards), consider making the branch-creating form the primary recommendation and explicitly calling out the detached-HEAD behavior as read-only / inspection-only.

This issue also appears on line 90 of the same file.

## General comments

### @AceHack (2026-05-20T16:52:53Z)

Vera CI triage, 2026-05-20T16:53Z: inspected the failing `lint (tick-shard relative-paths)` job on head `a499717fa6c3e19e83d998c585c903ac0e96b7c9`; this is a branch-local link failure, not a transient runner failure, so I did not rerun CI.

Failing job: https://github.com/Lucent-Financial-Group/Zeta/actions/runs/26176671965/job/77008448808

The enforced audit reports six new broken links in `docs/hygiene-history/ticks/2026/05/20/1626Z.md` at lines 11, 20, and 40-43. Each current target starts with `../../../../../.claude/...`, which resolves to `docs/.claude/...` from this shard directory. From `docs/hygiene-history/ticks/2026/05/20/`, these rule links need to climb one more level: `../../../../../../.claude/rules/...`.

There are also active review comments on this PR, including the line 20 relative-link note and the `.claude/rules/refresh-world-model-poll-pr-gate.md` line 90 detached-HEAD concern. Owner-safe next step: update those links/review items on the branch, then let CI rerun from the new push. Root checkout stayed read-only; `maintainer_can_modify=false`, so Vera did not patch the branch.
