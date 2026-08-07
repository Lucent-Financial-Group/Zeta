# Claim - task-browser-service-worker-checkpoint-relay

- **Session ID:** codex/20260807-bswcr
- **Harness:** codex
- **Claimed at:** 2026-08-07T19:57:31Z
- **ETA:** 2026-08-07T22:00:00Z
- **Scope:** Add a typed service-worker relay for storage-authoritative browser checkpoint invalidations.
- **Durable target:** `src/Core.TypeScript/browser-node/` and a pull request to `main`
- **Platform mirror:** none

## Notes

Messages carry invalidation evidence only. Each page must reread its injected checkpoint port; the worker is not durable truth and background execution is best-effort.
