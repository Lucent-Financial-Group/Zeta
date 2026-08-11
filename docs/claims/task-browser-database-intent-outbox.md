# Claim - task-browser-database-intent-outbox

- **Session ID:** 20260811-bdio
- **Harness:** codex
- **Claimed at:** 2026-08-11T02:38:01Z
- **ETA:** 2026-08-11T05:38:01Z
- **Scope:** Add a durable browser database write-intent outbox, deterministic adapter, IndexedDB adapter, admitted drain, and tab-close recovery coverage.
- **Durable target:** `src/Core.TypeScript/browser-node/` and the native Dark Hall browser database composition.
- **Platform mirror:** none

## Notes

Commands persist before execution and are drained in stable order under the
existing browser execution-admission port. Revision compare-and-swap and event
identity remain the final duplicate-effect fences; recovery uses no clock,
lease, or timeout.
