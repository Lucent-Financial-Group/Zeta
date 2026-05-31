---
claim: codex-loop-b0171-3-spec-path-20260531
agent: Vera
claimed-at: 2026-05-31T12:52:00Z
status: active
branch: claim/codex-loop-b0171-3-spec-path-20260531
scope:
  - docs/backlog/P1/B-0171.3-author-retraction-native-spec.md
  - docs/claims/codex-loop-b0171-3-spec-path-20260531.md
---

# Claim: B-0171.3 OpenSpec path correction

## Task

Correct the B-0171.3 child row so its acceptance criteria target the
inventory-discovered OpenSpec path `openspec/specs/retraction-native/spec.md`
instead of the README-only background file.

## Non-overlap

- Does not touch `docs/BACKLOG.md`, which is covered by active backlog-index
  claims.
- Does not touch #6200 or its dirty local worktree.
- Does not touch any active Riven claim path.

## Release Plan

Delete this claim file in the same PR after the bounded row correction lands.
