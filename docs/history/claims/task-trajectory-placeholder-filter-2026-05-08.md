# Claim - task-trajectory-placeholder-filter

Archived from an untracked local Codex worktree after the implementation merged
in #2000. This record is preserved as history, not as an active claim.

- **Session ID:** codex/20260508T023612Z
- **Harness:** codex
- **Claimed at:** 2026-05-08T02:36:12Z
- **ETA:** 2026-05-08T03:00:00Z
- **Scope:** Filter placeholder trajectory child candidates from autonomous pickup.
- **Durable target:** tools/trajectories/autonomous-pickup.ts; tools/trajectories/autonomous-pickup.test.ts
- **Platform mirror:** none

## Notes

Observed during a bounded Codex loop gate: the factory trajectory packet's
literal `none currently selected` placeholder was treated as a child packet
candidate, producing an invalid create-child-packet prompt.
