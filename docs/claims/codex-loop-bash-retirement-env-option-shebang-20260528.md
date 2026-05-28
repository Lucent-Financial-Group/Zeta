# Claim - codex-loop-bash-retirement-env-option-shebang-20260528

- **Session ID:** codex/launchd-loop
- **Harness:** codex
- **Claimed at:** 2026-05-28T16:45:29Z
- **ETA:** 2026-05-28T17:15:00Z
- **Scope:** Harden bash-retirement shell-family shebang parsing for `env` options with separate operands.
- **Durable target:** `tools/hygiene/check-bash-retirement-inventory.ts`, `tools/hygiene/check-bash-retirement-inventory.test.ts`
- **Platform mirror:** PR to be opened from `claim/codex-loop-bash-retirement-env-option-shebang-20260528`

## Notes

- surface: codex-background-service
- origin: codex-launchd-loop
- run_id: 20260528T164250Z
- trajectory: `docs/trajectories/typescript-bun-migration/RESUME.md`
- acceptance: focused Bun test covers `env -u NAME`, `env --unset NAME`, `env -P PATH`, `env --chdir DIR`, and `env -a ARG` before a shell-family command; inventory guard still reports no drift on the current repo.
