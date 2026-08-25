# Claim - task-markdownlint-arc-venv-20260825

- **Session ID:** codex/019e9b66
- **Harness:** codex
- **Claimed at:** 2026-08-25T04:41:06Z
- **ETA:** 2026-08-25T05:00:00Z
- **Scope:** Exclude the Git-ignored ARC Python virtual environment from repository Markdown linting.
- **Durable target:** `.markdownlint-cli2.jsonc`
- **Platform mirror:** none

## Notes

The ARC Python lane installs third-party Markdown below `src/Arc.Python/.venv/`. Git already ignores that environment; Markdownlint must treat it as generated dependency state rather than repository prose.
