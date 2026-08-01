# Claim - task-browser-node-capability-ladder

- **Session ID:** C8080DA4-7596-471B-B545-BA07C600D139
- **Harness:** codex
- **Claimed at:** 2026-08-01T02:12:38Z
- **ETA:** 2026-08-01T03:15:00Z
- **Scope:** Add a pure browser-node capability and liveness contract, plus the unowned Rust formatting fix required to restore the inherited quick gate.
- **Durable target:** `src/Core.TypeScript/browser-node/`
- **Platform mirror:** GitHub PR pending

## Notes

Extends the decided browser-tab node model and the LLMTV root-site trajectory without changing the discovery transport implementations.

PR #9817 already owns the inherited markdown and TypeScript gate failures. The Rust keyring formatting failure is unowned and is included as a separate fix-forward commit.

Initial intended path set:

- `src/Core.TypeScript/browser-node/`
- `src/Core.Rust.DynamicValue/tests/keyring_4x4_cross_verify.rs`
- `docs/claims/task-browser-node-capability-ladder.md`
