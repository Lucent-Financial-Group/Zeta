---
id: B-0191
priority: P1
status: open
title: Orchestrator branch-verify mechanization design — pre-commit hook + branch-name display + worktree-aware checks (Aaron 2026-05-04)
tier: foundation
effort: M
ask: Aaron 2026-05-04 verbatim *"for humans this is why oh my zsh reminds us of many things like this it has branch name in the ui"* + same-tick *"maybe a deliberate design/redesign on the backlog?"*
created: 2026-05-04
last_updated: 2026-05-04
depends_on: []
composes_with: [B-0006, B-0140, B-0156, B-0162]
tags: [orchestrator, concurrency-hazard, mechanization, pre-commit-hook, worktree, foundation]
---

# B-0191 — Orchestrator branch-verify mechanization design

## The naming

Aaron 2026-05-04, after watching me re-do the orchestrator-CWD-bleed-over hazard twice in succession (the second time IN the very commit that encoded the rule preventing it):

> *"for humans this is why oh my zsh reminds us of many things like this it has branch name in the ui"*

> *"maybe a deliberate design/redesign on the backlog?"*

The substrate-level rule already exists (PR #1551 + PR #1568). The operational discipline keeps failing because it relies on agent-memory rather than mechanization. oh-my-zsh's branch-name-in-prompt solves the equivalent human problem — make the current branch ALWAYS visible, removing the discipline-burden.

This row plans the AI-substrate equivalent: mechanized branch-verify that catches wrong-branch commits before they happen.

## The hazard (recap)

When parallel subagents run in worktrees that share the parent `.git` directory, the orchestrator's `git checkout` operations can silently fail to switch HEAD as expected. Symptoms:

1. Orchestrator runs `git checkout main && git restore . && git pull --ff-only`.
2. Output appears successful.
3. Orchestrator runs `git checkout -b new-feature-branch`.
4. Output reports "Switched to a new branch 'new-feature-branch'".
5. Orchestrator commits.
6. Commit lands on a SUBAGENT's branch instead of `new-feature-branch`.

Empirically observed twice 2026-05-04 (B-0190 commit landed on tier-48 branch; B-0191/PR #1568 commit landed on openspec-audit branch).

## Mechanization candidates (in priority order)

### 1. Pre-commit hook — fail-on-unexpected-branch (HIGH leverage)

Implementation: shell script at `.git/hooks/pre-commit` (or via `husky` / `pre-commit` framework if cross-repo):

```bash
#!/usr/bin/env bash
# Pre-commit: verify branch matches expected pattern OR has explicit override.
expected_branch="${ZETA_EXPECTED_BRANCH:-}"
current_branch=$(git branch --show-current)

if [ -n "$expected_branch" ] && [ "$current_branch" != "$expected_branch" ]; then
    echo "ERROR: Pre-commit branch mismatch."
    echo "  Expected: $expected_branch"
    echo "  Current:  $current_branch"
    echo "  Run \`git checkout $expected_branch\` and verify, or unset ZETA_EXPECTED_BRANCH."
    exit 1
fi

# Default check: warn (don't fail) if on a subagent worktree branch
case "$current_branch" in
    research/*-aaron-2026-* | fix/memory-md-tier-* | feature/*-aaron-2026-*)
        # OK if intentional — but flag for visibility
        echo "INFO: committing on '$current_branch' — verify this is intentional."
        ;;
esac
```

Acceptance: hook installed, blocks commits when `ZETA_EXPECTED_BRANCH` env var is set and doesn't match.

### 2. Branch-name in shell prompt (MED leverage — orchestrator UX)

Mechanization: customize the shell prompt for any session running orchestrator git operations to show the current branch (oh-my-zsh equivalent). Already supported by every modern shell config; just needs to be the default for Claude Code sessions on this repo.

Acceptance: `.zshrc` / `.bashrc` snippet documented in `tools/setup/` that adds branch-aware prompt.

### 3. Worktree-aware status check (LOW-MED leverage — diagnostic)

Implementation: a `tools/check-orchestrator-state.sh` script that runs:
- `git branch --show-current`
- `git status --short`
- `git worktree list`
- Cross-checks: any worktree branches the orchestrator is currently on by accident?

Output: structured status for orchestrator's start-of-tick health check.

Acceptance: script runs in <1s; integrated into autonomous-loop tick start.

### 4. Bash wrapper around `git commit` (LOW leverage — heavy-handed)

Wrap `git commit` with a function that runs `git branch --show-current` first and aborts on mismatch.

Trade-off: catches everything but heavy-handed; hook (option 1) is cleaner.

### 5. ZETA_EXPECTED_BRANCH convention (cross-cutting)

Establish a session-level env var that ALL orchestrator git operations check. Each `git checkout -b X` sets `ZETA_EXPECTED_BRANCH=X`. Every commit verifies. The hook + wrapper both use this var.

## Why P1

- **Demonstrated recurrence**: hazard hit twice in one session 2026-05-04, including in the substrate-encoding commit itself.
- **Foundation tier**: every parallel-subagent dispatch carries this risk; the substrate-encoding-of-the-rule has not prevented recurrence.
- **Low effort, high leverage**: pre-commit hook is ~50 lines of shell; mechanization removes the entire class of failure.

## Why not P0

- **Not blocking**: the hazard recovers via force-push; no data loss.
- **Substrate-encoding-of-the-rule** (PR #1568) already gives manual discipline.

## Acceptance criteria

1. **Pre-commit hook** at `.git/hooks/pre-commit` (or via tooling) that fails commits when `ZETA_EXPECTED_BRANCH` is set and `git branch --show-current` doesn't match.
2. **Hook installed via `tools/setup/`** so it survives clones.
3. **Documentation** in CLAUDE.md or AGENTS.md pointing at the hook + the env-var convention.
4. **Test**: deliberately checkout the wrong branch, attempt commit, verify hook blocks.
5. **At least one mechanization-related sub-row landed** (hook or prompt or status-check); others can defer.

## Out of scope

- **Replacing the substrate-encoding rule** (PR #1568 stays — manual discipline still load-bearing for non-mechanized scenarios).
- **Forcing every commit through the hook** (env var unset = hook is informational, not blocking).
- **Cross-machine enforcement** (can't enforce on someone else's clone unless hook is in tools/setup/).

## Composes with

- `memory/feedback_orchestrator_pre_commit_verify_branch_rule_aaron_2026_05_04.md` (PR #1568) — manual discipline this row mechanizes.
- `memory/feedback_parallel_subagent_concurrency_lessons_cluster_aaron_2026_05_04.md` (PR #1551) — Lesson 2 (orchestrator stays on main); same family.
- `B-0006` — memory work pattern that hits this most.
- `B-0162` — pre-commit hook for direct-name-attribution; similar mechanization approach.

## The carved sentence

**"Mechanization is the substrate-level fix for discipline failures that recur. oh-my-zsh shows branch in every prompt for human-side; AI-substrate needs equivalent: pre-commit hook with `ZETA_EXPECTED_BRANCH` check that blocks wrong-branch commits before they happen."**
