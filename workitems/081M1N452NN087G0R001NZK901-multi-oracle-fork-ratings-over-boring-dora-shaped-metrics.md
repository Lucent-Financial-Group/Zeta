---
id: 081M1N452NN087G0R001NZK901
type: task
state: backlog
priority: P3
slug: multi-oracle-fork-ratings-over-boring-dora-shaped-metrics
title: "multi-oracle fork ratings over boring DORA-shaped metrics"
created: 2026-09-04T02:32:20.917Z
depends_on: []
composes_with: []
---

# multi-oracle fork ratings over boring DORA-shaped metrics

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1N452NN087G0R001NZK901-*.md` glob. -->

Design: [`2026-09-03-upstream-acceptance-is-the-divergence-meter-escrow-is-the-exit-and-fork-ratings-need-several-oracles.md`](../docs/research/2026-09-03-upstream-acceptance-is-the-divergence-meter-escrow-is-the-exit-and-fork-ratings-need-several-oracles.md) §5

Aaron 2026-09-03: *"i'd like to push on this a bit so we have some community oracles, not
just one but a few, that rate the forks of the same packages by some DORA like boring
metrics we can all agree on mostly. this way you can kind of navigate who is canonical vs
who is experimenting."*

## Three constraints, and each is already a carved rule

**"not just one but a few."** A single fork-rating authority is an appointed hub at the
package layer — whoever runs it decides what is canonical. Download counts on one registry
are exactly that today: one number, one authority, a popularity contest standing in for a
judgement. §11 multi-oracle is the only shape in which the rating is not a capture.

**"boring metrics we can all agree on mostly."** The good-meter test verbatim: *anyone can
inspect it and agree to the rules*, in advance rather than after seeing the result. A metric
needing interpretation to compute is one two parties will compute differently.

**"canonical vs experimenting"** is a **reading**, and the metrics must support both without
preferring either:

| release cadence | change-failure / revert rate | honest reading |
| --- | --- | --- |
| low | low | **canonical** — mature, or finished |
| high | high | **experimenting** — moving fast, and saying so |
| high | low | unusually good, or under-measured |
| low | high | **abandoned or in trouble** |

No cell says "better". Picking the experimental fork on purpose is a choice, not a mistake.

## The DORA analogues for a fork

| DORA | fork analogue |
| --- | --- |
| deployment frequency | release cadence |
| lead time for changes | issue opened to fix released |
| change failure rate | releases needing a follow-up fix; revert rate |
| time to restore | CVE published to patched release |

**Anchor:** Forsgren, Humble & Kim, *Accelerate* (2018). What is borrowed is the **shape** —
a small, boring, agreed set beats a large contested one — not the original validation, which
was about delivery teams and does not transfer by assertion.

## Not greenfield, and the exact gap

`src/Core.TypeScript/backlog/dora-metrics.ts` already folds DORA over work-item events. It
measures **us**. Nothing measures a third-party fork; that is the increment.

## Open, and named rather than hand-waved

- **Who runs the oracles.** "A few" is the requirement; how they come to exist and how a
  consumer finds more than one is unanswered. All hosted by one party and the plurality is
  decorative.
- **Goodhart.** Every published metric becomes a target, and release cadence is trivial to
  inflate. The likely mitigation is that metrics are **derived from public artifacts** rather
  than self-reported — an assertion here, not yet a design.

Register: `toy`. Nothing has computed these for any fork.
