# Claim - task-bash-retirement-inventory-wire-20260512

- **Session ID:** codex/20260512T043123Z-bash-retirement-wire
- **Harness:** codex
- **Claimed at:** 2026-05-12T04:31:23Z
- **ETA:** 2026-05-12T05:15:00Z
- **Scope:** Wire the bash-retirement inventory guard into the appropriate hygiene/CI surface after PR #2764 landed the check.
- **Durable target:** `package.json`, `.github/workflows/gate.yml`, `docs/trajectories/typescript-bun-migration/RESUME.md`
- **Platform mirror:** planned PR

## Notes

- Worldview refresh at 2026-05-12T04:29:51Z showed no Codex-owned open PRs and selected the TypeScript/Bun migration trajectory.
- PR #2764 already landed `tools/hygiene/check-bash-retirement-inventory.ts`; this claim covers the follow-up wire-in slice only.
- Active `parallel-pr-runner-slots` claim touches `.codex/bin/*` and `tools/backlog/codex-backlog-runner.test.ts`; this claim avoids those paths.
