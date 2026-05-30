# Claim - codex-loop-b0250-dirty-worktree-priority-20260530

- **Session ID:** codex/launchd-loop
- **Harness:** codex
- **Claimed at:** 2026-05-30T10:16:45Z
- **ETA:** 2026-05-30T11:00:00Z
- **Scope:** Create one autonomous-loop-coordination child packet for using local dirty-worktree signals to prioritize stale-worktree cleanup.
- **Durable target:** `docs/trajectories/autonomous-loop-coordination/dirty-worktree-priority-2026-05-30.md` and `docs/trajectories/autonomous-loop-coordination/RESUME.md`
- **Platform mirror:** PR TBD
- **Surface:** codex-background-service
- **Origin:** codex-launchd-loop
- **Run ID:** 20260530T101503Z

## Notes

- Work source: `bun .codex/bin/codex-backlog-runner.ts --json` selected
  trajectory `autonomous-loop-coordination` with action `create-child-packet`.
- Coordination input: broadcast bus read first; GitHub PR state and remote
  claim branches refreshed before this claim.
