# Claim - task-browser-signed-outbox

- **Session ID:** codex/0814-7f2c
- **Harness:** codex
- **Claimed at:** 2026-08-14T00:44:17Z
- **ETA:** progress signal or release by 2026-08-14T04:45:00Z
- **Scope:** Reconcile the browser outbox with the passkey-signed proposal verifier and credential-free Action drain.
- **Durable target:** `src/Core.TypeScript/browser-node/`, `src/Core.TypeScript/planning/`, and the gated-commit workflow
- **Platform mirror:** none

## Notes

Follow the existing Ace trust-root and anti-rollback pattern, preserve an
injected sink boundary, and keep repository credentials out of browser code.
