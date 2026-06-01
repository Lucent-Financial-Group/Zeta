# Claim - b0891-zflash-qemu-ci-dry-run-workflow-codex-20260601T1200Z

- **Session ID:** session-20260601T1200Z-7f3c9b2a
- **Harness:** codex
- **Claimed at:** 2026-06-01T12:00:00Z
- **ETA:** 2026-06-01T12:20:00Z
- **Scope:** Add the smallest B-0891 CI integration slice: a fail-closed zflash QEMU test-harness dry-run workflow that exercises scenario invariants without requiring QEMU hardware.
- **Durable target:** `.github/workflows/zflash-qemu-test.yml`, `tools/zflash/test-harness/`, and any narrow docs/tests required for that workflow.
- **Platform mirror:** none

## Notes

- Coordination refresh found no open PRs, no B-0891 claim branch, and no active Codex/Vera claim.
- This claim avoids the contested root checkout and uses the dedicated worktree under `/Users/acehack/.local/share/zeta-codex-loop/Zeta-worktrees/`.
- B-0844's implementation PR is already merged, so this claim targets the remaining B-0891 workflow gap called out by `tools/zflash/test-harness/README.md`.
