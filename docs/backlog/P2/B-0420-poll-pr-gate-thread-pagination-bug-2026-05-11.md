---
id: B-0420
priority: P2
status: open
title: "poll-pr-gate.ts thread pagination drift — >50 threads under-reported"
created: 2026-05-11
last_updated: 2026-05-11
depends_on: []
composes_with: []
type: friction-reducer
---

# B-0420 — poll-pr-gate.ts thread pagination

## What

`tools/github/poll-pr-gate.ts` reports `unresolvedThreads`
based on GraphQL pagination with `first: 50` (or similar
limit). For PRs with >50 threads, the count under-reports
because later-page threads aren't fetched.

Empirical case (2026-05-11): PR #2748 had 55 total threads.
Tool reported `unresolvedThreads: 5`, but a full `first: 100`
query showed only 3 actually unresolved. The discrepancy was
mixed up with cache effects.

## Why P2

Throughput-tax on heavily-reviewed PRs. The orchestrator
(Otto) wastes ticks chasing phantom unresolved threads.
Bounded scope; not blocking critical-path.

## Acceptance criteria

1. `poll-pr-gate.ts` paginates through ALL review threads
   (use cursor + `pageInfo.hasNextPage` loop)
2. `unresolvedThreads` reflects actual count regardless of
   total thread count
3. Test case: PR with >50 threads returns accurate count

## Out of scope

- Other GraphQL pagination in the tool (commits, etc.)
- Caching strategy for pagination requests

## Composes with

- The autonomous loop's step 1 (refresh worldview) depends on
  this tool returning accurate state

## Origin

Discovered 2026-05-11 while resolving threads on PR #2748.
The tool reported 5 unresolved; GraphQL with `first: 100`
showed only 3. The first 50 were all resolved; the missing
3 were on the second page.
