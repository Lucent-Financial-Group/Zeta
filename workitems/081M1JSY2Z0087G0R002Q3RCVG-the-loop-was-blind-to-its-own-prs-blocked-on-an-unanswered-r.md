---
id: 081M1JSY2Z0087G0R002Q3RCVG
type: bug
state: backlog
priority: P1
slug: the-loop-was-blind-to-its-own-prs-blocked-on-an-unanswered-r
title: "The loop was blind to its own PRs blocked on an unanswered review"
created: 2026-09-03T06:20:00.000Z
depends_on: []
composes_with: []
---

# The loop was blind to its own PRs blocked on an unanswered review

`observe()` acted on **clean** PRs (`merge-pr-N`) and on backlog items. A PR of its own, open and
blocked because a reviewer asked for changes, was **the one kind of work it could never pick up**:
absent from the oracle's lead, absent from the menu, and — since the merge receipt began blocking on
unresolved threads — a wall it would sit behind indefinitely.

`review-pr-N` is the symmetric twin of `merge-pr-N`: a synthetic item the **forge** produced rather
than the backlog.

## Cost: one field already in the same call

`listOpenPullRequests` has always returned `reviewDecision`. `PRInfo` dropped it. Carrying it costs
no extra round trip, and `readPRStateAsync` now classifies `changesRequested` alongside `clean`.

## Ordering, and why

```
backlog work  >  merge work  >  review work  >  decompose  >  free modes
```

A clean PR is one action from landing; a review is a conversation. Finishing what is nearly done
before starting what is not is the cheaper order. All of it stays **offered, never forced** — the
chooser may take a free mode instead (NCI).

## Three fail-opens avoided

- **An absent list is not an empty one.** `changesRequestedPrNumbers` is optional, and absent means
  *not measured*, not *none* — the same "I failed to look equals there is nothing" collapse
  `readPRStateAsync` already refuses.
- **A forge item has no backlog file**, so a room's `backlogIds` can never contain one. Scoping it by
  backlog membership made the loop refuse the very work it had just offered itself.
  `isSyntheticForgeItem` fixes it; `isMergeItem` stays separate, because **merging is a distinct
  authority and answering a review is ordinary work.**
- **A malformed id yields `null`, not `NaN`.** `forgePrNumber("review-pr-abc")` must not produce a
  number-shaped nothing that flows into an API call.

## The line this does NOT cross

`review-work.ts` builds a **prompt**. It does not resolve threads.

`resolveThread` replies and marks the conversation settled — an assertion that the concern was
addressed. An agent that resolves on the strength of having *read* the comment is laundering: the
thread goes quiet, the gate opens, and nothing was answered. So resolution stays downstream of
evidence (a pushed change the reviewer can see), and the prohibition is stated **in the prompt the
agent reads**, not only in the module header — a boundary the executing agent never sees is one that
depends on it already knowing.

Outdated threads are **marked, never dropped**: the diff moved, the concern did not, and omitting
them would turn *"the code changed"* into *"the reviewer was answered"*.

And the executor **refuses rather than guesses**: no forge reader, or a failed read, means the
review cannot be seen — and answering a review you cannot see is inventing one.

## Verified live

```
[forge:github] 2 open PRs, 0 clean, 0 awaiting a review answer
  #16444 mergeState=blocked reviewDecision=(none)
  #16410 mergeState=dirty   reviewDecision=(none)
```

The field flows end to end and classifies correctly (nobody has requested changes on these).
**Honest limit:** a `changes_requested` PR could not be manufactured without asking a human to
review, so the *classification* is covered by unit tests and the *plumbing* by this live read.

## Falsifiers

```
bun test src/Core.TypeScript/observe/review-work.test.ts                # 16 pass
bun test src/Core.TypeScript/observe/ src/Core.TypeScript/forge-host/   # 2010 pass
bun src/Core.TypeScript/lint/lint-typescript.ts                         # exit 0
```

Mutation matrix: **13/13 killed** — review work never offered, an absent list read as a PR number,
review items acquiring merge authority, the room refusing its own forge work, the reviewer's words
dropped from the prompt, the resolve prohibition removed, outdated markers dropped, and
unidentifiable threads silently omitted.

One mutant was a no-op I wrote (`void 0` after an assignment reorders nothing) and reported itself as
a survivor. Replaced with one that actually mutates the ordering.

## Still open

`createPullRequest` still has no caller — the loop answers reviews and merges PRs, and never opens
one. The sink is folder-direct-to-main.
