---
id: 081M1JTSPZN087G0R000P5G932
type: task
state: backlog
priority: P2
slug: the-corporate-sink-the-declared-half-of-the-sink-du-that-was
title: "The corporate sink — the declared half of the sink DU that was never built"
created: 2026-09-03T07:00:00.000Z
depends_on: []
composes_with: []
---

# The corporate sink — the declared half of the sink DU that was never built

`EventSink`'s own contract names two transports:

> *"Appends one event to the append-only, ZetaId-keyed event log via whichever transport is wired
> (sovereign folder-direct-to-main / **corporate batched**)."*

Only `folderSink` existed. Every lane pushed straight to `main` — so the harness's
`plan → execute → review → push` sequence had **no push stage anyone could review**, because the
push had already happened by the time there was anything to look at.

| lane | shape |
|---|---|
| sovereign | `append → commit → push to main`. One event, one push. No review. |
| **corporate** | `append → stage`. `flush → branch → PR`. A batch, proposed, reviewable. |

## It cannot push to main, and that is structural

The sink never touches local git and never writes `main`. It builds the branch through the forge's
git-data API — blob, tree, commit, ref — and the ref it writes is **refused** unless it is under the
configured prefix and different from the base. A configuration that could aim it at `main` is
rejected at flush time rather than trusted not to occur.

`branchIsProposable` is exported so the safety property can be exercised directly. A guard reachable
only through the happy path is a guard with one test — and a mutant removing the **flush-time call**
survived until a test drove a minter that produces `../main`.

## Seven `ForgeHost` methods get their first consumer

`getRef`, `getCommit`, `createBlob`, `createTree`, `createCommit`, `createRef`, and
`createPullRequest` — the last of which had **zero callers**, which is why the loop had never opened
a pull request in its life.

`createRef` is new on the port: `updateRef` **cannot create**. GitHub creates refs with
`POST /git/refs` and updates them with `PATCH /git/refs/{ref}`, so `updateRef` on a ref that does not
exist is a 404. Without it there is no way to make a branch and therefore no way to open a PR.
GitLab stubs it `not-supported`, as it does its other unimplemented methods.

## What batching costs, stated rather than hidden

`append` returns as soon as the event is durable **in memory** and is **not** yet on the forge. That
is a real weakening against the sovereign sink, where `append` returning means the event is
committed: a crash between append and flush loses the batch. The caller is the one who can decide
whether that trade is acceptable, and it cannot decide about a property it was not told.

**A failed flush keeps the batch.** Events stay pending and the next flush retries them, reusing the
same branch (the name derives from the first event's id, not the clock). Dropping them would turn a
transient forge failure into silent data loss.

And a **failed auto-flush reports the append as not durable** — "your event is durable" would be a
stronger claim than the truth.

## Wiring

`ZETA_SINK_MODE=corporate` opts in; **sovereign stays the default**, deliberately — it is the lane
this repo runs on, and switching it silently would change where every tick lands. The loop flushes at
end of tick, because a tick is the unit a reviewer reads and *a batch nobody flushes is a batch
nobody proposed*.

## Falsifiers

```
bun test src/Core.TypeScript/observe/event-sink-corporate.test.ts     # 27 pass
bun test src/Core.TypeScript/observe/ src/Core.TypeScript/forge-host/ # 2037 pass
bun src/Core.TypeScript/lint/lint-typescript.ts                       # exit 0
```

Mutation matrix: **14/14 killed**. Two survived first and are worth naming:

- **the flush-time branch guard was never consulted** — with a well-behaved minter the derived
  branch always passes, so the happy path never exercised the check;
- **the tree built without its base tree** — `createTree(entries)` with no `base_tree` produces a
  tree containing only those entries, so the commit **deletes every other file in the branch.** The
  fake ignored its arguments, so this was invisible in the happy path and catastrophic in life.

The 10 remaining suite failures are the pre-existing Windows-only baseline.
