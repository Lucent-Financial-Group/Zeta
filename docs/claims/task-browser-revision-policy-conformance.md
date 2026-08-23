# Claim - task-browser-revision-policy-conformance

- **Session ID:** codex/49d2e457
- **Harness:** codex
- **Claimed at:** 2026-08-23T17:58:12Z
- **ETA:** 2026-08-23T21:00:00Z
- **Scope:** Make the native IndexedDB revision policy injectable and prove both policies across real Chromium tabs.
- **Durable target:** `src/Core.TypeScript/browser-node/browser-indexeddb-checkpoint.ts`, browser revision-policy fixture/smoke/tests, and `package.json`
- **Platform mirror:** none

## Notes

The default remains monotone last-writer-wins so the existing remove-then-recreate
Chromium behavior does not change. The new conformance run will execute the same
history under compare-and-swap and monotone policies, including a concurrent fork.
