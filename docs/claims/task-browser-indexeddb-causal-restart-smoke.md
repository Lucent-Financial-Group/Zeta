# Claim - task-browser-indexeddb-causal-restart-smoke

- **Session ID:** codex/20260817-bicrs
- **Harness:** codex
- **Claimed at:** 2026-08-17T16:01:55Z
- **ETA:** 2026-08-17T18:01:55Z
- **Scope:** Prove bounded causal-correction recovery through real Chromium and native IndexedDB after every browser page closes.
- **Durable target:** `src/Core.TypeScript/browser-node/browser-multitab-fixture.ts`, `src/Core.TypeScript/browser-node/browser-multitab-smoke.ts`, focused tests, and this claim.
- **Platform mirror:** GitHub pull request.

## Notes

The existing real-browser smoke proves native IndexedDB room-checkpoint recovery. This slice extends the same harness to persist one causal correction, drain its independent write queue, close every page, and verify exact recovery after a fresh page starts.
