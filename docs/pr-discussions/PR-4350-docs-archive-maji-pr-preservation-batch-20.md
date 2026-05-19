---
pr_number: 4350
title: "docs(archive): Maji PR preservation batch 20"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-19T07:00:10Z"
merged_at: "2026-05-19T07:11:45Z"
closed_at: "2026-05-19T07:11:46Z"
head_ref: "lior-archive-prs-batch-20"
base_ref: "main"
archived_at: "2026-05-19T07:37:06Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4350: docs(archive): Maji PR preservation batch 20

## PR description

Automated preservation of recently merged PRs (4343, 4337, 4319, 4316, 4312) to docs/pr-discussions/ to capture memory and reasoning.

## Reviews

### COMMENTED — @chatgpt-codex-connector (2026-05-19T07:01:37Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `a1065d31ac`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

### COMMENTED — @copilot-pull-request-reviewer (2026-05-19T07:02:58Z)

## Pull request overview

This PR adds a new PR-preservation batch under `docs/pr-discussions/` to archive recently merged PRs (#4343, #4337, plus timestamp/format refresh for #4319/#4316/#4312), capturing metadata and selected review-thread content for later reference.

**Changes:**
- Adds new PR-discussion archive records for PR #4343 and PR #4337.
- Updates `archived_at` timestamps for existing preserved PRs (#4319, #4316, #4312).
- Adjusts preserved content in PR #4316 (but introduces a Markdown rendering regression via a literal `\n`).

### Reviewed changes

Copilot reviewed 5 out of 5 changed files in this pull request and generated 1 comment.

<details>
<summary>Show a summary per file</summary>

| File | Description |
| ---- | ----------- |
| docs/pr-discussions/PR-4343-shard-0608z-otto-cli-session-arc-maji-response-canary-sharpe.md | New archive record for PR #4343 (session shard write-up + preserved review thread). |
| docs/pr-discussions/PR-4337-docs-archive-maji-pr-preservation-batch-18.md | New archive record for PR #4337 (prior preservation batch summary + preserved review note). |
| docs/pr-discussions/PR-4319-docs-shadow-maji-anti-entropy-shadow-report-on-otto-and-rive.md | Refreshes `archived_at` metadata timestamp. |
| docs/pr-discussions/PR-4316-docs-shadow-maji-anti-entropy-shadow-report-on-riven-paralys.md | Refreshes `archived_at` and modifies preserved PR description (currently malformed). |
| docs/pr-discussions/PR-4312-fix-hygiene-clear-2026-05-18-tick-link-drift.md | Refreshes `archived_at` metadata timestamp. |
</details>

## Review threads

### Thread 1: docs/pr-discussions/PR-4316-docs-shadow-maji-anti-entropy-shadow-report-on-riven-paralys.md:19 (resolved)

**@chatgpt-codex-connector** (2026-05-19T07:01:37Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Replace literal newline escape in archived PR description**

This archive now stores the PR description heading and body on one physical line with a literal `\n`, so GitHub renders raw escape text instead of a `## Maji Drift Report` heading followed by the paragraph. For generated `docs/pr-discussions/**` records that are meant to preserve readable PR discussions, this also leaves the previously reported formatting defect in PR #4316 unresolved; split the escaped newline into an actual newline to restore the Markdown structure.

Useful? React with 👍 / 👎.

### Thread 2: docs/pr-discussions/PR-4316-docs-shadow-maji-anti-entropy-shadow-report-on-riven-paralys.md:20 (resolved)

**@copilot-pull-request-reviewer** (2026-05-19T07:02:57Z):

P1: The PR description has regressed to a literal `\n` escape sequence (it will render as raw text). Split this into a proper heading line (`## Maji Drift Report`), a blank line, and the paragraph on the next line so the Markdown renders correctly.

## General comments

### @AceHack (2026-05-19T07:09:50Z)

Fixed in 524dd0b — replaced the literal \`\n\` in line 19 with a real blank line so the `## Maji Drift Report` heading + paragraph render correctly. Both Codex P2 + Copilot P1 threads land on the same root cause; one commit resolves both. Arming auto-merge.
