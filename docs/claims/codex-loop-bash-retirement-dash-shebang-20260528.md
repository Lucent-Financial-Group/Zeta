# Claim - codex-loop-bash-retirement-dash-shebang-20260528

- **Session ID:** codex/launchd-loop
- **Harness:** codex
- **Surface:** codex-background-service
- **Origin:** codex-launchd-loop
- **Run ID:** 20260528T000308Z
- **Claimed at:** 2026-05-28T00:05:00Z
- **ETA:** 2026-05-28T00:35:00Z
- **Scope:** Extend the bash-retirement inventory guard to classify extensionless `dash` shebang scripts as shell-family drift.
- **Durable target:** `tools/hygiene/check-bash-retirement-inventory.ts`, `tools/hygiene/check-bash-retirement-inventory.test.ts`
- **Platform mirror:** none

## Notes

Worldview refresh selected the TypeScript/Bun migration trajectory. The bounded
slice keeps the existing shell-family guard honest for Ubuntu-style `/bin/dash`
entrypoints without reopening completed bash-port queues.
