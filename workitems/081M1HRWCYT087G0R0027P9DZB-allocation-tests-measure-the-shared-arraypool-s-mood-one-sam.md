---
id: 081M1HRWCYT087G0R0027P9DZB
type: bug
state: backlog
priority: P2
slug: allocation-tests-measure-the-shared-arraypool-s-mood-one-sam
title: "Allocation tests measure the shared ArrayPool's mood: one sample makes a pool miss look like a regression"
created: 2026-09-02T19:17:38.906Z
depends_on: []
composes_with: []
---

# Allocation tests measure the shared ArrayPool's mood: one sample makes a pool miss look like a regression

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1HRWCYT087G0R0027P9DZB-*.md` glob. -->

## The defect

`tests/Tests.FSharp/Runtime/Allocation.Tests.fs` measures allocations with a single sample:

```fsharp
let before = GC.GetAllocatedBytesForCurrentThread()
action ()
let after = GC.GetAllocatedBytesForCurrentThread()
after - before
```

Every path it measures rents a workspace from `ArrayPool<'T>.Shared` via `Pool.Rent`, returning it
with `Pool.Return`. **That pool is process-wide.** A rent that hits allocates nothing; a rent that
misses allocates an entire power-of-two bucket. Which one happens is decided by what every other
test in the process did to the shared pool between this test's warm-up and its read — so one sample
measures the pool's state, not the code under test.

## The number decomposes exactly

`ZSet.add allocates only the output array` read **384 bytes** against a `< 200` bound in the
full-suite run, while passing **49/49 in three consecutive isolated runs**. 384 is not noise:

| component | bytes |
|---|---|
| `Pool.Rent 5` misses, taking the 16-element bucket: 16 x `sizeof<ZEntry<int>>` (16) + 24-byte header | 280 |
| `Pool.FreezeSlice` allocates the intended 5-entry output: 5 x 16 + 24 | 104 |
| **total** | **384** |

One pool miss, plus exactly the allocation the test is about. The call path is
`ZSet.add` -> `ZSet.(+)` -> `MergeKernel.sum` -> `Pool.Rent` / `Pool.FreezeSlice` / `Pool.Return`.

## Why this is the test's bug and not the code's

`ZSet.add` is behaving exactly as designed — rent, fill, freeze the exact-size output, return. The
invariant the test states ("one `T[]` allocation, the output array") is a claim about the
**steady state**, where the rent hits. The measurement simply cannot see that state when a
neighbouring test has drained the bucket.

## Fix

`measure` now takes the **minimum of 5 samples** after the warm-up. The minimum is the sample where
the rent hit — the steady-state cost the invariant is stated over.

This does not weaken the assertion. An extra allocation on every call raises the minimum too, so a
genuine regression still fails. What it stops failing on is a neighbouring test's effect on a shared
bucket, which is not a property of the code under test.

Same shape as the two other findings from this Windows run: **passes alone, fails in company** —
`Tests.FSharp.Git` (`081M1HQM6NS087G0R0002ZS3MK`) and the bun git-driver timeouts
(`081M1HP9SNZ087G0R000RFHE13`). Three separate mechanisms, one class: a test whose result depends on
process-wide state it neither owns nor declares.
