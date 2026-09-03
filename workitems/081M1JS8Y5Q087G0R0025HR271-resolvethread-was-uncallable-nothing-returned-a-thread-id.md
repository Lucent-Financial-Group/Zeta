---
id: 081M1JS8Y5Q087G0R0025HR271
type: bug
state: backlog
priority: P1
slug: resolvethread-was-uncallable-nothing-returned-a-thread-id
title: "resolveThread was uncallable — nothing returned a thread id"
created: 2026-09-03T05:50:00.000Z
depends_on: []
composes_with: []
---

# `resolveThread` was uncallable — nothing returned a thread id

`ForgeHost.resolveThread(threadId, body)` has been on the port since it was written. **No method on
the port ever returned a thread id**, so it could not be called. `getPrGateState` reported
`unresolvedThreads: 3` — a count you can be blocked by and cannot act on.

That became load-bearing when the merge receipt started blocking on unresolved threads: the loop
gained a wall with no door. This is the door.

## What changed

- **`ReviewThread`** — `{ id, isResolved, isOutdated, path?, line?, firstComment? }`.
- The `reviewThreads` selection asks for what an answer needs: the id, the outdated flag, the path
  and line, and the first comment's author and body. It previously asked only for `isResolved`.
- **`PrGateState.threads`** carries them, so the receipt says *which* threads, not just how many.
- The merge refusal **quotes the reviewer**: `lior: "this retry has no bound" (do-item.ts:42)`.
  A count is a wall; a quote is a task.

## The fail-open I wrote and an existing test caught

My first version derived `unresolvedThreads` from the parsed thread list, and called that "one
source of truth". It is a fail-open: a thread the parser could not identify would have **reduced the
blocker count** — a merge permitted because a field was missing. The existing
`unresolved review thread → resolve-threads` test went red immediately.

The correct split is two questions, not one:

| question | source |
|---|---|
| **what BLOCKS** | every unresolved node in the raw response, id or no id |
| **what can be ANSWERED** | the subset carrying an id, because `resolveThread` takes nothing else |

When they differ, a `warning` says so out loud — *"N unresolved review thread(s) carry no id and
cannot be answered from here — they still block"* — rather than leaving it as a silent difference
between two numbers.

## Verified live

PR #16419 (a real PR with a real review thread):

```
PR #16419: unresolved=0  threads carried=1
  resolved id=PRRT_kwDOSF9kNM6…  src/Core.TypeScript/cluster/argocd-health-test.ts
           github-advanced-security: ## CodeQL / Incomplete URL substring sanitization
```

The id — the thing `resolveThread` needs and could never obtain — now arrives, with the path and the
reviewer's words.

## Two vacuous assertions the mutation matrix found in my own tests

- `expect(MERGE_OBSERVE_QUERY).toContain("id")` is satisfied by `mergeCommit { oid }`. A mutant
  deleting the thread id **survived**. Now scoped to the `reviewThreads` block and asserting a
  *standalone* `id` field.
- Every fixture set `isResolved` explicitly, so `=== true` and `!== false` never differed. A mutant
  swapping them **survived** — and the difference is exactly "an absent field reads as *already
  handled*". Now pinned by a thread that omits the flag.

## Falsifiers

```
bun test src/Core.TypeScript/forge-host/github/github-merge-observe.test.ts \
         src/Core.TypeScript/observe/merge-receipt.test.ts    # 41 pass
bun test src/Core.TypeScript/forge-host/ src/Core.TypeScript/observe/   # 1984 pass
bun src/Core.TypeScript/lint/lint-typescript.ts               # exit 0
```

Mutation matrix: **12/12 killed**. The 10 remaining suite failures are the pre-existing Windows-only
baseline (7 in `observe/`, 3 in `forge-host/`).

## Still open

The loop can now *see* what a reviewer asked and *identify* the thread. It cannot yet **pick**
answering a review as an action — that needs a `review-pr-N` item alongside the existing
`merge-pr-N`. And `createPullRequest` still has no caller, so the loop never opens a PR at all.
