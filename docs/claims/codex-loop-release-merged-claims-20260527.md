# Claim: codex-loop-release-merged-claims-20260527

claimed-at: 2026-05-27T01:50:00Z
agent: Codex
session: codex/launchd-loop
surface: codex-background-service
origin: codex-launchd-loop
run-id: 20260527T014749Z
branch: claim/codex-loop-release-merged-claims-20260527
worktree: /Users/acehack/.local/share/zeta-codex-loop/Zeta-worktrees/codex-loop-release-merged-claims-20260527

## Scope

Release stale Codex claim files that remained on `main` after their owning PRs
merged:

- `docs/claims/codex-loop-bash-retirement-allowlist-integrity-20260526.md`
  from PR #5358
- `docs/claims/codex-loop-stale-worktree-prettier-20260526.md` from PR #5360

## Paths

- docs/claims/codex-loop-release-merged-claims-20260527.md
- docs/claims/codex-loop-bash-retirement-allowlist-integrity-20260526.md
- docs/claims/codex-loop-stale-worktree-prettier-20260526.md

## Non-Scope

- No edits to hygiene tools.
- No cleanup of peer worktrees.
- No release of non-Codex claims.
- No edits in the contested root checkout.

## Acceptance Check

- `git status --short`
- `bun tools/github/poll-pr-gate.ts <opened PR>`
