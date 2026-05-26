---
pr_number: 4758
title: "feat(B-0707): cron-cadence wiring \u2014 daily manifesto-citation snapshot workflow"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-23T19:43:52Z"
merged_at: "2026-05-23T19:50:28Z"
closed_at: "2026-05-23T19:50:28Z"
head_ref: "otto/cli-b0707-followup-cron-wiring-2026-05-23"
base_ref: "main"
archived_at: "2026-05-24T01:24:15Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4758: feat(B-0707): cron-cadence wiring — daily manifesto-citation snapshot workflow

## PR description

## Summary

Ships the **5th (deferred) acceptance criterion from B-0707**: cron-cadence wiring for automatic daily manifesto-citation snapshots.

B-0707 closure now reflects **ALL 5 acceptance criteria met** (was 4/5 with cron-cadence deferred per #4750).

## New workflow

`.github/workflows/manifesto-citation-snapshot-cadence.yml`:
- Daily 06:37 UTC (off-the-hour; before razor-cadence 09:17 and outside budget-cadence Sundays 16:23)
- Runs `bun tools/hygiene/audit-manifesto-citations.ts --snapshot`
- Diffs `docs/hygiene-history/manifesto-citations/`
- Opens snapshot PR if diff exists (idempotent per-day; no-diff → healthy no-op)
- AgencySignature v1 trailer block on commits + PR body
- Concurrency-group cancel-in-progress (snapshot file is per-day idempotent)

## Pattern source

Copied from `.github/workflows/budget-snapshot-cadence.yml` which has identical shape (cron → bun tool → diff → PR). Same security discipline (env: routing of expressions, `"$VAR"` quoting in shell, no direct interpolation in run-block scripts).

## Auto-merge limitation (inherited from pattern source)

`GITHUB_TOKEN`-created PRs don't trigger downstream workflows (GitHub's anti-infinite-loop guard). The snapshot PR sits open for the next maintainer/agent merge pass — per `budget-snapshot-cadence.yml` convention. Explicit-no-auto-merge over silent-stall.

## Composes with

- B-0525 (parent — constitutional-promotion readiness tracking; this completes the measurement-infrastructure substrate)
- B-0707 (child — this commit ships its 5th criterion)
- `.github/workflows/budget-snapshot-cadence.yml` (pattern reference)
- `.github/workflows/razor-cadence.yml` (sibling daily cadence)
- `.claude/rules/encoding-rules-without-mechanizing.md` (carved sentence: *"encoding rules without mechanizing produces a memory of failures, not prevention"* — this cron is the mechanization)

## Test plan

- [x] Workflow follows budget-snapshot-cadence.yml security pattern (env routing, `$VAR` quoting)
- [x] B-0707 row updated to reflect 5/5 acceptance criteria
- [x] Cron time off-the-hour (06:37) to avoid GHA thundering-herd
- [x] Concurrency group + cancel-in-progress (idempotent per-day)
- [x] Branch matches `ZETA_EXPECTED_BRANCH` guard
- [ ] CI green
- [ ] First scheduled fire produces snapshot PR (verify ~tomorrow 06:37 UTC)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-23T19:45:44Z)

## Pull request overview

Adds scheduled GitHub Actions cadence wiring to automatically produce daily manifesto-citation snapshot PRs, completing B-0707’s deferred “cron-cadence wiring” acceptance criterion and updating the backlog row to reflect full closure.

**Changes:**
- Introduces a new daily scheduled workflow that runs `bun tools/hygiene/audit-manifesto-citations.ts --snapshot`, detects changes, and opens a PR with the new snapshot.
- Updates the B-0707 backlog row to reflect that all 5/5 acceptance criteria are now met and points to the new workflow.

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated 2 comments.

| File | Description |
| ---- | ----------- |
| docs/backlog/P2/B-0707-manifesto-citation-time-series-tracking-2026-05-23.md | Updates closure text + acceptance criteria to reflect cron cadence now shipped. |
| .github/workflows/manifesto-citation-snapshot-cadence.yml | New daily workflow to generate snapshot and open a PR when snapshot output changes. |

### COMMENTED — @chatgpt-codex-connector (2026-05-23T19:46:13Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `b6d4cc5148`


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

### Thread 1: .github/workflows/manifesto-citation-snapshot-cadence.yml:104 (resolved)

**@copilot-pull-request-reviewer** (2026-05-23T19:45:43Z):

P0: `git diff --quiet docs/hygiene-history/manifesto-citations/` will ignore newly-created (untracked) daily snapshot files, so the first snapshot of a day can be incorrectly treated as "no diff" and the PR won’t open. Switch the change-detection to include untracked files (e.g., `git status --porcelain` on the path, or combine `git diff --quiet -- <path>` with a `git ls-files --others --exclude-standard <path>` check).

### Thread 2: .github/workflows/manifesto-citation-snapshot-cadence.yml:42 (resolved)

**@copilot-pull-request-reviewer** (2026-05-23T19:45:44Z):

The `workflow_dispatch` input `note` is described as being attached to the snapshot, but it’s currently only echoed to logs and not persisted into the commit message or PR body. Either plumb it into the commit/PR text (quoted/sanitized via env as you’re already doing) or remove the input to avoid misleading operators.

### Thread 3: .github/workflows/manifesto-citation-snapshot-cadence.yml:93 (resolved)

**@chatgpt-codex-connector** (2026-05-23T19:46:13Z):

**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Detect untracked snapshots before declaring no changes**

The `Inspect diff` gate uses `git diff --quiet docs/hygiene-history/manifesto-citations/`, which ignores untracked files. This workflow writes a new dated file each day (for example `YYYY-MM-DD.json`), and on the first run for a date that file is untracked, so this check returns success and sets `changed=false`; the PR creation step is then skipped even though a new snapshot was produced. In practice, that means the daily cadence can silently no-op for new days instead of opening the intended snapshot PR.

Useful? React with 👍 / 👎.
