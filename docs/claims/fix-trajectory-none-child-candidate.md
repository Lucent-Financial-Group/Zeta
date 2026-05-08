# Claim - fix-trajectory-none-child-candidate

- **Session ID:** codex/20260508T040741Z-fix-trajectory-none-child-candidate
- **Harness:** codex
- **Claimed at:** 2026-05-08T04:07:41Z
- **ETA:** 2026-05-08T06:35:00Z
- **Scope:** Fix the trajectory selector so placeholder child-candidate text is not treated as actionable trajectory work.
- **Durable target:** `tools/trajectories/autonomous-pickup.ts`, `tools/trajectories/autonomous-pickup.test.ts`
- **Platform mirror:** PR to be opened from this branch.

## Notes

The bounded gate observed `codex-backlog-runner` selecting
`factory-trajectory-surface` with `First child candidate: none currently
selected`. That placeholder should block the packet as having no concrete next
action instead of producing a bogus child-packet prompt.

2026-05-08T06:27Z: The Codex harness resumed the stale claim, preserved the
existing worktree patch, and verified the selector now routes the packet to
`blocked` with reason `no next action found`.
