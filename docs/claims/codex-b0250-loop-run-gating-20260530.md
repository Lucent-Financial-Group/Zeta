# Claim - codex-b0250-loop-run-gating-20260530

- **Session ID:** codex-20260530T0908Z
- **Harness:** codex
- **Claimed at:** 2026-05-30T09:09:00Z
- **ETA:** 2026-05-30T09:45:00Z
- **Scope:** Narrow B-0250 loop-run coincidence noise by emitting Codex loop-run events only when adjacent heartbeat lines show claim or open-PR count transitions.
- **Durable target:** `tools/health/factory-health-monitor.ts`
- **Platform mirror:** PR to be opened from this claim branch.

## Notes

Claim opened after PR #6098 merged and local cleanup completed. The pre-claim
path check found no active remote claim targeting `tools/health/**` or
`docs/trajectories/autonomous-loop-coordination/**`.
