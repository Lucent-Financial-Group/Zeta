# Claim - task-codex-backlog-runner-claim-filter

- **Session ID:** codex/20260508T165204Z-task-codex-backlog-runner-claim-filter
- **Harness:** codex
- **Claimed at:** 2026-05-08T16:52:04Z
- **ETA:** 2026-05-08T17:37:06Z
- **Scope:** Teach the Codex backlog runner to include live remote-claim and heartbeat path signals before selecting trajectory or backlog work.
- **Durable target:** PR against `.codex/bin/codex-backlog-runner.ts` and `tools/backlog/codex-backlog-runner.test.ts`
- **Platform mirror:** GitHub PR pending

## Notes

This claim exists because the runner selected the TypeScript/Bun trajectory
while `claim/trajectory-typescript-bun-live-state` and its heartbeat already
owned `docs/trajectories/typescript-bun-migration/RESUME.md`.
