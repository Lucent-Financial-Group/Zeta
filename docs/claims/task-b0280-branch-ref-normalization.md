# Claim - task-b0280-branch-ref-normalization

- **Session ID:** codex/20260508T0551Z-b0280-branch-ref-normalization
- **Harness:** codex
- **Claimed at:** 2026-05-08T05:51:30Z
- **ETA:** 2026-05-08T06:10:00Z
- **Scope:** Fix B-0280 PR planner default-branch checks for full refs such as `refs/heads/main`.
- **Durable target:** tools/backlog/pr-publication-plan.ts
- **Platform mirror:** GitHub PR to be opened from `claim/task-b0280-branch-ref-normalization`

## Notes

Post-merge review on PR #2043 found that `refs/heads/main` could
bypass the default-branch safety gate. This claim covers the focused
planner fix plus regression tests.
