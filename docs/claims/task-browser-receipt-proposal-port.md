# Claim - task-browser-receipt-proposal-port

- **Session ID:** codex/0814-7f2c
- **Harness:** codex
- **Claimed at:** 2026-08-14T01:28:54Z
- **ETA:** progress signal or release by 2026-08-14T05:28:54Z
- **Scope:** Connect canonical browser receipt handoff batches to passkey-signed, credential-free proposal transport.
- **Durable target:** `src/Core.TypeScript/browser-node/` and browser-node exports
- **Platform mirror:** none

## Notes

Reuse the existing receipt-handoff port and proposal envelope. The adapter owns
deterministic patch construction only; signing and external transport remain
injected capabilities, and an acknowledgement is never fabricated before the
accepted repository receipt exists.
