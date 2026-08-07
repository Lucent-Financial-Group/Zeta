# Claim - task-browser-checkpoint-invalidation

- **Session ID:** codex/20260807-bcpi
- **Harness:** codex
- **Claimed at:** 2026-08-07T18:57:59Z
- **ETA:** 2026-08-07T22:00:00Z
- **Scope:** Add authoritative cross-tab checkpoint invalidation for the browser room runtime.
- **Durable target:** src/Core.TypeScript/browser-node/ and src/Core.TypeScript/darkhall-ui/
- **Platform mirror:** none

## Notes

Broadcast only versioned storage-change evidence. Receiving tabs must reread the injected checkpoint store before updating their local projection.
