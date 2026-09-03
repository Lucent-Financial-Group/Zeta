---
id: 081M1K697MT087G0R000AR9EFN
type: task
state: backlog
priority: P2
slug: the-sweep-that-found-three-defects-was-done-once-by-hand
title: "The sweep that found three defects was done once, by hand"
created: 2026-09-03T09:50:00.000Z
depends_on: []
composes_with: []
---

# The sweep that found three defects was done once, by hand

## The gap

A sweep of the F# modules against the TypeScript ones found **68 concepts implemented in both
languages**, six of them with nothing checking they agree. All six are pinned now, and **three of the
six treaties found a live defect** — two of them silent data loss:

- `IndexedZSet` — groups built with a culture-sensitive sort, then binary-searched ordinally.
  `idx.["A"]` returned empty for a key that was present.
- `RecoverableSpine` / `SnapshotStore` — recovery restored a snapshot and dropped every commit after
  it, **reporting success**.
- `ErasureCharge` — holes and observations in posting order, so the same account rendered differently
  per runtime.

**That sweep was done by hand, once.** So the finding was real and the _capability_ was not: a
seventh unpinned pair added tomorrow is invisible, and the only thing between the fleet and a silent
divergence is somebody remembering to look again.

A one-time audit with a 50% hit rate on real defects is an argument for making it standing, not for
trusting the memory of it.

## What the roster does

`audit-cross-language-pairs.ts` pairs F# modules with TypeScript ones by name
(`IndexedZSet.fs` ↔ `indexed-z-set`) and reports which pairs have **no** treaty transcript, golden
vectors, or F# replay naming them. Baselined, so only a **new** pair fails.

It found **70 pairs** — close to the hand sweep's 68, which is the check on the pairing itself.

## What it does NOT claim, stated because the numbers differ

The hand sweep judged **6** concepts unpinned. This roster reports **31**. That gap is **triage, not
new defects.**

The roster matches on names and cannot tell a concept that needs a treaty (`IndexedZSet`) from one
where a treaty would be meaningless (`Result`, `Query`, `Plan`). So the baseline is recorded as
**untriaged** and says so in its own `_comment`: it captures what the roster sees today so a new pair
fails, and asserts nothing about whether those 31 need treaties. Triage moves entries into
`DECLARED_UNPINNED` with a reason, or pins them.

Presenting the 31 as findings would be exactly the over-claim this repo's discipline exists to
prevent.

## And what a green run means

That **no pair is unwatched** beyond the recorded baseline — _not_ that the pairs agree. The audit
checks a pin **exists**; a treaty with one vacuous vector passes it. Only a mutation matrix judges a
treaty's quality, and that is per-treaty work no roster can do. The tool says so on every green run.

## Falsifiers

Adding an F# module and a TypeScript module with the same concept name and no treaty:

```
cross-language pairs: 71 concept(s) implemented in BOTH F# and TypeScript, 39 pinned, 32 not.
::error::1 NEW unpinned cross-language pair(s): ZzNewConcept
exit 1
```

Removing them returns exit 0.

Six unit tests pin the roster itself: that `kebabOf` produces the names the trees actually use, that
the roster still finds all six hand-swept concepts (a roster that lost them would go green by being
broken), that it recognises the treaties which exist, and that every reported pair names files that
exist — a finding nobody can check is a finding nobody will.

## Wiring

Registered as `hygiene:cross-language-pairs` and invoked in the drift-tier hygiene job. The
`linter-coverage` audit caught the first attempt, which registered the script without wiring it:

> a check that exists, can fail, and is wired to nothing reads exactly like a check that passed

which is the same class this roster exists to close, one layer up.
