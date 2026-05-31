---
claim_id: codex-loop-b0171-agentic-org-artifact-map-20260531
claimed_at: 2026-05-31T12:27:00Z
agent: Vera
surface: codex-desktop-loop
branch: claim/codex-loop-b0171-agentic-org-artifact-map-20260531
backlog: B-0171
status: active
paths:
  - docs/backlog/P1/B-0171-openspec-catch-up-canonical-source-of-truth-aaron-2026-05-03.md
  - tools/openspec/inventory.ts
  - tools/openspec/inventory.test.ts
  - docs/claims/codex-loop-b0171-agentic-org-artifact-map-20260531.md
---

# Claim: B-0171 OpenSpec inventory agentic-organization artifact map

## Scope

Add the smallest bounded B-0171 reconciliation slice for the current OpenSpec
inventory checkpoint: map the existing `agentic-organization` OpenSpec
capability to concrete repo artifacts so `tools/openspec/inventory.ts` no
longer reports it as an unmapped spec.

## Non-overlap Check

- Avoids #6200 because that branch is `other` lane and its local worktree has
  uncommitted files.
- Avoids `docs/BACKLOG.md`, currently named in older active claim surfaces.
- Does not touch Riven-owned claim paths.

## Verification Plan

- `bun test tools/openspec/inventory.test.ts`
- `bun tools/openspec/inventory.ts --enforce`
- `bun run typecheck`
- `git diff --check`

