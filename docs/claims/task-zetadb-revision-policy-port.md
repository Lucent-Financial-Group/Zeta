# Claim - task-zetadb-revision-policy-port

- **Session ID:** codex/d3952758
- **Harness:** codex
- **Claimed at:** 2026-08-23T16:45:45Z
- **ETA:** 2026-08-23T20:00:00Z
- **Scope:** Replace the descriptive ZetaDB image revision tag with an owned policy port and preserve each adapter's atomic write semantics.
- **Durable target:** `src/Core.TypeScript/zetadb/`, `src/Core.TypeScript/browser-node/`, focused tests, workitem `081M0Q8TQYE087G0R001WBX1ZC`, and this claim.

## Notes

The browser checkpoint store remains monotone for its non-database callers. The policy boundary must not claim atomicity; adapters apply policy decisions inside their own storage transaction or local critical section.
