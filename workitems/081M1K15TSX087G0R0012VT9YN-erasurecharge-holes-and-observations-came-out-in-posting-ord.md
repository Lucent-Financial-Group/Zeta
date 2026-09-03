---
id: 081M1K15TSX087G0R0012VT9YN
type: bug
state: backlog
priority: P2
slug: erasurecharge-holes-and-observations-came-out-in-posting-ord
title: "ErasureCharge holes and observations came out in posting order, not ordinally"
created: 2026-09-03T07:20:00.000Z
depends_on: []
composes_with: []
---

# `ErasureCharge` holes and observations came out in posting order, not ordinally

## The defect

TypeScript's `settle` accumulated holes in a JS `Map` and returned `[...holes]` — **insertion
order**. `settleAll` returned its observations the same way. F# returns both sorted:
`Ledger.Holes` is `Map.toList` over an ordered map, and `Account.Observations` sorts with
`String.CompareOrdinal`, explicitly and with a comment saying never a culture collation.

So the same account, settled from the same postings, produced a different hole list in the two
runtimes whenever the postings did not happen to arrive in ordinal order.

**This is not cosmetic.** `renderReading` joins the hole keys into the human-facing line an audit
reads — _"at least N bits-ppm, plus K operation(s) of unknown cost: …"_ — so the rendering differed.
And under §7 DST, a reading whose output depends on the order postings arrived is **not replayable in
the observable sense**: replaying the same ledger with a different interleaving gives a different
answer to _"what does this account say?"_, which is exactly the property DST exists to guarantee.

## How it was found

By the `ErasureCharge` treaty, before the F# replay side was even finished. Generating the
transcript printed:

```
hole keys (TS):    ["ZetaFsDeltaLog::…::physical-medium", "Broken::claimsFreeButIsNot::…", "Broken::claimsCostButIsInjective::…"]
observations (TS): ["physical-medium", "log-read-surface", "commit-dag"]
```

— posting order in both cases, which the corpus had deliberately chosen to be the reverse of ordinal
order. The F# replay was then run **against the unfixed transcript first**, and failed on exactly
those two assertions and nothing else. That sequence matters: writing the fix first and regenerating
would have produced a treaty that passed trivially, proving only that a generator agrees with itself.

## The fix, and which side moved

TypeScript sorts, in both places. F#'s behaviour is the correct one and not merely the incumbent: an
ordinal sort does not depend on how the postings arrived, so two runs over the same multiset agree.

## Falsifiers

```
dotnet test tests/Tests.FSharp --filter FullyQualifiedName~ErasureChargeTreaty   # 5 passed
bun test src/Core.TypeScript/algebra/                                            # 405 pass
dotnet test Zeta.sln -c Release                                                  # 7158 passed
```

Three mutants, each killed by the test that owns it:

| mutant                               | killed by                                                                           |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| holes back to insertion order        | `hole order does not depend on which posting arrived first` (+ the case-mixed test) |
| holes sorted case-insensitively      | `ordinal, not linguistic: case-mixed keys sort by code point`                       |
| observations back to insertion order | `observation order does not depend on which posting arrived first`                  |

The case-mixed test earns its place: it is the **only** thing that catches a `localeCompare`, which
would pass every other assertion in the block and still diverge from F#.

The TypeScript properties are asserted in `erasure-charge.test.ts` as well as in the treaty, because
a transcript can be regenerated and a named property cannot be regenerated away.

## What the treaty deliberately does not pin

The **complaint prose**. F# formats the classification through its DU (`Reversible`); TypeScript
through its string literal (`reversible`). Those texts differ in case and always will. They are
independently authored diagnostics for a human reader, not protocol, and locking them would force
one language to spell its own type system's vocabulary the other's way for no gain.

What **is** pinned is everything a consumer acts on: that a hole exists, its key, its order, and its
disposition kind. The transcript carries both languages' prose so a reader can see them, and the F#
test asserts the prose is non-empty — a real property, rather than a byte equality that would
misdescribe what the two modules promise.

## Also pinned, and already agreeing

- **`Charged 0` is unrepresentable.** Both sides require `fibre > 1 && ppm > 0`, so zero is reachable
  only through `Free`, which requires a _measured_ fibre of 1. Relaxing either guard would hand an
  unmeasured operation a second route to zero — the demon this module was written to refuse.
- **Fail-closed on self-contradiction.** `Reversible` over a wide fibre, `Erasing` over a fibre of 1,
  `Unmeasured` carrying a sweep, and `Unmeasured` with a blank reason are all `Malformed` and land in
  the hole set on both sides.
- **A run containing an unknown cost never reports a complete total** — asserted directly, not only
  through vectors, because it is the one claim whose failure would be invisible: both sides would
  still return a number.

## Still open

`SpecializationCache` is the last unpinned F#↔TypeScript pair from the original sweep of six.
