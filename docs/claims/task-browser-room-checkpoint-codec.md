# Claim - task-browser-room-checkpoint-codec

- **Session ID:** codex/db00de1f
- **Harness:** codex
- **Claimed at:** 2026-08-02T16:59:00Z
- **ETA:** 2026-08-02T20:00:00Z
- **Scope:** Add a bounded versioned room-transcript checkpoint codec and prove browser restart recovery without persisting tab presence.
- **Durable target:** `src/Core.TypeScript/browser-node/` and a pull request to `main`
- **Platform mirror:** none

## Notes

This composes with the existing opaque-byte IndexedDB port. It does not change
the Iris UI, the vault-state emitter, or browser tab coordination policy.
