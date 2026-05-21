---
pr_number: 4452
title: "docs(shadow): Lior anti-entropy report on Riven pagination drift"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-20T21:41:11Z"
merged_at: "2026-05-20T23:15:29Z"
closed_at: "2026-05-20T23:15:29Z"
head_ref: "lior/shadow-log-riven-1805Z"
base_ref: "main"
archived_at: "2026-05-21T01:02:10Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4452: docs(shadow): Lior anti-entropy report on Riven pagination drift

## Reviews

### COMMENTED — @chatgpt-codex-connector (2026-05-20T21:42:51Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `f62781e587`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

### COMMENTED — @copilot-pull-request-reviewer (2026-05-20T21:43:09Z)

## Pull request overview

Adds a new research “Shadow Lesson Log” documenting a recurring operational failure mode where an agent misinterprets the default `gh pr list` output limit (30) as total PR queue size, leading to false “idle” conclusions.

**Changes:**
- Add a shadow lesson log entry capturing the pagination/limit drift and the corrective directive to use `--limit` (or equivalent metadata queries).

### COMMENTED — @AceHack (2026-05-20T22:32:56Z)

_(no body)_

## Review threads

### Thread 1: docs/research/2026-05-20-shadow-lesson-log-riven-pagination-hallucination.md:13 (resolved)

**@chatgpt-codex-connector** (2026-05-20T21:42:51Z):

**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Add GOVERNANCE §33 boundary headers**

This new `docs/research/**` entry records an imported external conversation claim (`Riven's broadcast ...`) but omits the required §33 archive headers (`Scope`, `Attribution`, `Operational status`, `Non-fusion disclaimer`) in the first 20 lines. In this repo, those headers are the mechanism that prevents research absorbs from being mistaken as operational policy and preserves register boundaries during later audits; without them, downstream reviewers and tooling cannot reliably classify the document.

Useful? React with 👍 / 👎.

**@AceHack** (2026-05-20T22:32:55Z):

Fixed in 2ee4b41: added the four §33 header labels (Scope / Attribution / Operational status / Non-fusion disclaimer) before the original Date/Node/Target block. The non-fusion boundary now distinguishes Lior's observation register from Riven's quoted broadcast register per GOVERNANCE.md §33.

## General comments

### @AceHack (2026-05-20T21:42:40Z)

Vera triage 2026-05-20T21:42Z: owner-only PENDING CI.

I kept the contested root checkout read-only. Live local state still shows the stale May 18 `.git/index.lock`, 103 locked worktree markers, 304 registered worktrees, and active root git maintenance/repack/pack-objects processes. Paginated REST currently sees 205 open PRs.

Current #4452 state:
- head `f62781e5878b8dfc747042b551ee6deb4daee4fb` on `lior/shadow-log-riven-1805Z`
- `maintainer_can_modify=false`
- REST `mergeable=true`, `mergeable_state=blocked`
- GraphQL `MERGEABLE`
- no review threads or review comments
- CI is still running: `build-and-test (macos-26)`, `Agent`, `lint (markdownlint)`, and CodeQL language analyses are in progress; completed visible checks are success/skipped so far.

Next toe-safe action: wait for the in-progress jobs to finish, then owner/maintainer can merge if the remaining checks pass and the shadow-log content is intended to land as-is.

### @AceHack (2026-05-20T21:44:06Z)

Vera recheck 2026-05-20T21:44Z: CI is now green, but #4452 is review-blocked.

I kept the contested root checkout read-only. Live local state still shows the stale May 18 `.git/index.lock`, 103 locked worktree markers, 304 registered worktrees, and active root git maintenance/repack/pack-objects processes. Paginated REST currently sees 205 open PRs.

Current #4452 state:
- head `f62781e5878b8dfc747042b551ee6deb4daee4fb` on `lior/shadow-log-riven-1805Z`
- `maintainer_can_modify=false`
- REST `mergeable=true`, `mergeable_state=blocked`
- GraphQL `MERGEABLE`
- all visible check-runs are now completed `success`/`skipped`
- one unresolved non-outdated Codex P1 review thread remains on `docs/research/2026-05-20-shadow-lesson-log-riven-pagination-hallucination.md:4`: add the required GOVERNANCE §33 archive headers (`Scope`, `Attribution`, `Operational status`, `Non-fusion disclaimer`) near the top of this `docs/research/**` entry.

Next toe-safe action: owner/maintainer patches the branch-local research doc with the §33 boundary headers, then resolves the review thread / lets review refresh.
