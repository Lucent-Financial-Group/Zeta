# Claim - codex-loop-bash-retirement-shebang-parser-20260528

- **Session ID:** codex/launchd-loop
- **Harness:** codex
- **Surface:** codex-background-service
- **Origin:** codex-launchd-loop
- **Run ID:** 20260528T155700Z
- **Claimed at:** 2026-05-28T15:59:26Z
- **ETA:** 2026-05-28T16:30:00Z
- **Scope:** Harden bash-retirement shebang parsing so only shell interpreters, not shell words in non-shell arguments, classify as shell drift.
- **Durable target:** `tools/hygiene/check-bash-retirement-inventory.ts`, `tools/hygiene/check-bash-retirement-inventory.test.ts`
- **Platform mirror:** PR to be opened from `claim/codex-loop-bash-retirement-shebang-parser-20260528`

## Notes

- Trajectory: `docs/trajectories/typescript-bun-migration/RESUME.md`.
- Coordination input: broadcast bus read first; worldview refresh at 2026-05-28T15:57:49Z reported no Codex-owned open PRs.
- Path overlap check: older bash-retirement Codex heartbeats are terminal cleanup states; fresh active heartbeats do not name these files.
