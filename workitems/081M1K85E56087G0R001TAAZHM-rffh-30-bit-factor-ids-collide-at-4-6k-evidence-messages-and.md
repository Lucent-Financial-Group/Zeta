---
id: 081M1K85E56087G0R001TAAZHM
type: bug
state: backlog
priority: P1
slug: rffh-30-bit-factor-ids-collide-at-4-6k-evidence-messages-and
title: "RFFH 30-bit factor IDs collide at ~4.6k evidence messages and the collision guard is unfalsifiable"
created: 2026-09-03T09:03:58.118Z
depends_on: []
composes_with: []
---

# RFFH 30-bit factor IDs collide at ~4.6k evidence messages and the collision guard is unfalsifiable

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1K85E56087G0R001TAAZHM-*.md` glob. -->

**Source:** adversarial math review (Soraya, 2026-09-03), routed by Aaron. Two facts below
independently re-checked by shadow before filing.

## The bound is ~8x tighter than it was framed

`src/Bayesian/ReferenceFrameFactorHeterarchy.fs:455-459`:

```fsharp
let baseId = BitConverter.ToUInt32(digest, 0) &&& 0x3fffffffu
int (baseId <<< 1), int ((baseId <<< 1) ||| 1u)
```

One evidence message consumes **one** 30-bit `baseId` — the `<<<1` / `|||1` split is derived, not
independent entropy — so the birthday population is `2^30`, not `2^31`:

| messages | P(≥1 collision) |
|---|---|
| 1,466 | 0.1% |
| **4,646** | **1%** |
| 10,000 | 4.5% |
| 32,768 | 39% |

The 50% point is 38,581, but nobody ships to a 50% failure rate. **The decision-relevant threshold
is ~4.6k evidence messages**, which is an ordinary workload. "32k" was the wrong number to plan
against.

## What is NOT wrong: it refuses rather than corrupts

`ReferenceFrameFactorHeterarchy.fs:595-601` detects the collision and returns
`RFFH-FACTOR-ID-COLLISION` with a safe next step. Evidence is **refused, not merged**. So this is
an availability / data-loss-at-the-boundary defect, **not a wrong-posterior defect** — which is
why it is P1 and not P0.

## The primary defect is that the guard cannot be shown to fire

`RFFH-FACTOR-ID-COLLISION` occurs **exactly once in the entire tree — the line that raises it.**
Re-checked by shadow across all non-docs tracked files: 1 occurrence. No test reaches it, no caller
matches on it, no doc names it. Reaching it needs a 30-bit SHA-256 near-collision, which no unit
test can brute-force. **It is a guard that cannot be demonstrated to work**, and nothing verifies
that the refusal *preserves* the refused evidence rather than dropping it.

That is the vacuity class in its standard form, and it is the part worth fixing even after the
width is widened.

## Route (from the review, and it names the wrong-tool cost)

1. **Widen the id to 64 bits.** Removes the operational problem outright.
2. **Parameterize the id width**, then an **FsCheck property** at a deliberately narrow width
   (8–12 bits) where collisions are trivially constructible, asserting **refuse-AND-preserve**.

**Not Z3, not TLA+.** The bound is a closed-form birthday calculation that is already computed; a
model checker buys nothing and costs human-weeks. The gap is a test, not a proof.

**Falsifier for this item:** at a narrow width, construct a collision and assert both that the
refusal fires and that the refused evidence is still recoverable. If no test can make it fire, the
item is not done.
