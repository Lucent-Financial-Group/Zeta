# Claim - task-browser-durable-room-runtime

- **Session ID:** codex/8f2a61c4
- **Harness:** OpenAI Codex - Vera (GPT-5.5 max)
- **Claimed at:** 2026-08-02T19:36:46Z
- **ETA:** 2026-08-02T21:00:00Z
- **Scope:** Extract durable Dark Hall room recovery and checkpoint composition from the browser smoke fixture into a reusable source runtime.
- **Durable target:** `src/Core.TypeScript/darkhall-ui/`, the browser multitab fixture, focused tests, and this claim.
- **Platform mirror:** GitHub pull request.

## Evidence

- `browser-multitab-fixture.ts` directly opens IndexedDB, decodes a room transcript, starts the browser host, saves revisions, retracts checkpoints, and coordinates cleanup.
- The underlying checkpoint port, room codec, and browser lifecycle host are source-owned, but their composition is not reusable outside that test fixture.

## Exit

- A source-owned runtime exposes start, recover, read, checkpoint, retract, and stop operations through typed results.
- The fixture delegates to the runtime instead of owning persistence policy.
- Focused unit tests and the real Chromium multitab smoke remain green.
