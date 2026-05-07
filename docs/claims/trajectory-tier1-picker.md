# Claim - trajectory-tier1-picker

- **Session ID:** 20260507T132856Z-codex
- **Harness:** codex
- **Claimed at:** 2026-05-07T13:28:56Z
- **ETA:** 2026-05-07T14:15:00Z
- **Scope:** Add a trajectory-first picker/decomposer, wire the Codex runner to prefer trajectory enhancement before backlog fallback, and record the enhance-as-we-go rule in the #1 trajectory packet.
- **Durable target:** `docs/trajectories/factory-trajectory-surface/RESUME.md`, `tools/trajectories/autonomous-pickup.ts`, `tools/trajectories/autonomous-pickup.test.ts`, `.codex/bin/codex-backlog-runner.ts`, `.codex/bin/codex-loop-tick.ts`
- **Platform mirror:** PR to be opened from `codex/trajectory-tier1-picker`

## Notes

PR #1877 merged while this claim was active, so this claim now stacks on top of
the merged B-0249 runner. The enhancement keeps trajectory first, then backlog
fallback when no trajectory action is available.
