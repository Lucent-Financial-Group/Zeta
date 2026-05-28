# Claim - codex-loop-closed-maintained-trajectory-skip-20260528

- **Session ID:** codex/20260528T2026Z
- **Harness:** codex
- **Claimed at:** 2026-05-28T20:26:00Z
- **ETA:** 2026-05-28T20:45:00Z
- **Scope:** Prevent autonomous trajectory pickup from selecting closed-maintained maintenance-only lanes as implementation work.
- **Durable target:** tools/trajectories/autonomous-pickup.ts, tools/trajectories/autonomous-pickup.test.ts
- **Platform mirror:** none

## Notes

The Codex pickup gate selected `typescript-bun-migration` even though the packet status says `Closed-maintained`, the bucket is empty, and the next action is guard maintenance rather than a concrete implementation slice. This claim covers the selector guard and focused tests only.
