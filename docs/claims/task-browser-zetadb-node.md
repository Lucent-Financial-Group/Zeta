# Claim - task-browser-zetadb-node

- **Session ID:** codex/20260809-bzdb
- **Harness:** codex
- **Claimed at:** 2026-08-09T16:58:39Z
- **ETA:** 2026-08-09T21:00:00Z
- **Scope:** Add the event-driven browser ZetaDB node contract, browser durability and worker adapters, a bounded scheduled node, and an initial WASM plugin boundary.
- **Durable target:** `src/Core.TypeScript/zetadb/`, `src/Core.TypeScript/browser-node/`, `.github/workflows/`, `docs/DECISIONS/`, focused tests, and PR
- **Platform mirror:** GitHub pull request

## Notes

- Every tab, service-worker event, local process, cloud process, and scheduled Action is a temporary executor over the same durable log and checkpoint contract.
- The database does not depend on a continuously resident worker.
- LLMTV discovery and the open realtime WebSocket transport lane are outside this claim.
