# Claim - codex-loop-b0250-event-observation-adapter-20260530

Status: active
Owner: Codex/Vera
Session: codex/desktop-heartbeat
Started: 2026-05-30T05:48Z

## Scope

Add the first real factory event observation adapter for B-0250 coincidence
detection, feeding observable factory events into the event-window classifier
landed by #6084.

## Planned Path Set

- `tools/health/factory-health-monitor.ts`
- `tools/health/factory-health-monitor.test.ts`
- `docs/trajectories/autonomous-loop-coordination/RESUME.md`
- `docs/trajectories/autonomous-loop-coordination/b0250-event-observation-adapter-2026-05-30.md`

## Non-Overlap Check

Before claiming, live `origin/claim/*` refs were searched for
`tools/health/factory-health-monitor`, `autonomous-loop-coordination`,
`B-0250`, and `coincidence`; no active claim matched these paths or this
packet.

## Done Criteria

- Add a deterministic event observation adapter with no new background
  dependency.
- Cover parser/classifier wiring with focused tests.
- Update the autonomous-loop coordination trajectory receipt and resume.
- Run focused checks, push the branch, and open a PR.
