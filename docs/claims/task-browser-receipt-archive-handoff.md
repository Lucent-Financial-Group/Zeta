# Claim - task-browser-receipt-archive-handoff

- **Session ID:** codex/0813-brah
- **Harness:** codex
- **Claimed at:** 2026-08-13T14:11:12Z
- **ETA:** 2026-08-13T18:30:00Z
- **Scope:** Add bounded exact-acknowledgement handoff for browser database receipt archives and expose its pressure in the Dark Hall readout.
- **Durable target:** `src/Core.TypeScript/browser-node/`, `src/Core.TypeScript/darkhall-ui/`, and a pull request
- **Platform mirror:** none

## Notes

The handoff remains hexagonal: Git, Reticulum, peer ZetaDB, and other durable
transports implement an injected port. Local archive rows remain intact under
typed backpressure and retract only after an exact downstream acknowledgement.
