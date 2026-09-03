---
id: 081M1K01377087G0R00111NV7Y
type: bug
state: backlog
priority: P1
slug: indexedzset-built-its-group-array-culturally-and-searched-it
title: "IndexedZSet built its group array culturally and searched it ordinally"
created: 2026-09-03T06:52:00.000Z
depends_on: []
composes_with: []
---

# `IndexedZSet` built its group array culturally and searched it ordinally

## The defect

`IndexedZSet.indexWith` sorted its key array with a bare `keysSpan.Sort<'K>()`. That resolves to
`Comparer<'K>.Default`, which for `string` is **culture-sensitive**. Every consumer of that array
assumes **ordinal** order:

| consumer                                        | comparator                                |
| ----------------------------------------------- | ----------------------------------------- |
| the `Item` indexer (binary search)              | `KeyComparerCache<'K>.Instance` — ordinal |
| `(+)`, and therefore `add` / `sub` (merge-join) | `KeyComparerCache<'K>.Instance` — ordinal |
| `join` (merge-join)                             | `Collation.forKey<'K> ()` — ordinal       |

So this is **not** "the output came out in a surprising order". A binary search over an array sorted
by a different comparator has lost its invariant, and a merge-join over two such arrays walks past
matches. Concretely, measured:

- `idx.["A"]` returns an **empty Z-set for a key that is present** — indistinguishable from absent.
- `join` over `{A,B,a,b}` and `{B,a}` **loses the `B` pairing** entirely: the ordinal walk advances
  the wrong side and exhausts one array with a match unmade.
- `add` returns a group holding one value where it should hold two.

Every one of those is silent. Nothing throws, nothing warns, and the result is a plausible-looking
index that is missing rows.

## Why it survived

`join`'s own comment cites workitem `081KT07NV0008QG0R001YDB73K` — the culture-sensitive-comparison
fix. **That fix reached every consumer and missed the producer.** So the module read as thoroughly
hardened against exactly this bug while the array feeding all of it was still built wrong. Reviewing
the consumers, which is where the citation points, could never have found it.

## How it was found

By the `IndexedZSet` cross-language treaty, on its first run. TypeScript ordered the case-mixed keys
`A, B, a, b`; F# returned `a, A, b, B`. Six treaty assertions went red at once.

That is the treaty doing the job it exists for. The other treaties landed green on the first run and
converted _"they agree today"_ into a statement that stays true. This one **found a live defect in
the DBSP core** — and the discriminating input is a vector nobody would have hand-written, because
the module already carried a comment saying this class of bug had been fixed.

## The fix

```fsharp
keysSpan.Sort<'K, IComparer<'K>>(Collation.forKey<'K> ())
```

`Collation.forKey` rather than `KeyComparerCache` because `indexWith` is `inline` and may only touch
public surface — the same reason `join` resolves it that way.

## Falsifiers

Both packs go red with the bare `Sort()` restored, and green with the fix:

```
dotnet test tests/Tests.FSharp --filter FullyQualifiedName~IndexedZSet   # 30 passed
dotnet test Zeta.sln -c Release                                          # 7153 passed
```

`IndexedZSetCollation.Tests.fs` is deliberately separate from the treaty: a transcript can be
regenerated, and a named regression cannot be regenerated away. All five of its tests discriminate —
verified by restoring the defect, not assumed.

**One of them did not, at first.** `join pairs every matching key` originally used `{A, a}` as the
right side and **passed under the restored defect** — both arrays happened to hold their keys in the
same relative order, so the merge walked them in step and matched anyway. A regression test that a
restored defect does not fail is not a regression test. It now uses `{B, a}`, which desyncs the walk.

## The full suite is the assertion that matters

The fix **changes observable ordering** for every case-mixed string key in the system, so a green
`IndexedZSet` suite would not have been enough. `dotnet test Zeta.sln -c Release` passes **7,153
tests**: nothing anywhere depended on the culture-sensitive order.

## Honest limit

Whether `Comparer<string>.Default` differs from ordinal depends on the host's globalization mode;
under `InvariantGlobalization` the two can coincide and the bug is invisible. `src/Core/Core.fsproj`
sets that flag, but it takes effect from the **entry assembly**, and `tests/Tests.FSharp` does not
set it — which is why this reproduced here. The regression tests therefore assert the invariant
positively (ordinal order; every indexed key findable) rather than asserting that some particular
wrong order appears, so they are correct under every culture even where they stop discriminating.

## Noticed in passing, not fixed here

`src/Core.TypeScript/indexed-z-set/` carries 31 pre-existing eslint errors — 26 non-null assertions
and a cognitive-complexity finding in `indexed-z-set.ts`, plus four in its test. The directory is not
in the `lint:eslint` roster, so CI never sees them. Left alone deliberately: cleaning them is
unrelated to this defect and would bury the fix in a large diff.
