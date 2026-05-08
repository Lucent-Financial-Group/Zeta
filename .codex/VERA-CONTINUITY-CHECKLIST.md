# Vera Continuity Checklist

Use this checklist when Vera re-enters Zeta from Codex IDE chat,
Codex app heartbeat, Codex CLI, or another Codex surface.

The goal is to prove continuity from substrate before acting.

## 1. Read Authority

Read in this order:

1. `AGENTS.md`
2. `docs/ALIGNMENT.md`
3. `.codex/AGENTS.md`
4. `.codex/CURRENT-codex.md`
5. `.codex/CURRENT-vera.md`
6. `.codex/TOOL-MAP.md`
7. `docs/CODEX-HARNESS-NOTES.md`
8. `docs/AGENT-CLAIM-PROTOCOL.md`

For autonomous-loop work, also read `docs/CODEX-LOOP-HANDOFF.md`
and `docs/AUTONOMOUS-LOOP.md`.

## 2. Verify Live State

Run or equivalent-check:

```bash
for f in ~/.local/share/zeta-broadcasts/{otto,vera,riven}.md; do
  [ -f "$f" ] && tail -80 "$f"
done

git fetch --prune origin
git status --short --branch
git branch -r --list 'origin/claim/*'
git worktree list --porcelain
gh pr list --repo Lucent-Financial-Group/Zeta --state open \
  --json number,title,headRefName,autoMergeRequest,updatedAt
bun ~/.local/share/zeta-codex-loop/Zeta/.codex/bin/codex-loop-health.ts
```

Broadcasts are coordination input. GitHub PR state, remote refs, and
current file contents are authority.

## 3. Classify Vera's Surface

Before doing work, name the active surface:

- `codex-ide-chat`
- `codex-app-heartbeat`
- `codex-cli`
- `codex-cloud`
- `launchd-loop`

Then name the mode:

- `active-manager`
- `heartbeat-only`
- `auditor`
- `reviewer`

Only one Codex surface may be active manager for the same path set or
trajectory.

## 4. Claim Before Writing

For repo edits:

1. Create a dedicated worktree from current `origin/main`.
2. Create and push `claim/<slug>`.
3. Add `docs/claims/<slug>.md`.
4. Create a local heartbeat under
   `$(git rev-parse --git-common-dir)/agent-heartbeats/`.
5. Name the intended path set in the heartbeat.
6. Do not write in the root checkout unless Aaron explicitly assigns it.

## 5. Choose One Toe-Safe Step

Preferred heartbeat actions:

- merge a clean Vera/Codex PR
- inspect and address actionable Vera/Codex review or CI state
- clean completed Vera/Codex work after merge
- make a small claim-scoped patch in an owned worktree
- publish a durable broadcast update when no write is safe

Do not overlap another active claim or branch without explicit
co-claim evidence.

## 6. Preserve Important Memory

Chat, ad-hoc memory notes, broadcasts, and local logs are cache.
If a decision matters after compaction or crash, preserve it in repo
substrate:

- `docs/research/` for research-grade frames
- `docs/DECISIONS/` for ADRs
- `.codex/**` for Codex harness state
- `docs/backlog/**` for actionable follow-up work
- `GOVERNANCE.md` or `docs/AGENT-BEST-PRACTICES.md` only after
  explicit promotion

## 7. Cleanup Guard

Before deleting a worktree or branch, prove all of this:

- the associated PR is merged or the work is explicitly abandoned
- the worktree is clean
- local commits are reachable from `origin/main` or intentionally
  preserved elsewhere
- the branch diff would not remove newer substrate
- no process still owns the path set

If any check fails, leave the worktree alone and write the blocker to
the broadcast bus.

## 8. Exit Cleanly

Before final response:

- run focused checks
- push any committed work
- open or update the PR
- release the claim in the same PR when work is ready
- update `~/.local/share/zeta-broadcasts/vera.md`
- report the durable outcome and exact next safe action
