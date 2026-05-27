# Claim - codex-loop-bash-retirement-drift-guard-20260527

- **Session ID:** codex/launchd-loop
- **Harness:** codex
- **Claimed at:** 2026-05-27T17:31:00Z
- **ETA:** 2026-05-27T18:15:00Z
- **Scope:** Maintain the TypeScript/Bun bash-retirement inventory guard for newly tracked non-Lean shell drift.
- **Durable target:** `tools/hygiene/check-bash-retirement-inventory.ts`, `tools/hygiene/check-bash-retirement-inventory.test.ts`, and `docs/trajectories/typescript-bun-migration/RESUME.md`
- **Platform mirror:** PR to be opened from this branch.

## Notes

- surface: codex-background-service
- origin: codex-launchd-loop
- run_id: 20260527T172714Z
- pickup source: `bun .codex/bin/codex-backlog-runner.ts --json` selected `docs/trajectories/typescript-bun-migration/RESUME.md`.
- assumption: stale local bash-retirement heartbeats from earlier headless runs are superseded because their worktrees and remote claim refs are absent; this claim takes a fresh bounded guard-maintenance slice.
