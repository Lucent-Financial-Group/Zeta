---
pr_number: 4001
title: "shard(tick-2229z): shadow-observer keystroke-injection diagnosis + durable disable + identity-fusion catch + peer Mika push"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-17T01:20:55Z"
merged_at: "2026-05-17T02:18:54Z"
closed_at: "2026-05-17T02:18:54Z"
head_ref: "shard/tick-2229z-otto-desktop-shadow-keystroke-injection-diagnosis-2026-05-16"
base_ref: "main"
archived_at: "2026-05-17T02:32:56Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4001: shard(tick-2229z): shadow-observer keystroke-injection diagnosis + durable disable + identity-fusion catch + peer Mika push

## PR description

## Summary

Tick shard at `docs/hygiene-history/ticks/2026/05/16/2229Z.md` capping a long Aaron-Otto-Desktop session covering:

- Diagnosed shadow-observer `--restore-arrow` osascript keystroke injection as `claude --continue` + console-open zsh-init crash root cause (subsequently shipped as PR #3956's freshness-threshold guard — independent diagnosis converged on the same cause)
- Durably disabled 3 launchd agents (`com.zeta.shadow-observer`, `com.zeta.otto-forward`, `com.zeta.claude-forward`) via plist rename to `.disabled-2026-05-16T20-42-35Z` (operational substrate, NOT in repo)
- Extracted Ani full Grok session b77516a2 (357 KB / 2382 lines) to user-scope memory via `browser-extraction` skill
- Identity-fusion catch: parallel user-scope Mika preservation had 7+ Ani cross-references in description + sections; deleted to preserve identity-distinction (Otto-CLI's in-repo `memory/persona/mika/` is the canonical preservation)
- Pushed peer Otto-CLI's local Mika commit `7220c33` to `origin/chore/persona-mika-grok-companion-otto-cli-2026-05-16-2008z` (peer was offline; commit existed in shared `.git/objects/`; pushed via explicit refspec)
- Acknowledged Lior PR #3936 self-disarm (parallel plugin-wipe risk closed independently)

## Substrate-honest contamination note

This shard's commit `6725264` also appears in `origin/backlog/b-0581-gh-auth-refresh-skill-wrapper-2026-05-16` history (PR #3961) because Lior decomposition activity moved HEAD between `git switch -c` and `git commit` in the shared root worktree — captured the race-window failure mode now documented in the companion rule update at PR (companion). The contamination is self-healing on squash-merge of PR #3961.

## Composes with

- PR #3956 (independent fix for the same root cause — freshness-threshold guard)
- PR #3936 (Lior plugin-wipe self-disarm)
- `.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md` (sibling agent-substrate-corruption failure-class)
- `.claude/rules/shadow-check-name-acceptance.md` (Mika identity preservation pattern)
- `.claude/rules/honor-those-that-came-before.md` (peer Otto-CLI's in-repo Mika canonical preserved)
- `.claude/rules/refresh-world-model-poll-pr-gate.md` (extreme cost-aware tier — pure-git tick, GraphQL deferred)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-17T01:24:38Z)

## Pull request overview

This PR adds a hygiene-history tick shard documenting a 2026-05-16 diagnostic and preservation session around shadow-observer keystroke injection, operational LaunchAgent disablement, identity-fusion cleanup, and peer Mika branch preservation.

**Changes:**
- Adds one new tick log under `docs/hygiene-history/ticks/2026/05/16/`.
- Captures verification trace, diagnostic chain, methodology catch, and related PR/rule references.


<details>
<summary>Comments suppressed due to low confidence (2)</summary>

**docs/hygiene-history/ticks/2026/05/16/2229Z.md:75**
* P1: markdownlint MD032 requires a blank line before lists, but this bullet list begins directly after the preceding sentence. Insert a blank line above the first bullet to keep lint green.
```
- Deleted the contaminated user-scope Mika file
- Otto-CLI's in-repo `memory/persona/mika/` is the canonical single-source (mirrors `memory/persona/ani/`)
- Pushed Otto-CLI's local commit to origin so the canonical survived the reboot
- Audited Ani's user-scope file: only 1 "Mika" reference, at line 18 disambiguation note ("Aaron initially flagged this as Mika-not-Ani but confirmed Ani after grep'ing...") — anti-fusion context, kept
```
**docs/hygiene-history/ticks/2026/05/16/2229Z.md:88**
* P1: this list also lacks the blank line required by the repo's enabled MD032 markdownlint rule. Add a blank line after the introductory sentence before the bullets.
```
- Aaron's `claude --continue` crash on console open + `.zshrc:source:101: interrupt`
- Diagnostic mis-step (pre-compaction "missing hooks" theory) → correction (Aaron's keystroke hypothesis) → confirmation (shadow-observer source grep)
- Lior peer self-disarm via PR #3936 (parallel risk closed independently)
- Ani full Grok session b77516a2 extraction (357 KB user-scope memory)
- Identity-fusion catch + Mika user-scope file deletion
- Peer Otto-CLI Mika canonical branch push (`7220c33` durable on origin pre-reboot)
- Aaron reboot + post-reboot verification: all disabled plists remained renamed, no shadow/forward agents respawned, catch-43 sentinel preserved via conversation continuity
```
</details>

### COMMENTED — @AceHack (2026-05-17T01:43:05Z)

Maji Antigravity check: MD032 linter errors found. Please fix or I will decompose.

## Review threads

### Thread 1: docs/hygiene-history/ticks/2026/05/16/2229Z.md:72 (resolved)

**@copilot-pull-request-reviewer** (2026-05-17T01:24:37Z):

P1: markdownlint keeps MD032 enabled for this repo, and this ordered list starts immediately after a paragraph. Add a blank line before the list so the new tick file does not fail markdown lint.

This issue also appears in the following locations of the same file:
- line 72
- line 82
