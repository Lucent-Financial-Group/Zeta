# Claim - codex-loop-stale-claim-cleanup-rule-20260529

- **Claimed at:** 2026-05-29T13:06:34Z
- **Session ID:** codex/launchd-loop
- **Harness:** Codex
- **Surface:** codex-background-service
- **Origin:** codex-launchd-loop
- **Run ID:** 20260529T130400Z
- **Branch:** `claim/codex-loop-stale-claim-cleanup-rule-20260529`
- **Scope:** Add a bounded stale-claim cleanup classifier and trajectory packet for completed PR claim residue.
- **Durable target:** tools/claims/remote-only-state.ts

Initial intended path set:

- `docs/claims/codex-loop-stale-claim-cleanup-rule-20260529.md`
- `tools/claims/remote-only-state.ts`
- `tools/claims/remote-only-state.test.ts`
- `docs/trajectories/autonomous-loop-coordination/stale-claim-cleanup-rule-2026-05-29.md`
- `docs/trajectories/autonomous-loop-coordination/RESUME.md`

## Notes

- Grounded in `docs/trajectories/autonomous-loop-coordination/RESUME.md` next action: stale-claim cleanup rule for completed PRs.
- Path overlap check: stale dirty Codex worktree `claim/task-autonomous-loop-coordination-child-packet-20260528` has dirty paths under `agentic-organization/**` and `docs/pr-discussions/**`, not this path set.
