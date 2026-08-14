# Claim - task-browser-receipt-sync-ui

- **Session ID:** codex/0814-briu
- **Harness:** codex
- **Claimed at:** 2026-08-14T04:56:07Z
- **ETA:** 2026-08-14T07:00:00Z
- **Scope:** Connect explicit receipt proposal submission and background-safe acceptance polling to the active Dark Hall browser page.
- **Durable target:** `src/Core.TypeScript/darkhall-ui/darkhall-browser-page.ts` and focused tests
- **Platform mirror:** pending pull request

## Notes

Builds on the accepted receipt proposal synchronization runtime from PR #10530. The page must never reach the passkey signer from an automatic lifecycle callback.
