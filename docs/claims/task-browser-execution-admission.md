# Claim - task-browser-execution-admission

- **Session ID:** 20260810-bxea
- **Harness:** codex
- **Claimed at:** 2026-08-10T23:46:56Z
- **ETA:** 2026-08-11T03:00:00Z
- **Scope:** Add injected finite browser-database execution admission, a Web Locks adapter, runtime wiring, and multi-tab handoff coverage.
- **Durable target:** `src/Core.TypeScript/browser-node/` and the native Dark Hall browser page composition.
- **Platform mirror:** none

## Notes

Admission prevents duplicate finite execution across tabs. IndexedDB revision
comparison and compare-and-swap remain the authoritative write fence.
