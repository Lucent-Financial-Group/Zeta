# Claim - task-browser-database-execution-receipts

- **Session ID:** 20260811-bder
- **Harness:** codex
- **Claimed at:** 2026-08-11T04:20:00Z
- **ETA:** 2026-08-11T08:20:00Z
- **Scope:** Replace silent browser intent deletion with a durable queued/executing/settled execution-receipt transition, bounded readout, native IndexedDB persistence, active-page attributes, and peer receipt summaries.
- **Durable target:** `src/Core.TypeScript/browser-node/`, the native Dark Hall browser composition, and the existing browser peer-message contract.
- **Platform mirror:** none

## Notes

The database remains authoritative for row state. Receipts record finite
execution evidence and never carry database bytes. Retention is explicit and
bounded; capacity returns typed backpressure instead of erasing history.
