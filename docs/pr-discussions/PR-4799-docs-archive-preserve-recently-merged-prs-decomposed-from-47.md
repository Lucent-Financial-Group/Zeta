---
pr_number: 4799
title: "docs(archive): preserve recently merged PRs (decomposed from #4767)"
author: "AceHack"
state: "OPEN"
created_at: "2026-05-24T01:06:59Z"
head_ref: "lior-decompose-4767-pr-preservation"
base_ref: "main"
archived_at: "2026-05-24T16:59:32Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4799: docs(archive): preserve recently merged PRs (decomposed from #4767)

## PR description

This PR contains only the preserved PR discussions from #4767.

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-24T01:09:58Z)

## Pull request overview

This PR adds git-native PR discussion archive markdown files under `docs/pr-discussions/` to preserve the discussions/content of recently merged PRs (decomposed from #4767).

**Changes:**
- Adds 20 new PR archive records with YAML frontmatter + preserved PR descriptions/reviews/threads.
- Captures multiple “decomposed” archive-only PRs as standalone preserved discussion files.
- Preserves Dependabot PR bodies (release notes / commands) as part of the archive.

### Reviewed changes

Copilot reviewed 20 out of 20 changed files in this pull request and generated 8 comments.

<details>
<summary>Show a summary per file</summary>

| File | Description |
| ---- | ----------- |
| docs/pr-discussions/PR-4765-backlog-b-0709-soraya-round-42-hand-off-register-11-unregist.md | Preserved discussion archive for PR #4765. |
| docs/pr-discussions/PR-4731-docs-archive-decomposed-preserve-recently-merged-prs-from-46.md | Preserved discussion archive for PR #4731. |
| docs/pr-discussions/PR-4728-docs-archive-decomposed-preserve-recently-merged-prs-from-46.md | Preserved discussion archive for PR #4728. |
| docs/pr-discussions/PR-4722-docs-archive-preserve-merged-pr-4714.md | Preserved discussion archive for PR #4722. |
| docs/pr-discussions/PR-4721-docs-archive-preserve-merged-pr-4716.md | Preserved discussion archive for PR #4721. |
| docs/pr-discussions/PR-4720-docs-archive-preserve-merged-pr-4718.md | Preserved discussion archive for PR #4720. |
| docs/pr-discussions/PR-4719-docs-archive-decomposed-preserve-merged-pr-3363-from-4697.md | Preserved discussion archive for PR #4719. |
| docs/pr-discussions/PR-4715-deps-bump-yamldotnet-from-17-1-0-to-18-0-0.md | Preserved discussion archive for Dependabot PR #4715. |
| docs/pr-discussions/PR-4712-deps-bump-github-codeql-action-from-4-35-5-to-4-36-0-in-the.md | Preserved discussion archive for Dependabot PR #4712. |
| docs/pr-discussions/PR-4711-fix-rules-supersede-4710-with-md004-fix-on-top-copilot-p0.md | Preserved discussion archive for PR #4711. |
| docs/pr-discussions/PR-4709-docs-rules-sub-case-4-empirical-anchor-fresh-worktree-gitdir.md | Preserved discussion archive for PR #4709. |
| docs/pr-discussions/PR-4708-feat-lean4-add-imaginary-stack-toy-model-decomposed-from-407.md | Preserved discussion archive for PR #4708. |
| docs/pr-discussions/PR-4707-docs-shadow-add-lesson-log-for-pr-4059-drift-decomposed-from.md | Preserved discussion archive for PR #4707. |
| docs/pr-discussions/PR-4706-docs-shard-0008z-2026-05-23-otto-cli-cold-boot-pr-4668-named.md | Preserved discussion archive for PR #4706. |
| docs/pr-discussions/PR-4705-docs-archive-preserve-merged-pr-4686.md | Preserved discussion archive for PR #4705. |
| docs/pr-discussions/PR-4704-docs-archive-preserve-merged-pr-4687.md | Preserved discussion archive for PR #4704. |
| docs/pr-discussions/PR-4703-docs-archive-preserve-merged-pr-4690.md | Preserved discussion archive for PR #4703. |
| docs/pr-discussions/PR-4702-docs-shadow-add-lesson-log-for-blob-pr-4698.md | Preserved discussion archive for PR #4702. |
| docs/pr-discussions/PR-4701-docs-archive-add-preserved-pr-discussions.md | Preserved discussion archive for PR #4701. |
| docs/pr-discussions/PR-4700-feat-memory-add-new-feedback-memory.md | Preserved discussion archive for PR #4700. |
</details>

## Review threads

### Thread 1: docs/pr-discussions/PR-4715-deps-bump-yamldotnet-from-17-1-0-to-18-0-0.md:29 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:09:56Z):

P0: This line contains an invisible Unicode character (U+200B / zero-width space) in the `@​EdwardCooke` handle. The repo’s `invisible-unicode-in-text` check will flag this in `*.md` and fail CI; replace it with plain ASCII (`@EdwardCooke`) and ensure no zero-width characters remain.

### Thread 2: docs/pr-discussions/PR-4722-docs-archive-preserve-merged-pr-4714.md:52 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:09:57Z):

P0: This thread text includes an actual U+200B zero-width space inside the example `[#​1907]` / `[#​....]` code spans. Even though it’s describing the issue, the literal hidden character will still trigger Semgrep `invisible-unicode-in-text` and break CI; replace the examples with ASCII (e.g., `[#1907]`) and describe the zero-width space in words ("U+200B between `#` and digits").

### Thread 3: docs/pr-discussions/PR-4722-docs-archive-preserve-merged-pr-4714.md:52 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:09:57Z):

P0: This line contains a U+200B zero-width space inside the `@​meziantou` / `@​Copilot` code spans. Semgrep `invisible-unicode-in-text` will flag the hidden character even inside backticks; rewrite the examples using plain ASCII (`@meziantou`, `@Copilot`) and keep the mention of U+200B as text only.

### Thread 4: docs/pr-discussions/PR-4722-docs-archive-preserve-merged-pr-4714.md:58 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:09:57Z):

P0: This line contains an actual U+200B zero-width space inside the `@​Copilot` code span. That hidden character will trip the repo’s invisible-Unicode lint; replace it with ASCII `@Copilot` (or spell out the codepoint without embedding it).

### Thread 5: docs/pr-discussions/PR-4722-docs-archive-preserve-merged-pr-4714.md:64 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:09:57Z):

P0: This line contains a U+200B zero-width space inside the `@​meziantou` code span. Even as an example, embedding the invisible character will fail `invisible-unicode-in-text`; replace with plain ASCII `@meziantou` and keep the description of the issue as words.

### Thread 6: docs/pr-discussions/PR-4722-docs-archive-preserve-merged-pr-4714.md:82 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:09:58Z):

P0: This line embeds a U+200B zero-width space inside `@​meziantou`. Remove the hidden character (use ASCII `@meziantou`) so the archive stays lint-clean.

### Thread 7: docs/pr-discussions/PR-4722-docs-archive-preserve-merged-pr-4714.md:82 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:09:58Z):

P0: This line includes a U+200B zero-width space inside `@​meziantou`. Semgrep will flag it in Markdown; replace with ASCII `@meziantou` (or avoid embedding the example with the hidden character).

### Thread 8: docs/pr-discussions/PR-4722-docs-archive-preserve-merged-pr-4714.md:82 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:09:58Z):

P0: This line embeds a U+200B zero-width space in the `@​meziantou` example. Even though it’s quoting a prior review comment, the hidden character will still break `invisible-unicode-in-text`; rewrite the example with plain ASCII.

## General comments

### @AceHack (2026-05-24T12:16:16Z)

Vera/Codex CI triage: inspected the failed check on this PR. The failure is owner-lane actionable:

- `lint (semgrep)` (run `26348165508`, job `77561599966`): Semgrep reports `10 Code Findings`, all blocking, from rule `invisible-unicode-in-text`. Affected files are `docs/pr-discussions/PR-4715-deps-bump-yamldotnet-from-17-1-0-to-18-0-0.md` line 29 and `docs/pr-discussions/PR-4722-docs-archive-preserve-merged-pr-4714.md` lines 40, 46, 52, 58, 64, 70, 76, and 82. The findings are U+200B zero-width spaces in references/mentions such as `@meziantou`, `@Copilot`, and `[#1907]`; strip the invisible codepoints and keep the archive text ASCII-clean.

I did not mutate this branch or the shared root checkout.

### @AceHack (2026-05-24T14:07:59Z)

I have addressed the failing check in this PR. The CI should now pass.
