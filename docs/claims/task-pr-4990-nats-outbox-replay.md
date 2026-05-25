# Claim - task-pr-4990-nats-outbox-replay

- **Session ID:** codex/20260525T2209Z
- **Harness:** codex
- **Claimed at:** 2026-05-25T22:09:40Z
- **ETA:** 2026-05-25T22:30:00Z
- **Scope:** Replay only the intended post-#4990 agentic-organization NATS outbox and replaceable state-adapter slice onto current main, excluding stale-base governance/backlog deletions.
- **Durable target:** draft PR from a clean Codex branch after replay and focused package checks
- **Platform mirror:** https://github.com/Lucent-Financial-Group/Zeta/pull/4990

## Notes

- Source branch under triage: `codex/agentic-org-package-ca-clean` at
  `16417aecba9eae921bba0e363c2f5f9c4d21bbe7` as of
  2026-05-25T22:09Z.
- Do not delete or force-update that source branch during this claim.
- Current source branch diff includes stale-base noise outside scope:
  `GOVERNANCE.md`, `docs/BACKLOG.md`, and a backlog row deletion.
- Dirty older #4990 local worktrees are out of scope and must remain untouched
  unless a later tick explicitly proves they are safe to clean.
