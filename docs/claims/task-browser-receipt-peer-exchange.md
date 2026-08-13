# Claim - task-browser-receipt-peer-exchange

- **Session ID:** codex/20260813-brpe
- **Harness:** codex
- **Claimed at:** 2026-08-13T16:56:32Z
- **ETA:** 2026-08-13T20:30:00Z
- **Scope:** Exchange immutable browser receipt batches between addressed peers through an injected bounded transport and persist them through the existing ZetaDB handoff port.
- **Durable target:** `src/Core.TypeScript/browser-node/`, focused tests, and a pull request
- **Platform mirror:** pending pull request

## Notes

The browser-node layer owns request and acknowledgement semantics. Discovery and physical Reticulum adapters remain outside this claim.
