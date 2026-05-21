---
pr_number: 4477
title: "rule(backlog-item-start-gate): extend substrate-drift discriminator to orphaned-branch scope"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-21T02:11:37Z"
merged_at: "2026-05-21T02:13:36Z"
closed_at: "2026-05-21T02:13:36Z"
head_ref: "rule/backlog-item-start-gate-extend-substrate-drift-discriminator-to-orphaned-branch-scope-2026-05-21"
base_ref: "main"
archived_at: "2026-05-21T03:49:17Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4477: rule(backlog-item-start-gate): extend substrate-drift discriminator to orphaned-branch scope

## PR description

## Summary

Extends [`.claude/rules/backlog-item-start-gate.md`](https://github.com/Lucent-Financial-Group/Zeta/blob/main/.claude/rules/backlog-item-start-gate.md) with a new **Orphaned-branch triage discriminator** section that generalizes the existing row-scope substrate-drift discriminator (step 0) to the orphaned-branch surface.

## Why

Per [`.claude/rules/wake-time-substrate.md`](https://github.com/Lucent-Financial-Group/Zeta/blob/main/.claude/rules/wake-time-substrate.md): *"Every load-bearing learning must reach CLAUDE.md or a pointer from it."*

The discovery captured in [PR #4472](https://github.com/Lucent-Financial-Group/Zeta/pull/4472) (0149Z follow-up shard) — that 4 of 5 orphaned commits on `otto/2012z-...` had already been rescued via peer agents — sits in a tick shard alone. The auto-loaded rule is where the discriminator needs to live to actually reach future-Otto cold-boots before they over-triage orphaned branches.

## What the extension adds

- **3-step verification procedure** (grep main for rescue PR; per-file diff; line count)
- **3-tier interpretation table** (`0 lines` = rescued / `20–50` = partial drift / `hundreds` = genuine deltas)
- **Special-case guard for runtime scripts** (`.gemini/bin/lior-loop-tick.ts` and similar): DO NOT re-apply without operator awareness even with large diffs, because runtime scripts evolve continuously on main
- **Empirical anchors**: [PR #4205 (HC-8 rescue)](https://github.com/Lucent-Financial-Group/Zeta/pull/4205) + [PR #4461 (0059Z cold-boot)](https://github.com/Lucent-Financial-Group/Zeta/pull/4461) + [PR #4472 (0149Z discovery)](https://github.com/Lucent-Financial-Group/Zeta/pull/4472)
- **Composes-with** edge to [`honor-those-that-came-before.md`](https://github.com/Lucent-Financial-Group/Zeta/blob/main/.claude/rules/honor-those-that-came-before.md): verifying substrate-on-main IS the honor at orphaned-commit scope

## Verify

- 1 file modified: `.claude/rules/backlog-item-start-gate.md` (+59 lines)
- Pre-push gate passed (MD032 / markdownlint / relative-path audit)
- Markdownlint required restructure — original attempt as `0a.` step broke ordered-list parsing (MD029); refactored as a top-level sub-section after the main gate steps

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @chatgpt-codex-connector (2026-05-21T02:13:45Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `1a0ce66e51`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

### COMMENTED — @copilot-pull-request-reviewer (2026-05-21T02:14:10Z)

## Pull request overview

This PR extends the factory’s backlog-item start gate rule with an orphaned-branch triage discriminator, aimed at preventing duplicate or regressive re-landing of already-rescued substrate when a cold-boot session discovers an orphaned feature branch.

**Changes:**
- Adds an “Orphaned-branch triage discriminator” section with a lightweight verification procedure and interpretation tiers.
- Adds a runtime-script guard warning against re-applying stale versions of continuously-evolving operational scripts.
- Adds new composition/anchor references in the “Composes with” section to support the new discriminator guidance.

## Review threads

### Thread 1: .claude/rules/backlog-item-start-gate.md:90 (unresolved)

**@chatgpt-codex-connector** (2026-05-21T02:13:45Z):

**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Compare all touched files before classifying rescue**

This procedure can misclassify multi-file commits as fully rescued because it samples only the first changed file and then treats `0 lines` as “fully rescued.” If that first file happens to match `origin/main` but later files in the same commit still differ, the workflow will incorrectly skip re-landing real deltas and lose substrate. The check should diff the entire commit (or every touched file), not `head -1`.

Useful? React with 👍 / 👎.

### Thread 2: .claude/rules/backlog-item-start-gate.md:89 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-21T02:14:10Z):

P0: `git show --name-only --format="" <sha> | head -1` is likely to return a blank line (git prints an empty separator line before the filename list when the commit header is suppressed), so `<that file>` becomes empty and the next `git diff` step won’t work as written. Use a command that never emits the leading blank line (e.g., `git diff-tree --no-commit-id --name-only -r <sha>`), or filter empty lines before `head -1`.

### Thread 3: .claude/rules/backlog-item-start-gate.md:101 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-21T02:14:10Z):

The procedure picks only the first file in the commit and then classifies drift based on “count lines” of raw `git diff` output. Both can misclassify: a commit may have mixed rescued/unrescued files, and diff line-count includes headers/context and can vary by settings. Consider iterating over all touched files and using a stable metric like `--numstat`/`--shortstat` (or `--stat`) for the size tiers.
