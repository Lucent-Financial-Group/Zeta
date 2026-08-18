# Claim - task-browser-causal-handoff-ui

- **Session ID:** codex/20260818-bchui
- **Harness:** OpenAI Codex
- **Claimed at:** 2026-08-18T18:17:01Z
- **ETA:** 2026-08-18T20:17:01Z
- **Scope:** Project the existing bounded causal peer-handoff readout into the Dark Hall room and LLMTV HTML/CSS surfaces, including a real Chromium sender/receiver proof. Do not add a second transport or acknowledgement protocol.
- **Durable target:** `src/Core.TypeScript/darkhall-ui/`, `src/Core.TypeScript/browser-node/browser-room-checkpoint.ts`, and the existing multi-tab Chromium smoke.
- **Platform mirror:** none (git-native claim)

## Notes

The transport and durable readout landed in PR #11636. This slice keeps the handoff projection non-durable, triggers presentation updates for outbound offers, and gives CSS a typed state surface for idle, offered, received, duplicate, backpressure, and heat outcomes.
