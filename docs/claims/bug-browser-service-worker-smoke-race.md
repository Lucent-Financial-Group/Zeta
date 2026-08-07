# Claim - bug-browser-service-worker-smoke-race

- **Session ID:** codex/20260807-bswsr
- **Harness:** codex
- **Claimed at:** 2026-08-07T20:45:58Z
- **ETA:** 2026-08-07T22:00:00Z
- **Scope:** Remove concurrent service-worker activation from the real Chromium room measurement.
- **Durable target:** `src/Core.TypeScript/browser-node/browser-multitab-smoke.ts` and a pull request to `main`
- **Platform mirror:** none

## Notes

Install and claim the service worker on a bootstrap page before opening the two controlled room pages. Do not hide the race with assertion retries.
