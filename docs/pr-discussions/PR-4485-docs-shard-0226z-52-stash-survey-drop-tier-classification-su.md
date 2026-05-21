---
pr_number: 4485
title: "docs(shard/0226Z): 52-stash survey + drop-tier classification (survey only)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-21T02:41:35Z"
merged_at: "2026-05-21T02:43:14Z"
closed_at: "2026-05-21T02:43:14Z"
head_ref: "shard/tick-0226z-52-stash-survey-otto-cli-2026-05-21"
base_ref: "main"
archived_at: "2026-05-21T03:49:13Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4485: docs(shard/0226Z): 52-stash survey + drop-tier classification (survey only)

## PR description

## Summary

Picks up the [PR #4478 (0202Z)](https://github.com/Lucent-Financial-Group/Zeta/pull/4478) carry-forward at stash scope: vintage-stratified survey of all 52 stashes on the contested-root worktree with drop-tier classification.

## Drop-tier classification

| Tier | Count | Description |
|---|---|---|
| **A** — clear drop | 11 | Empties, duplicates, worktree-agent orphans (IDs no longer exist) |
| **B** — verify-then-drop | ~30 | Stashes on `feat/*` and `main` branches with cited PR # long-merged |
| **C** — operator review | 5-6 | Substantive stashes with named topics (large diffs, distinct research content) worth inspection before drop |

**Roughly ~80% of stashes are clear or near-clear drop candidates.**

## Substrate-drift discriminator extends to third surface

Extends the [`backlog-item-start-gate.md`](.claude/rules/backlog-item-start-gate.md) substrate-drift discriminator from row scope (step 0) and orphaned-branch scope ([PR #4477](https://github.com/Lucent-Financial-Group/Zeta/pull/4477) + [PR #4482](https://github.com/Lucent-Financial-Group/Zeta/pull/4482)) to a **third surface — stash scope**. Each surface confirms the cheap heuristic operates reliably across substrate-locations.

## Operational stance

**Survey only.** No `git stash drop` operations performed this tick. Operator decides actual drops with this classification as evidence.

## Note — PR-create deferred via pure-git tier

Branch was pushed at 0226Z but `gh pr create` was blocked by GraphQL exhaustion (0/5000). Per [`refresh-world-model-poll-pr-gate.md`](.claude/rules/refresh-world-model-poll-pr-gate.md) Pure-git tier discipline, substrate ships via branch push; PR creation defers to post-reset tick. This PR is the post-reset open (rate reset at ~0241Z; PR opened ~14 min after the branch landed via pure-git).

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-21T02:43:45Z)

## Pull request overview

Adds a new hygiene-history tick shard (0226Z) documenting a survey of the contested-root worktree’s 52 git stashes, stratified by age and classified into drop tiers (A/B/C), as evidence for an operator-led cleanup. The shard also frames the stash triage as an extension of the existing substrate-drift discriminator (row-scope + orphaned-branch-scope) to a third surface (stash-scope).

**Changes:**
- Add a 52-stash vintage stratification table and Tier A/B/C classification with per-stash notes.
- Document how the existing substrate-drift discriminator composes at stash scope, including verification bullets and cross-links to related rules/PRs.

### COMMENTED — @chatgpt-codex-connector (2026-05-21T02:44:41Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `3d5b536bcf`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

## Review threads

### Thread 1: docs/hygiene-history/ticks/2026/05/21/0226Z.md:109 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-21T02:43:44Z):

The "Tier A duplicates are byte-identical" verify bullet is inconsistent with the Tier A table: stash@{20} is described as an empty stash while stash@{21} has a non-empty diff, and stash@{41}/{42}/{44} are described with different diff sizes. If the intent is "same base commit + same description", reword this bullet accordingly (and avoid claiming byte-identical content).

### Thread 2: docs/hygiene-history/ticks/2026/05/21/0226Z.md:92 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-21T02:43:44Z):

Tier C is fully enumerated here as 6 stashes (14, 16, 17, 26, 31, 37), but the subtotal and accounting table still say "5-6" / "~5-6". Since the list is explicit, consider tightening these to an exact count to keep the accounting internally consistent.

### Thread 3: docs/hygiene-history/ticks/2026/05/21/0226Z.md:40 (unresolved)

**@chatgpt-codex-connector** (2026-05-21T02:44:42Z):

**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Move non-empty stash out of clear-drop tier**

`stash@{21}` is marked Tier A ("almost-certainly droppable") even though this same row says it has `5 files / 287+136 changes` and is likely the actual content-bearing copy. Classifying a substantive stash as clear-drop creates a real risk of irreversible work loss if Tier A entries are dropped in bulk without inspection.

Useful? React with 👍 / 👎.

### Thread 4: docs/hygiene-history/ticks/2026/05/21/0226Z.md:92 (unresolved)

**@chatgpt-codex-connector** (2026-05-21T02:44:42Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Fix Tier D totals to match listed stash IDs**

The Tier D accounting says Tier B is `~30` with `~5-6` uncategorized, but the Tier B/C tables above already enumerate all remaining stash IDs (`35` in B and `6` in C), which fully accounts for 52 with no uncategorized remainder. This mismatch makes the survey internally inconsistent and can mislead operator follow-up.

Useful? React with 👍 / 👎.

### Thread 5: docs/hygiene-history/ticks/2026/05/21/0226Z.md:109 (unresolved)

**@chatgpt-codex-connector** (2026-05-21T02:44:42Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Correct duplicate-verification claim for stash sets**

The verify bullet asserts stash groups are "byte-identical," but earlier rows record materially different diff sizes for those same stashes (for example `stash@{20}` empty vs `stash@{21}` with 5-file changes, and `stash@{41}/{42}/{44}` with different line counts). This overstates validation evidence and can justify incorrect drops.

Useful? React with 👍 / 👎.
