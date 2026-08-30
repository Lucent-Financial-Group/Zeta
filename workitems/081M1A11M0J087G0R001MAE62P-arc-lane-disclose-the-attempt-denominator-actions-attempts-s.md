---
id: 081M1A11M0J087G0R001MAE62P
type: task
state: backlog
priority: P2
slug: arc-lane-disclose-the-attempt-denominator-actions-attempts-s
title: "ARC lane: disclose the attempt denominator — actions, attempts, scaffold-mutated-between-attempts, tokens"
created: 2026-08-30T19:06:23.122Z
depends_on: []
composes_with: ["081M1A11GNP087G0R00069NHG7", "081M0WZTGG8087G0R0028CRRQG"]
---

# ARC lane: disclose the attempt denominator — actions, attempts, scaffold-mutated-between-attempts, tokens

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1A11M0J087G0R001MAE62P-*.md` glob. -->

## The objection this dissolves without having to win it

The sharpest public criticism of self-improving harnesses on ARC-AGI-3 is that the benchmark is
**few-shot**, and a harness that rewrites its own scaffolding *between attempts* may be spending
more tries than the rules allow. Both sides of that argument are reasonable:

- *against*: refining between attempts defeats the point of a few-shot test.
- *for*: to write a working simulator of a game you were never shown, you had to learn its rules —
  which is the thing the benchmark set out to measure.

**We do not have to adjudicate it**, because we already hold the discipline that dissolves it:
**report the denominator** (`main-is-green-because-nothing-finishes-checking-it`; *no silent caps*).

> A harness that refines between attempts is not cheating if it says so. It is cheating if the
> number is published without the count.

This is the one place our lane can be straightforwardly *better* than every result in this space,
at near-zero implementation cost.

## Fields to emit, per level

| field | why |
|---|---|
| `actions` | the `a` in ARC's `S = min(1, h/a)²`; already the scored quantity |
| `attempts` | the few-shot denominator — currently invisible |
| `scaffold_mutated_between_attempts` | boolean; the whole substance of the objection |
| `tokens` | cost, and the axis on which the cheapest published result won |

Carry **raw `h/a`** as the ΔU-bearing quantity, never `S`: squaring is not additive, so `S` cannot
feed `SocietyUsefulWork`'s aggregation theorem, which is stated over additive ΔU under pairwise
correlation ρ. (Already established — design doc §6. Restated because it is easy to lose.)

## Falsifier

A run that mutates the scaffold between attempts and reports
`scaffold_mutated_between_attempts: false` must fail a check. The flag has to be *derived* from
whether the scaffold files changed, never *asserted* by the runner — a self-reported honesty flag
is the vacuity class.

## Anchors / pointers

- `docs/research/2026-08-30-recursive-language-models-are-the-sidecar-case-our-own-criterion-already-named.md` §4.2, §4.3
- `docs/design/2026-08-23-arc-agi-3-integration-design-chip8-chip9-atari-and-the-arena.md` §6 — `h` is the SECOND-BEST human action count
- composes with `081M1A11GNP087G0R00069NHG7`
