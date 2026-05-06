# Claim - task-remove-no-empty-dirs-sh

- **Session ID:** codex/20260506T173917Z
- **Harness:** codex
- **Claimed at:** 2026-05-06T17:39:17Z
- **ETA:** 2026-05-06T18:00:00Z
- **Scope:** Retire the obsolete no-empty-dirs shell entry point after the TypeScript port.
- **Durable target:** `tools/lint/no-empty-dirs.sh`, `.github/workflows/gate.yml`, `tools/setup/doctor.sh`, and current-state docs that name the active entry point.
- **Platform mirror:** GitHub PR to be opened from this branch.

## Notes

Verification found the shell entry point still wired into CI and doctor,
so this claim covers switching those callers to the existing TypeScript
port before deleting the shell file.
