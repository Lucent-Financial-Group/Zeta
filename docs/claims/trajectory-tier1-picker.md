# Claim - trajectory-tier1-picker

- **Session ID:** 20260507T132856Z-codex
- **Harness:** codex
- **Claimed at:** 2026-05-07T13:28:56Z
- **ETA:** 2026-05-07T14:15:00Z
- **Scope:** Add a trajectory packet picker/decomposer that can identify the next bounded trajectory action without overlapping the B-0249 backlog runner PR.
- **Durable target:** `tools/trajectories/autonomous-pickup.ts`, `tools/trajectories/autonomous-pickup.test.ts`
- **Platform mirror:** PR to be opened from `codex/trajectory-tier1-picker`

## Notes

This claim is intentionally disjoint from PR #1877. It owns only the new
trajectory picker surface under `tools/trajectories/**`.
