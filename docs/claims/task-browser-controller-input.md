# Claim - task-browser-controller-input

- **Session ID:** codex-20260810-bci
- **Harness:** OpenAI Codex - Vera (GPT-5.5 max)
- **Claimed at:** 2026-08-10T06:28:36Z
- **ETA:** 2026-08-10T08:30:00Z
- **Scope:** Bind browser pointer and keyboard gestures to semantic Dark Hall database controller commands through a bounded source-owned input adapter.
- **Durable target:** `src/Core.TypeScript/darkhall-ui/`, focused browser tests, the real Chromium PWA smoke, and this claim.
- **Platform mirror:** GitHub pull request.

## Evidence

- The active browser page exposes `dispatchController`, but no browser event currently reaches it.
- Controller cells render stable 0-15 positions, while the page correctly keeps signed-delta construction behind the controller boundary.

## Exit

- Pointer activation and keyboard cell addressing route through the semantic controller command interface.
- Editable fields and unrelated browser shortcuts are not intercepted.
- Concurrent gestures receive bounded typed backpressure, and stop removes every installed listener.
- Focused unit tests and the real Chromium PWA smoke remain green.

