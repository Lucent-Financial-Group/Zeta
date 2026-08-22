# Claim - task-zetadb-concurrent-journal

- **Session ID:** codex-20260822-zetadb-concurrent-journal
- **Harness:** OpenAI Codex - Vera (GPT-5.5)
- **Claimed at:** 2026-08-22T20:24:39Z
- **ETA:** 2026-08-22T23:30:00Z
- **Scope:** Add a bounded ZetaDB convergence operation and prove two cells racing disjoint batches against one durable image retain both effects.
- **Durable target:** `src/Core.TypeScript/zetadb/`, focused browser-node tests, and work item `081KZM0FTJM08QG0R002675YBK`.
- **Platform mirror:** GitHub pull request.

## Boundaries

- A single `runZetaDbNodeTick` remains one finite attempt.
- Revision conflict remains typed backpressure; bounded convergence is explicit composition above the one-attempt kernel.
- No distributed lock and no last-writer-wins overwrite are introduced.
- The final durable image must retain both disjoint batches independent of which save wins first.

## Exit

- A deterministic test races two cells against one shared durable image.
- Both calls complete through bounded retry and the final canonical image contains both effects.
- Exhausted retry budget remains typed backpressure.
- Focused ZetaDB and browser-node tests, TypeScript lint, and repository gates pass.
- The claim file is removed in the implementation PR before merge.
