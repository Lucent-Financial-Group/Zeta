# Claim - task-browser-causal-peer-handoff

- **Session ID:** codex/20260817-bicrs
- **Harness:** OpenAI Codex
- **Claimed at:** 2026-08-17T19:47:03Z
- **ETA:** 2026-08-17T22:00:00Z
- **Scope:** Carry bounded browser causal-correction history through peer handoff and expose it in the Dark Hall browser readout.
- **Durable target:** `src/Core.TypeScript/browser-node/`, `src/Core.TypeScript/darkhall-ui/`, focused tests, and this claim.
- **Platform mirror:** GitHub pull request.

## Boundaries

- Peer messages carry canonical correction records rather than runtime state.
- Capacity exhaustion returns typed backpressure without forgetting retained history.
- Transport delivery remains forward-only and idempotent.
- The room-facing surface exposes a readout; transport records remain transport records.

## Exit

- A late peer can receive bounded causal history and reconstruct the same readout.
- Duplicate delivery is idempotent and conflicting identity is refused.
- Focused unit tests and the real Chromium multi-tab smoke remain green.
- The implementation is reviewed and merged into `origin/main`.
