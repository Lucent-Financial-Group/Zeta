---
id: 081M1K2CTS8087G0R0006YYB1Q
type: task
state: backlog
priority: P2
slug: specializationcache-pinned-the-sweep-of-six-unpinned-pairs-i
title: "SpecializationCache pinned — the sweep of six unpinned pairs is closed"
created: 2026-09-03T08:00:00.000Z
depends_on: []
composes_with: []
---

# `SpecializationCache` pinned — the sweep of six unpinned pairs is closed

## The sweep, finished

535 F# modules against 1411 TypeScript ones found **68 concepts implemented in both languages**, of
which **six had nothing checking they agree**:

| pair                  | outcome                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| `IoBoundary`          | treaty, 59 vectors — already agreed                                    |
| `SnapshotStore`       | treaty **plus** the missing durable store; runtime cross-language read |
| `RecoverableSpine`    | the durable delta log; recovery had been silently coming back short    |
| `IndexedZSet`         | **live defect** — group array built culturally, searched ordinally     |
| `ErasureCharge`       | **live divergence** — holes and observations in posting order          |
| `SpecializationCache` | this one — already agreed                                              |

**Three of the six treaties found something.** Two of those were silent data loss: an index lookup
returning empty for a key that was present, and a recovery path that restored a snapshot and dropped
every commit after it while reporting success.

## What the two `SpecializationCache` sides actually share

Less than the matching name suggests, and saying so is part of the treaty rather than a caveat on it:

- **F#** — `SpecializationCache<'TInput,'TOutput>(specializer)`, generic over any specializer. No IR,
  no Futamura projection, no mix. Just the caching discipline.
- **TypeScript** — the same discipline, **plus** `specialize(ir)` (the actual 1st Futamura projection
  over a mix IR) and a multi-IR registry. Neither has an F# counterpart.

So the treaty pins the **cache state machine** — the whole of the F# module, and the part of the
TypeScript one that claims to be the same idea. Pinning `specialize` would be pinning a
TypeScript-only feature against nothing: worse than leaving it unpinned, because it would _look_ like
cross-language coverage while checking one implementation against itself.

**Result: the two agreed, 3/3 green on the first run.** Seven scripted operation sequences, replayed
step by step — not just on final counters, because two implementations can reach the same totals by
different routes and the route is what is being pinned.

## What cannot be pinned, and how the flake was avoided

Garbage collection. Both sides hold the specialized function weakly, and whether a collection lands
between two calls is not observable, reproducible, or the same across runtimes. So there is no vector
for it: every script uses `invalidate()`, the deterministic door to the same code path.

That leaves a hazard in the **test** rather than the code. If the specialized function were reachable
only through the cache's weak reference, a collection mid-script would add a miss and the treaty would
flake intermittently. The specializer therefore returns **one function instance the test holds
strongly** for the whole script, so the weak reference cannot be cleared. Stated rather than left to
be rediscovered as a flaky CI run.

## A mutant that survived, and why it is not a gap

Deleting `cached <- None` from the error path — the line whose comment reads `NEVER cache errors` —
**changes nothing observable**, and the treaty stays green.

That reads like a hole and is not one. `Regenerate` is reachable from exactly two states:
`cached = None`, or `cached = Some wr` where `wr.TryGetTarget()` just returned false. The line moves
`Some(dead)` to `None`, and **both force a miss on the next call** — a dead weak reference cannot come
back alive. The assignment is defensive, not load-bearing, and no test can distinguish it.

The property itself still holds, enforced by **control flow**: nothing is stored until the specializer
_returns_, so a throwing specializer has nothing to leave behind. The same argument applies to
TypeScript's `cachedRef = null` in its catch block.

Recorded because a surviving mutant and an untested property are different things, and treating the
first as the second would send someone writing a vector for a state the design forbids.

## The mutants that are observable are killed

| mutant                              | result                                |
| ----------------------------------- | ------------------------------------- |
| `Invalidate()` made a no-op         | **killed**                            |
| a hit that forgets to count itself  | **killed** (2 tests)                  |
| error path stops clearing the cache | survived — unobservable, argued above |

## Falsifiers

```
bun src/Core.TypeScript/algebra/generate-specialization-cache-treaty-transcript.ts   # 7 scripts
dotnet test tests/Tests.FSharp --filter FullyQualifiedName~SpecializationCacheTreaty # 3 passed
```
