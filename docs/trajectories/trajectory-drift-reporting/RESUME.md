# Trajectory - Trajectory Drift Reporting

Status: active child packet
Last refreshed: 2026-05-07
Parent trajectory: `docs/trajectories/factory-trajectory-surface/RESUME.md`
Grounding surface: `docs/SAFE-AUTONOMOUS-ACTIONS.md`

## Why This Exists

`docs/SAFE-AUTONOMOUS-ACTIONS.md` names trajectory drift as a future
autonomous action, but explicitly limits it to report-only behavior. This child
packet makes that lane claimable without giving loops permission to rewrite
trajectory state automatically.

Trajectory packets are supposed to remember lane state. Drift reporting is the
small, auditable check that notices when committed work, recent claims, or
merged backlog movement no longer matches the current `docs/trajectories/`
surface.

## Current Rule

Surface drift; do not correct it automatically.

A trajectory drift report compares committed substrate against the current
trajectory packet set and produces reviewable evidence. It may recommend a next
action, but the recommendation remains report-only until a separate claim or PR
updates the trajectory surface.

## Current Next Action

Define the first report table shape before writing scripts:

```text
trajectory -> expected current signal -> observed evidence -> drift class -> recommended next action
```

The first report should use recent git history plus `docs/trajectories/` state
as input and should land as documentation only. Automation can follow once the
classification language is stable enough to test.

## Candidate Atomic Children

- drift-report template for all active trajectory packets
- stale child-packet classifier with explicit evidence links
- parent/child linkage audit for `docs/trajectories/`
- recent-commit sampler that proposes, but does not apply, trajectory updates
- loop-safe read-only command for producing a trajectory drift report

## Evidence Links

- `docs/SAFE-AUTONOMOUS-ACTIONS.md`
- `docs/trajectories/factory-trajectory-surface/RESUME.md`
- `docs/AUTONOMOUS-LOOP.md`
- `docs/AGENT-CLAIM-PROTOCOL.md`

## Out Of Scope

- No automatic trajectory rewrites.
- No runner behavior changes.
- No CI gate.
- No broad backlog migration.
- No claim that drift exists until a report cites concrete evidence.

This packet exists to make trajectory drift observable before making it
actionable.
