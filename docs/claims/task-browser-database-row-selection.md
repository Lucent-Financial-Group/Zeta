# Claim - task-browser-database-row-selection

- **Session ID:** codex-20260810-bdrs
- **Harness:** codex
- **Claimed at:** 2026-08-10T17:57:32Z
- **ETA:** 2026-08-10T21:00:00Z
- **Scope:** Let a materialized browser database row preload the source-owned row-command editor without bypassing controller or database ports.
- **Durable target:** `src/Core.TypeScript/darkhall-ui/` and browser PWA tests
- **Platform mirror:** pending pull request

## Notes

The selection gesture carries row identity only. Typed database readout resolves
the selected row, and emit/retract remain explicit universal controller actions.
