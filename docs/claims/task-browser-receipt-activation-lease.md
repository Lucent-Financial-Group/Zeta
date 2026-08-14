# Claim - task-browser-receipt-activation-lease

- **Session ID:** codex/20260814-activation
- **Harness:** codex
- **Claimed at:** 2026-08-14T05:35:18Z
- **ETA:** 2026-08-14T07:00:00Z
- **Scope:** Preserve browser user activation across asynchronous receipt preparation and passkey signing with a single-use presentation lease.
- **Durable target:** `src/Core.TypeScript/browser-node/`, focused tests, and this claim.
- **Platform mirror:** GitHub pull request.

## Notes

The native GitHub issue carrier currently opens its window only after archive
reading and passkey signing. Browsers may consume transient user activation
before that asynchronous work completes, so the carrier needs a synchronous,
bounded reservation that is closed on every non-presentation path.
