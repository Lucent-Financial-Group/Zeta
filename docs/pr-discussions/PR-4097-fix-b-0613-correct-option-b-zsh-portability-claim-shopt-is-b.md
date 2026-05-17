---
pr_number: 4097
title: "fix(B-0613): correct Option B zsh portability claim (shopt is bash-only)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-17T14:49:14Z"
merged_at: "2026-05-17T21:31:33Z"
closed_at: "2026-05-17T21:31:33Z"
head_ref: "otto/b0613-zsh-portability-followup-1443z"
base_ref: "main"
archived_at: "2026-05-17T22:35:23Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4097: fix(B-0613): correct Option B zsh portability claim (shopt is bash-only)

## PR description

## Follow-up — correct Option B zsh portability claim in B-0613 row

Single-commit follow-up to [#4086](https://github.com/Lucent-Financial-Group/Zeta/pull/4086) (B-0613 backlog row, merged at `ae9cf1b`).

### What was wrong

The merged row at line 75 says:

> Explicit nullglob + array — works in any modern bash; portable to zsh too.

This claim is incorrect. `shopt` is a Bash builtin; zsh uses `setopt`/`unsetopt` with the `NULL_GLOB` option. A reviewer ([chatgpt-codex-connector P2](https://github.com/Lucent-Financial-Group/Zeta/pull/4086#discussion_r-…)) correctly flagged this on PR #4086.

### What this PR does

Replaces "portable to zsh too" with an explicit "**NOT portable to zsh**" note + concrete zsh equivalents (`setopt -o NULL_GLOB` / `unsetopt NULL_GLOB`) and a pointer to Option A (compgen) or Option C (find) for zsh implementations.

### Substrate-honest disclosure

The reviewer's thread was incorrectly resolved as a verified-FP in tick `1417Z` by this Otto-CLI surface. Reading my own message log: I claimed "the file at line 75 already says 'NOT portable to zsh'" — but the merged file `ae9cf1b` and my own commit `df93b5b` both still had the wrong "portable to zsh too" claim. The Read I did most likely returned a state that wasn't yet committed (working-tree mod from peer-Otto in flight), and I conflated working-tree with committed state. This is a verify-before-fix discipline failure on my part.

Peer-Otto-CLI surface caught the regression in tick 1424Z (`cf4fc03` substrate-honest comment + `54ca355` actual fix). I cherry-picked `54ca355` onto this branch for the follow-up PR.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @chatgpt-codex-connector (2026-05-17T14:50:39Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `13f749d3e4`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

### COMMENTED — @copilot-pull-request-reviewer (2026-05-17T14:50:42Z)

## Pull request overview

This PR updates the B-0613 backlog row to correct an inaccurate zsh portability claim for the `shopt -s nullglob` fix candidate.

**Changes:**
- Replaces “portable to zsh too” with an explicit note that `shopt` is bash-only.
- Adds zsh-oriented guidance using `NULL_GLOB` equivalents.

## Review threads

### Thread 1: docs/backlog/P3/B-0613-lior-loop-lockfile-probe-hardening-compgen-shopt-nullglob-2026-05-17.md:75 (resolved)

**@chatgpt-codex-connector** (2026-05-17T14:50:39Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Drop Option A as a zsh fallback**

The new portability note recommends "Option A or Option C" for zsh, but Option A is `compgen -G`, which this same document already defines as a bash builtin. In a zsh implementation, following this guidance can produce `compgen: command not found`, leaving the lockfile probe behavior unresolved. Limit the zsh guidance to Option C or the explicit `setopt`/`unsetopt` variant.

Useful? React with 👍 / 👎.

### Thread 2: docs/backlog/P3/B-0613-lior-loop-lockfile-probe-hardening-compgen-shopt-nullglob-2026-05-17.md:75 (resolved)

**@copilot-pull-request-reviewer** (2026-05-17T14:50:42Z):

The zsh guidance still points readers to Option A, but Option A is documented immediately above as `compgen -G` (a bash builtin), so it is not a valid zsh implementation path. This leaves the corrected portability note internally contradictory; zsh guidance should point to Option C or the zsh `NULL_GLOB` equivalent only.

## General comments

### @AceHack (2026-05-17T14:57:05Z)

Maji Antigravity Check: Drift detected. The PR description exhibits the shadow pattern: narration-over-action. You are narrating your discipline failure instead of just executing the fix. Cease metadata churn and stick to operational updates.
