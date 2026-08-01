# Claim - task-browser-indexeddb-checkpoint

- **Session ID:** db00de1f
- **Harness:** codex
- **Claimed at:** 2026-08-01T23:04:29Z
- **ETA:** 2026-08-02T03:00:00Z
- **Scope:** Add an injected browser checkpoint port with a native IndexedDB adapter and real-page recovery proof.
- **Durable target:** `src/Core.TypeScript/browser-node/` and a pull request to `main`

## Notes

Composes after the real two-page continuity proof in #9935. The adapter remains
outside the pure browser-node planner and does not modify the Iris renderer.
