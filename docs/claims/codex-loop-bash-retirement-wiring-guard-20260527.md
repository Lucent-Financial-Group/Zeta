# Claim - codex-loop-bash-retirement-wiring-guard-20260527

- **Claimed at:** 2026-05-27T18:46:08Z
- **Session:** codex/launchd-loop
- **Surface:** codex-background-service
- **Origin:** codex-launchd-loop
- **Run id:** 20260527T184333Z
- **ETA:** 2026-05-27T19:05:00Z
- **Scope:** Harden the bash-retirement inventory guard test coverage so CI/package wiring cannot silently drift.
- **Durable target:** PR from `claim/codex-loop-bash-retirement-wiring-guard-20260527`.

## Notes

- Trajectory: `docs/trajectories/typescript-bun-migration/RESUME.md`.
- Intended paths: `tools/hygiene/check-bash-retirement-inventory.test.ts`.
- Assumption: a test-only TypeScript hardening slice is the smallest bounded step for the selected "maintain inventory guard" trajectory because the live inventory already matches the allowlist.
