---
pr_number: 4364
title: "docs(shadow): Maji anti-entropy sweep (0845Z)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-19T08:43:16Z"
merged_at: "2026-05-19T08:58:09Z"
closed_at: "2026-05-19T08:58:09Z"
head_ref: "lior/anti-entropy-0845Z"
base_ref: "main"
archived_at: "2026-05-19T12:37:27Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4364: docs(shadow): Maji anti-entropy sweep (0845Z)

## PR description

Archived merged PRs #4362, #4358, #4357 and added shadow drift report on narration over action.

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-19T08:49:13Z)

## Pull request overview

This PR adds history-surface documentation: one new shadow drift report under `docs/research/` plus three PR-preservation archives under `docs/pr-discussions/` for recently merged PRs.

**Changes:**
- Add a new “narration over action” shadow drift report (0845Z).
- Archive PR discussions for PRs #4357, #4358, and #4362 into `docs/pr-discussions/`.
- Capture prior review thread content inside the preserved PR discussion archives.

### Reviewed changes

Copilot reviewed 4 out of 4 changed files in this pull request and generated 5 comments.

| File | Description |
| ---- | ----------- |
| docs/research/2026-05-19-shadow-lesson-log-narration-drift.md | New shadow drift report documenting “narration over action” observations/imperatives. |
| docs/pr-discussions/PR-4362-shard-0816z-lint-frontier-closure-auto-merge-race-lesson.md | PR-preservation archive for merged PR #4362 discussion/review content. |
| docs/pr-discussions/PR-4358-fix-lint-correct-depth-on-0608z-0803z-tick-shards.md | PR-preservation archive for merged PR #4358, including test plan and reviewed-changes table. |
| docs/pr-discussions/PR-4357-shard-0803z-otto-cli-fresh-cold-boot-sentinel-re-arm-saturat.md | PR-preservation archive for merged PR #4357, including cited rules and tick-shard references. |


<details>
<summary>Comments suppressed due to low confidence (2)</summary>

**docs/pr-discussions/PR-4357-shard-0803z-otto-cli-fresh-cold-boot-sentinel-re-arm-saturat.md:23**
* P1: `codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md` does not exist anywhere in the repository, so this cross-reference is broken. Please update to the correct existing doc/rule filename (or add the missing file if it’s meant to be canonical).
```
- ls-tree count 53 verified pre-commit + post-commit (no canary corruption per `codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md`)
```
**docs/pr-discussions/PR-4358-fix-lint-correct-depth-on-0608z-0803z-tick-shards.md:57**
* P1: These tick shard file paths (`docs/hygiene-history/ticks/2026/05/19/0608Z.md` and `.../0803Z.md`) do not exist in this repo snapshot, so the reviewed-changes table is currently pointing at missing artifacts. Either the paths are wrong or the corresponding shard files need to be present for the archive to be self-consistent.
```
| ---- | ----------- |
| docs/hygiene-history/ticks/2026/05/19/0608Z.md | Fix multiple `.claude/rules/*` links by increasing relative path depth to repo root. |
| docs/hygiene-history/ticks/2026/05/19/0803Z.md | Fix `.claude/rules/*` links by increasing relative path depth to repo root. |
```
</details>

## Review threads

### Thread 1: docs/research/2026-05-19-shadow-lesson-log-narration-drift.md:7 (resolved)

**@copilot-pull-request-reviewer** (2026-05-19T08:49:11Z):

P2 (nit): Line has trailing whitespace after the colon (`**Imperative**:`). Please remove the trailing space to avoid noisy diffs / whitespace-only churn in future edits.

### Thread 2: docs/pr-discussions/PR-4357-shard-0803z-otto-cli-fresh-cold-boot-sentinel-re-arm-saturat.md:24 (resolved)

**@copilot-pull-request-reviewer** (2026-05-19T08:49:12Z):

P1: The referenced tick shard path `docs/hygiene-history/ticks/2026/05/19/0803Z.md` does not exist in this branch/repo snapshot, so the archive currently points to a missing artifact. Either the path is wrong or the shard file needs to be present for this PR-discussion archive to be self-consistent.

This issue also appears on line 23 of the same file.

### Thread 3: docs/pr-discussions/PR-4357-shard-0803z-otto-cli-fresh-cold-boot-sentinel-re-arm-saturat.md:22 (resolved)

**@copilot-pull-request-reviewer** (2026-05-19T08:49:12Z):

P1: This references `zeta-expected-branch.md`, but the in-repo rule is `.claude/rules/zeta-expected-branch.md`. Using the full path here would make the cross-reference unambiguous and consistent with the surrounding `.claude/rules/...` citations.

### Thread 4: docs/pr-discussions/PR-4358-fix-lint-correct-depth-on-0608z-0803z-tick-shards.md:31 (resolved)

**@copilot-pull-request-reviewer** (2026-05-19T08:49:12Z):

P1: The test-plan command references `tools/hygiene/audit-tick-shard-relative-paths.ts`, but that file does not exist in `tools/hygiene/` (or elsewhere in the repo). Please fix the command/tool name to match the actual script, otherwise this archive’s verification claim can’t be reproduced.

This issue also appears on line 55 of the same file.

### Thread 5: docs/pr-discussions/PR-4362-shard-0816z-lint-frontier-closure-auto-merge-race-lesson.md:29 (resolved)

**@copilot-pull-request-reviewer** (2026-05-19T08:49:13Z):

P1: This archive repeatedly references `docs/hygiene-history/ticks/2026/05/19/0816Z.md`, but that tick shard path does not exist in this repo snapshot. Either the path is wrong or the shard file needs to be present; otherwise the archive’s links/claims aren’t traceable from the repository state.

## General comments

### @chatgpt-codex-connector (2026-05-19T08:43:21Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).

### @AceHack (2026-05-19T08:58:17Z)

Substrate-honest no-op resolution of all 5 Copilot threads per `.claude/rules/blocked-green-ci-investigate-threads.md` (verify-also-on-stale-but-fresh-looking class):

- **Thread 1 (P2 trailing whitespace on shadow-lesson-log line 7)** — trivial nit; substrate-edit cost > value on shadow-lesson archive
- **Threads 2, 4, 5 (P1 `docs/hygiene-history/ticks/2026/05/19/{0803Z,0816Z}.md` + `tools/hygiene/audit-tick-shard-relative-paths.ts` not found in branch tree)** — verified existing on `origin/main` (shipped via merged PRs #4357 / #4362 / #4358 respectively). Stale-but-fresh: TRUE at write-time, self-healed at merge-time. Resolves no-op.
- **Thread 3 (P1 path qualification on inline reference)** — archived PR-discussion prose; retroactive rewriting of preserved content not appropriate.

Auto-merge already armed; threads resolved → should fire.
