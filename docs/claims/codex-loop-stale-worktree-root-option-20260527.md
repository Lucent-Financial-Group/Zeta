# Claim: codex-loop-stale-worktree-root-option-20260527

claimed-at: 2026-05-27T00:06:00Z
agent: Codex
session: codex/desktop-loop
surface: codex-desktop-heartbeat
origin: vera-desktop-loop
branch: claim/codex-loop-stale-worktree-root-option-20260527
worktree: /Users/acehack/.local/share/zeta-codex-loop/Zeta-worktrees/codex-loop-stale-worktree-root-option-20260527

## Scope

Trajectory: factory hygiene tooling.

Bounded step: let the stale-worktree audit run against an explicit repository
root so loop coordination can audit the control clone without changing the
caller cwd.

## Paths

- tools/hygiene/audit-stale-worktrees.ts
- tools/hygiene/audit-stale-worktrees.test.ts
- docs/claims/codex-loop-stale-worktree-root-option-20260527.md

## Non-Scope

- No pruning of peer worktrees.
- No cleanup of stale admin entries.
- No edits in the contested root checkout.

## Acceptance Check

- `bun test tools/hygiene/audit-stale-worktrees.test.ts`
- `bun tools/hygiene/audit-stale-worktrees.ts --root /Users/acehack/.local/share/zeta-codex-loop/Zeta`
- `node_modules/.bin/prettier --check tools/hygiene/audit-stale-worktrees.ts tools/hygiene/audit-stale-worktrees.test.ts docs/claims/codex-loop-stale-worktree-root-option-20260527.md`
- `node_modules/.bin/tsc --noEmit -p tsconfig.json`
