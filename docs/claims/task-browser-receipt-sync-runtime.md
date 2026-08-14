# Claim - task-browser-receipt-sync-runtime

- **Session ID:** codex/0814-c91a
- **Harness:** codex
- **Claimed at:** 2026-08-14T04:12:18Z
- **ETA:** progress signal or release by 2026-08-14T08:12:18Z
- **Scope:** Compose explicit human receipt proposal submission and background-safe accepted-record polling behind one source-owned browser runtime.
- **Durable target:** `src/Core.TypeScript/browser-node/`
- **Platform mirror:** none

## Notes

`submit` may spend injected signing authority and must be invoked explicitly.
`poll` may read acceptance evidence and compact acknowledged receipts, but it
must never call the signer or proposal carrier.
