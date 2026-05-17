---
pr_number: 4086
title: "backlog(B-0613): Lior loop lockfile-probe hardening \u2014 compgen -G / shopt nullglob"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-17T14:04:10Z"
merged_at: "2026-05-17T14:33:24Z"
closed_at: "2026-05-17T14:33:24Z"
head_ref: "backlog/b-0613-lior-loop-lockfile-probe-hardening-2026-05-17"
base_ref: "main"
archived_at: "2026-05-17T14:40:20Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4086: backlog(B-0613): Lior loop lockfile-probe hardening — compgen -G / shopt nullglob

## PR description

## Summary

P3 bug-tier backlog row formalizing the substrate-honest deferral that peer-Otto's [`c95e396`](https://github.com/Lucent-Financial-Group/Zeta/commit/c95e396) ("memory(precision): correct memo overclaim + acknowledge lockfile-probe gap") memo correction named. Five PR [#4059](https://github.com/Lucent-Financial-Group/Zeta/pull/4059) review threads on `.gemini/bin/lior-loop-tick.ts:11` were resolved via deferral pointer; this row makes the follow-up discoverable in BACKLOG.md instead of only in `memory/`.

## What lands

| File | Lines | Purpose |
|---|---|---|
| `docs/backlog/P3/B-0613-...md` | 120 | P3 bug row with 3 fix candidates (compgen -G / shopt nullglob array / inline find), portability + preference notes, implementation-hazard section |
| `docs/BACKLOG.md` | +1 | Index regen via `BACKLOG_WRITE_FORCE=1 bun tools/backlog/generate-index.ts` |

## The finding

`.gemini/bin/lior-loop-tick.ts:11` uses `ls .git/worktrees/*/lock` and `ls .git/index.lock` as lock probes. Two real problems documented in the row:

1. `.git/worktrees/*/lock` is not standard git lock-file convention (git uses `.git/worktrees/<name>/locked`, only present after explicit `git worktree lock`)
2. Non-matching globs in bare `ls` exit non-zero in zsh, producing false-positive "lock present" defers on quiet systems

## Three fix candidates

- **Option A** (preferred): `compgen -G` bash builtin
- **Option B**: `shopt -s nullglob` + array
- **Option C**: inline `find` (fully portable)

Soraya-style picker decision — Lior runs on bash; Option A is most ergonomic.

## Test plan

- [x] B-0613 row passes BACKLOG.md generated-index `--check`
- [x] python3 invisible-Unicode scan (0 codepoints)
- [x] markdownlint silent
- [ ] Pickup-time: implement Option A in `.gemini/bin/lior-loop-tick.ts:11`
- [ ] Pickup-time: test on quiet repo (no locks) → protocol exits 0
- [ ] Pickup-time: test with manual `.git/worktrees/test/locked` marker → protocol exits non-zero

## Composes with

