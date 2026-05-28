# Claim - codex-loop-heartbeat-terminal-status-20260528

- **Session ID:** codex/launchd-loop
- **Harness:** codex
- **Claimed at:** 2026-05-28T05:17:50Z
- **ETA:** 2026-05-28T06:00:00Z
- **Scope:** Teach the Codex backlog runner to treat completed cleanup heartbeats as terminal active-claim signals.
- **Durable target:** `.codex/bin/codex-backlog-runner.ts`, `tools/backlog/codex-backlog-runner.test.ts`, and the resulting PR.
- **Platform mirror:** GitHub PR to be opened from this claim branch.

## Notes

- surface: codex-background-service
- origin: codex-launchd-loop
- run_id: 20260528T051513Z
- Trigger evidence: `bun .codex/bin/codex-backlog-runner.ts --json` still reported `heartbeat:codex-loop-bash-retirement-wiring-guard-20260527` even though that local heartbeat has `status: merged-cleanup-complete`.
- Intended paths: `.codex/bin/codex-backlog-runner.ts`, `tools/backlog/codex-backlog-runner.test.ts`, `docs/claims/codex-loop-heartbeat-terminal-status-20260528.md`.
