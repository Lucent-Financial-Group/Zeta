# Claim - task-autoloop-lifetime-tsc-20260528

- **Session ID:** codex/20260528T134516Z
- **Harness:** codex
- **Claimed at:** 2026-05-28T13:46:00Z
- **ETA:** 2026-05-28T14:05:00Z
- **Scope:** Repair the remaining `AutoLoopLifetime` TypeScript `exactOptionalPropertyTypes` failure blocking #5800 after the CodebergWorld fix merged.
- **Durable target:** `tools/workflow-engine/auto-loop-lifetime.ts` and `tools/workflow-engine/auto-loop-lifetime.test.ts`.
- **Platform mirror:** #5800 `lint (tsc tools)` failure

## Notes

Claim opened after inspecting #5800 run `26578022574`, job `78302702452`.
The #5800 branch itself changes only backlog docs, and its backlog uniqueness,
parent-child, setup-heavy lint, build/test, CodeQL, and submit-nuget checks are
green.

The remaining current-main blocker is:

- `tools/workflow-engine/auto-loop-lifetime.test.ts(138,11)`: object literal
  supplies `lastNamedDependency: undefined` where `TickContext` has an optional
  `string` property under `exactOptionalPropertyTypes`.
- `tools/workflow-engine/auto-loop-lifetime.ts(353,3)`: `createTickContext`
  returns `lastNamedDependency: string | undefined` into the same optional
  `string` field.

Ownership check found no open PR file list and no active `origin/claim/*` claim
file touching `tools/workflow-engine/auto-loop-lifetime.ts` or its test. #5812
is adjacent `auto-loop-lifecycle.*` work, not this path set.
