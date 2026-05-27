---
slug: codex-loop-trajectory-closed-backlog-skip-20260527
branch: claim/codex-loop-trajectory-closed-backlog-skip-20260527
claimed-at: 2026-05-27T21:18:23Z
session: codex/launchd-loop
surface: codex-background-service
origin: codex-launchd-loop
run_id: 20260527T211554Z
status: review
scope:
  - tools/trajectories/autonomous-pickup.ts
  - tools/trajectories/autonomous-pickup.test.ts
---

# Claim: codex-loop trajectory closed backlog skip

## Scope

Prevent stale trajectory packets from selecting a next action whose only
action-specific backlog references already point at closed backlog rows.

## Coordination Notes

- Broadcast bus and required Codex loop docs were read before selection.
- `timeout --kill-after=5s 30s bun tools/github/refresh-worldview.ts`
  succeeded at 2026-05-27T21:16:57Z.
- No Codex/Vera-owned open PR was found; the backlog runner selected stale
  autonomous-backlog-pickup text naming already-closed B-0280.
- Dedicated worktree:
  `/Users/acehack/.local/share/zeta-codex-loop/Zeta-worktrees/codex-loop-trajectory-closed-backlog-skip-20260527`.
- 2026-05-27T21:20Z: Added a trajectory-picker guard that blocks packets when
  every backlog ref in their next-action/child-candidate text resolves to a
  closed backlog row. Focused check `bun test
  tools/trajectories/autonomous-pickup.test.ts` passed. `git diff --check`
  passed. `bun run typecheck` could not run because `tsc` is not installed in
  this worktree.
