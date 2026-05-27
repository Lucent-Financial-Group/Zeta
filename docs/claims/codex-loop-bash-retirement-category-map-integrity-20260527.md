# Claim - codex-loop-bash-retirement-category-map-integrity-20260527

- **Session ID:** codex/launchd-loop
- **Harness:** codex
- **Surface:** codex-background-service
- **Origin:** codex-launchd-loop
- **Run ID:** 20260527T062335Z
- **Claimed at:** 2026-05-27T06:26:00Z
- **ETA:** 2026-05-27T07:00:00Z
- **Scope:** Add a category-map integrity check to the bash-retirement inventory guard.
- **Durable target:** `tools/hygiene/check-bash-retirement-inventory.ts`, `tools/hygiene/check-bash-retirement-inventory.test.ts`
- **Platform mirror:** GitHub PR to be opened from `claim/codex-loop-bash-retirement-category-map-integrity-20260527`

## Notes

- Trajectory: `docs/trajectories/typescript-bun-migration/RESUME.md`.
- Assumption: maintaining the retained shell guard includes failing loudly when the category metadata drifts from the retained shell allowlist.
