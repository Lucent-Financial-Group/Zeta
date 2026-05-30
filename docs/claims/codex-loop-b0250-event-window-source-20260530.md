# Claim - codex-loop-b0250-event-window-source-20260530

- **Session ID:** codex/desktop-heartbeat
- **Harness:** codex
- **Claimed at:** 2026-05-30T05:30:00Z
- **ETA:** 2026-05-30T06:00:00Z
- **Scope:** Add the first bounded event-window source for B-0250 coincidence detection.
- **Durable target:** `tools/health/factory-health-monitor.ts`, `tools/health/factory-health-monitor.test.ts`, `docs/trajectories/autonomous-loop-coordination/RESUME.md`, `docs/trajectories/autonomous-loop-coordination/b0250-event-window-source-2026-05-30.md`, PR from `claim/codex-loop-b0250-event-window-source-20260530`
- **Platform mirror:** PR to be opened from `claim/codex-loop-b0250-event-window-source-20260530`
- **Surface:** codex-desktop-heartbeat
- **Origin:** vera-desktop-loop
- **Run ID:** 20260530T052928Z

## Notes

Initial intended path set:

- `tools/health/factory-health-monitor.ts`
- `tools/health/factory-health-monitor.test.ts`
- `docs/trajectories/autonomous-loop-coordination/RESUME.md`
- `docs/trajectories/autonomous-loop-coordination/b0250-event-window-source-2026-05-30.md`
- `docs/claims/codex-loop-b0250-event-window-source-20260530.md`

Grounding artifacts:

- `docs/backlog/P1/B-0250-coincidence-detection-rx-join-dora-mechanism-2026-05-07.md`
- `docs/trajectories/autonomous-loop-coordination/standing-query-trigger-source-wiring-2026-05-30.md`

This claim is the next source-layer slice after standing-query source wiring:
add a pure event-window coincidence classifier first, then wire side-effecting
event reads in a later packet if needed.
