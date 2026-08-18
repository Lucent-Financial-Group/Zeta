# Claim - task-browser-causal-handoff-ack

- **Session ID:** codex/20260818-bchack
- **Harness:** OpenAI Codex
- **Claimed at:** 2026-08-18T20:15:00Z
- **ETA:** 2026-08-18T22:15:00Z
- **Scope:** Add a bounded receiver acknowledgement to the existing browser causal-correction replay so a sender can distinguish an offer from observed admission, duplication, backpressure, or heat. Keep the acknowledgement transient and do not add a second transport.
- **Durable target:** `src/Core.TypeScript/browser-node/browser-tab-coordinator.ts`, `src/Core.TypeScript/darkhall-ui/darkhall-browser-durable-runtime.ts`, the Dark Hall readout projection, and focused multi-tab tests.
- **Platform mirror:** none (git-native claim)

## Notes

PR #12045 made offered and received handoff state visible. This slice closes the one-way evidence gap with an opaque per-offer identity and a finite reverse acknowledgement. Room checkpoints continue to reject all causal handoff projection fields.
