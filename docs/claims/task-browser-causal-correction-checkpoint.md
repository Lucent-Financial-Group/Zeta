# Claim - task-browser-causal-correction-checkpoint

- **Session ID:** codex/20260817-bccc
- **Harness:** codex
- **Claimed at:** 2026-08-17T14:56:00Z
- **ETA:** 2026-08-17T17:56:00Z
- **Scope:** Persist the bounded browser causal-correction ledger across a complete tab shutdown and later reopen without silent truncation.
- **Durable target:** `src/Core.TypeScript/browser-node/`, `src/Core.TypeScript/darkhall-ui/`, focused tests, and this claim.
- **Platform mirror:** GitHub pull request.

## Notes

The previous slice replays bounded corrections while at least one peer tab remains alive. This slice uses the owned browser checkpoint port for the all-tabs-closed boundary and preserves typed backpressure when configured capacity cannot admit recovered history.
