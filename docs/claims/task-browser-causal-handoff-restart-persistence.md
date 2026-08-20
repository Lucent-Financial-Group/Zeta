# Claim - task-browser-causal-handoff-restart-persistence

- **Session ID:** codex/20260820-bchrp
- **Harness:** codex
- **Claimed at:** 2026-08-20T23:45:58Z
- **ETA:** 2026-08-21T03:45:58Z
- **Scope:** Preserve bounded per-peer causal handoffs across browser reload and coordinator leadership change.
- **Durable target:** Browser durable-runtime checkpoint port, focused tests, and real multi-tab restart coverage.
- **Platform mirror:** none

## Notes

Builds on merged PR #12880. Pending offers remain bounded and must retain typed
backpressure behavior; persistence may not turn capacity refusal into silent eviction.
