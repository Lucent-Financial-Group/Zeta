# Claim - codex-loop-b0250-stale-worktree-child-packet-20260530

- **Session ID:** codex/launchd-loop
- **Harness:** codex
- **Surface:** codex-background-service
- **Origin:** codex-launchd-loop
- **Run ID:** 20260530T114623Z
- **Claimed at:** 2026-05-30T11:48:20Z
- **ETA:** 2026-05-30T12:20:00Z
- **Scope:** Create one B-0250 child packet selecting the next bounded stale-worktree cleanup slice.
- **Durable target:** `docs/trajectories/autonomous-loop-coordination/b0250-stale-worktree-cleanup-selection-2026-05-30.md`
- **Platform mirror:** PR to be opened from `claim/codex-loop-b0250-stale-worktree-child-packet-20260530`

## Notes

- Broadcast bus, startup docs, and worldview refresh were read before this
  claim.
- `bun .codex/bin/codex-backlog-runner.ts --json` selected the
  `autonomous-loop-coordination` trajectory with action
  `create-child-packet`.
- This claim does not delete worktrees or remote claim refs. It records the
  next cleanup target and acceptance checks so a later run can execute one
  bounded cleanup step without broad pruning.
