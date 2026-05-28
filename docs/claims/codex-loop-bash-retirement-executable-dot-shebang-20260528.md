# Claim - codex-loop-bash-retirement-executable-dot-shebang-20260528

- **Session ID:** codex/launchd-loop
- **Harness:** codex
- **Surface:** codex-background-service
- **Origin:** codex-launchd-loop
- **Run ID:** 20260528T093455Z
- **Claimed at:** 2026-05-28T09:37:33Z
- **ETA:** 2026-05-28T10:10:00Z
- **Scope:** Strengthen the bash-retirement guard so executable dotted-name shell shebang files cannot evade the retained-shell inventory.
- **Durable target:** `tools/hygiene/check-bash-retirement-inventory.ts`, `tools/hygiene/check-bash-retirement-inventory.test.ts`, `docs/trajectories/typescript-bun-migration/RESUME.md`
- **Platform mirror:** PR to be opened by this run.

## Notes

- Worldview refresh succeeded before selection; the only open PR was Otto-owned.
- Backlog runner selected the TypeScript/Bun migration trajectory and its bash-retirement guard maintenance action.
- Assumption: non-executable dotted documentation fixtures with shell-looking first lines should remain excluded, but executable dotted-name files with shell shebangs are shell-family entrypoints and must be classified as drift.
