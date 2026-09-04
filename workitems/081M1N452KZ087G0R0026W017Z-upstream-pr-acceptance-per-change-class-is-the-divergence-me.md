---
id: 081M1N452KZ087G0R0026W017Z
type: task
state: backlog
priority: P3
slug: upstream-pr-acceptance-per-change-class-is-the-divergence-me
title: "upstream PR acceptance per change class is the divergence meter"
created: 2026-09-04T02:32:20.863Z
depends_on: []
composes_with: []
---

# upstream PR acceptance per change class is the divergence meter

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1N452KZ087G0R0026W017Z-*.md` glob. -->

Design: [`2026-09-03-upstream-acceptance-is-the-divergence-meter-escrow-is-the-exit-and-fork-ratings-need-several-oracles.md`](../docs/research/2026-09-03-upstream-acceptance-is-the-divergence-meter-escrow-is-the-exit-and-fork-ratings-need-several-oracles.md)

Aaron 2026-09-03: *"if they reject our PRs over time after earning credit with them for
making small bug fixes, this is how we know where our product is most needed cause we are
diverging."*

## The control is the whole idea

The naive form — *they rejected a PR, so fork* — measures nothing. Every project rejects
PRs, and most rejections are about scope, bandwidth, style or timing. **Earning credit
first is the control**, and it separates two hypotheses a raw rejection count cannot:

| | reads as |
| --- | --- |
| rejected, no track record | **we are strangers** |
| rejected, with a track record of accepted fixes | **we want different things** |

Standing conferred by an outside community is the strongest form available here — a fleet
that rated its own alignment with upstream would be measuring nothing.

## Grade by change class, or it fires on every healthy project

Accepting small fixes and declining architectural changes is the **normal** state of every
mature upstream. An ungraded meter reports divergence from Kubernetes, from Linux, from
everything — and a meter that fires on everything discriminates nothing.

| small fixes | architectural | reading |
| --- | --- | --- |
| accepted | accepted | aligned |
| accepted | declined | **normal** — a project with a scope |
| accepted | declined *naming our requirement as out of scope* | **divergence, and located** |
| declined | declined | strangers, or bad citizens — fix that first |

Only the third row is actionable, and it needs **the stated reason**, not just the outcome.
A rejection whose reason names the requirement they will not take says *which part of the
stack our product is for*.

## It is a METER

Report `ArchitecturalChangeDeclined(reason)` — a fact. Never `ForkJustified` — a verdict.
Two parties reading the same acceptance history must be able to disagree about what to do,
or an oracle got in upstream of the measurement
([`dual-use-detection-is-neutral-oracle-decides`](../.claude/rules/dual-use-detection-is-neutral-oracle-decides.md)).

## Shape

Fold over our own PRs to upstream repos, classified by change class, retaining the close
reason. The classification is the hard part and is where this will go wrong first: a
mechanical size heuristic will misclassify, so the class probably has to be **declared when
the PR is opened** and then checked against the outcome.

Register: `toy`. Nothing has computed this for any upstream.
