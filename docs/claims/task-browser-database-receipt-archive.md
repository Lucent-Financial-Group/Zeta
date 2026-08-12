# Claim - task-browser-database-receipt-archive

- **Session ID:** 20260812-bdra
- **Harness:** codex
- **Claimed at:** 2026-08-12T03:33:19Z
- **ETA:** 2026-08-12T07:33:19Z
- **Scope:** Archive settled browser database execution receipts through an injected source-owned port with a ZetaDB adapter, acknowledge exact archived receipts before reclaiming local capacity, replay retained receipts after interruption, and expose typed archive backpressure through the existing browser readout boundary.
- **Durable target:** `src/Core.TypeScript/browser-node/`, the native Dark Hall browser composition, and focused browser recovery tests.
- **Platform mirror:** none

## Notes

The row database remains authoritative for application state. Receipt archival
uses deterministic ZetaDB event identities so replay is idempotent. A local
receipt is removed only after the archive port returns matching persistence
evidence; failed or unavailable archival retains the receipt and reports typed
backpressure instead of erasing history.
