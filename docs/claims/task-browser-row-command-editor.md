# Claim - task-browser-row-command-editor

- **Session ID:** codex-20260810-brce
- **Harness:** codex
- **Claimed at:** 2026-08-10T15:47:47Z
- **ETA:** 2026-08-10T19:00:00Z
- **Scope:** Add a source-owned browser row command editor that supplies explicit data to the existing bounded controller input path.
- **Durable target:** `src/Core.TypeScript/darkhall-ui/`, focused browser-node smoke coverage, tests, and a pull request.
- **Platform mirror:** pending pull request

## Notes

The editor owns row-key, payload, and signed-operation selection. The DOM adapter does not construct database deltas, and IndexedDB remains behind the existing browser ZetaDB ports.
