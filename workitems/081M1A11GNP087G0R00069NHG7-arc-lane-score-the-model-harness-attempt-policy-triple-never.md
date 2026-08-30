---
id: 081M1A11GNP087G0R00069NHG7
type: task
state: backlog
priority: P2
slug: arc-lane-score-the-model-harness-attempt-policy-triple-never
title: "ARC lane: score the (model, harness, attempt-policy) triple — never a bare model name"
created: 2026-08-30T19:06:19.702Z
depends_on: []
composes_with: ["081M1A11M0J087G0R001MAE62P", "081M0WZTGG8087G0R0028CRRQG"]
---

# ARC lane: score the (model, harness, attempt-policy) triple — never a bare model name

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1A11GNP087G0R00069NHG7-*.md` glob. -->

## The defect this makes unrepresentable

ARC Prize published **30.2%** for Claude Opus 5 on the ARC-AGI-3 public set. Prime Intellect
reported **95.5%** for the *same weights on the same games* inside their own harness (against a
95.4% human-expert baseline; self-reported, off the official leaderboard). Whatever the true
figure, the gap says the thing that matters here:

> **A row labelled with only a model name is under-specified by construction.** The number was
> produced by a *pair*, and only one member of the pair gets named.

This is not an accusation — nobody lied, the unit of measurement is simply wrong
(`never-assume-malice-where-mistake-is-possible.md`). It is the aggregate-overcount failure
(`user_aaron_history_optimizes_the_flattering_reading…`) applied to benchmarks, and *"the meter
buys the demarcation, not the claim"* (Aaron 2026-08-24) is the standing correction.

## What to change

`src/Arc.Python/zeta_arc/hosted.py` — the scorecard/report key becomes the triple, not the model:

- `model` — the weights, with version
- `harness` — our own commit sha for `src/Arc.Python/` (the loop is a measured input, not a constant)
- `attempt_policy` — see `081M1A11M0J087G0R001MAE62P`, which supplies the field

A bare model name should be **unable to appear** in our own output, rather than merely
discouraged. Make the key a required constructor argument so omitting it is a type error, not a
style lapse.

## Falsifier

A test that constructs a scorecard without a harness sha **must fail**. Mutate it: delete the
requirement and the test must go red (`toy-is-free-metered-must-be-earned.md` — a check that
cannot fail is not a check).

## Anchors / pointers

- `docs/research/2026-08-30-recursive-language-models-are-the-sidecar-case-our-own-criterion-already-named.md` §3, §4.1 — the derivation
- `docs/design/2026-08-23-arc-agi-3-integration-design-chip8-chip9-atari-and-the-arena.md` §6 — their scorer vs our ΔU
- composes with `081M1A11M0J087G0R001MAE62P` (the denominator fields) and `081M0WZTGG8087G0R0028CRRQG` (hosted roster play)