- [`memory/feedback_git_worktree_corruption_empirical_anchor_otto_lior_contention_2026_05_17.md`](https://github.com/Lucent-Financial-Group/Zeta/blob/main/memory/feedback_git_worktree_corruption_empirical_anchor_otto_lior_contention_2026_05_17.md) — peer-Otto's `c95e396` correction names this row's substrate
- PR #4059 — 5 review threads on `.gemini/bin/lior-loop-tick.ts:11` resolved via deferral pointer to this row
- [B-0530](https://github.com/Lucent-Financial-Group/Zeta/blob/main/docs/backlog/P3/B-0530-cron-sentinel-mutex-prevent-otto-cli-self-contention-2026-05-15.md) — multi-Otto contention mitigation context

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-17T14:05:55Z)

## Pull request overview

Files a P3 bug-tier backlog row (B-0613) formalizing the deferred Lior loop lockfile-probe hardening previously acknowledged in peer-Otto's `c95e396` memo correction and across five resolved review threads in PR #4059. The row makes the follow-up discoverable through `docs/BACKLOG.md` instead of only via memory files, and is paired with a regenerated index plus a hygiene-history tick log.

**Changes:**
- New P3 backlog row at `docs/backlog/P3/B-0613-...md` documenting the `ls .git/worktrees/*/lock` false-positive issue and three fix candidates (`compgen -G`, `shopt -s nullglob`, `find`).
- Regenerated `docs/BACKLOG.md` index to include the new B-0613 entry.
- Hygiene-history tick log for 2026-05-17T13:56Z capturing the substrate-honest disposition under Lior contention.

### Reviewed changes

Copilot reviewed 3 out of 3 changed files in this pull request and generated 1 comment.

| File | Description |
| ---- | ----------- |
| docs/backlog/P3/B-0613-lior-loop-lockfile-probe-hardening-compgen-shopt-nullglob-2026-05-17.md | New P3 bug row enumerating the finding, three fix candidates, acceptance criteria, and implementation hazards. |
| docs/BACKLOG.md | Auto-generated index updated to add the B-0613 open row. |
| docs/hygiene-history/ticks/2026/05/17/1356Z.md | Tick log narrating the substrate-honest filing and local-only commit under push contention. |

### COMMENTED — @chatgpt-codex-connector (2026-05-17T14:26:04Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `2950e58f46`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

### COMMENTED — @copilot-pull-request-reviewer (2026-05-17T14:33:12Z)

## Pull request overview

Copilot reviewed 6 out of 6 changed files in this pull request and generated no new comments.

## Review threads

### Thread 1: docs/backlog/P3/B-0613-lior-loop-lockfile-probe-hardening-compgen-shopt-nullglob-2026-05-17.md:105 (resolved)

**@copilot-pull-request-reviewer** (2026-05-17T14:05:55Z):

The relative link path `docs/backlog/P3/B-0530-...` is incorrect: this file lives at `docs/backlog/P3/`, so the link resolves to `docs/backlog/P3/docs/backlog/P3/B-0530...` which does not exist. Line 112 in the "Composes with" section uses the correct relative form `../P3/B-0530-...`; this link should match that pattern (or simply `B-0530-cron-sentinel-mutex-prevent-otto-cli-self-contention-2026-05-15.md` since the target is in the same directory).

### Thread 2: docs/backlog/P3/B-0613-lior-loop-lockfile-probe-hardening-compgen-shopt-nullglob-2026-05-17.md:75 (resolved)

**@chatgpt-codex-connector** (2026-05-17T14:26:04Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Fix incorrect zsh portability note for Option B**

The Option B guidance says the `shopt -s nullglob` approach is “portable to zsh,” but `shopt` is a Bash builtin and fails in zsh. If someone implements this candidate in a zsh-based script as documented, the lock probe path will error instead of safely handling empty globs, reintroducing false-positive/failed lock checks. Please either remove the zsh portability claim or provide a true zsh variant (e.g., `setopt null_glob`).

Useful? React with 👍 / 👎.

## General comments

### @AceHack (2026-05-17T14:23:24Z)

## Substrate-honest status update (autonomous-loop tick 1419Z)

The B-0530 relative-link thread fix is **committed locally** (`aed1378`) but push attempts to this branch have been hanging consistently this session — \`.git/objects/pack\` contention with concurrent agents (Lior 4 PIDs + peer Otto). Push commands complete with exit 0 but the remote-tracking ref does not advance.

**Diagnostic:** `git fetch` and `git ls-remote` work fine (10s timeout, exit 0); only `git push` hangs. Issue is push-protocol-specific, not network/auth.

**What's on remote vs local:**

| SHA | Subject | Location |
|---|---|---|
| `f04dfc3` | shard 1356Z | ✓ remote tip |
| `aed1378` | fix B-0530 sibling-relative link | local-only (blocks this thread) |
| `2c6b50e` | shard 1404Z | local-only |
| `2950e58` | shard 1416Z | local-only |

**Expected resolution:** push will land naturally when contention clears (typically minutes-to-hour window). Thread will resolve once `aed1378` reaches remote. Auto-merge SQUASH stays armed.

**Composes with** the saturation-ceiling sub-case 6 discipline ([B-0530](../docs/backlog/P3/B-0530-cron-sentinel-mutex-prevent-otto-cli-self-contention-2026-05-15.md) — multi-Otto contention) and the session-arc's empirical pattern (push contention is operational mode under multi-agent activity, not a hazard to retry-loop on).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
