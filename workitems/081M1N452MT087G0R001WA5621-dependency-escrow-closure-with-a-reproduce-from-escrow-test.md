---
id: 081M1N452MT087G0R001WA5621
type: task
state: backlog
priority: P2
slug: dependency-escrow-closure-with-a-reproduce-from-escrow-test
title: "dependency escrow closure with a reproduce-from-escrow test"
created: 2026-09-04T02:32:20.890Z
depends_on: []
composes_with: []
---

# dependency escrow closure with a reproduce-from-escrow test

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1N452MT087G0R001WA5621-*.md` glob. -->

Design: [`2026-09-03-upstream-acceptance-is-the-divergence-meter-escrow-is-the-exit-and-fork-ratings-need-several-oracles.md`](../docs/research/2026-09-03-upstream-acceptance-is-the-divergence-meter-escrow-is-the-exit-and-fork-ratings-need-several-oracles.md) §4

Aaron 2026-09-03: *"the upstream version is good to support as long as we escrow the
dependencies and code in case they disappear tomorrow ... this is the nation state hacking
resistant version of zeta."*

## The threat model is broader than the name

Nation-state takedown is one event. A maintainer deleting a package, a registry
unpublishing, a licence change, an acquisition, a repository going private, a CDN that stops
— **the events differ and the recovery is identical.** Escrow is
[`clone-at-tag-stays-sufficient`](../.claude/rules/clone-at-tag-stays-sufficient.md) pointed
outward: that rule already requires this tree to build from a tag with no package manager;
this is the same sentence about everything the tree depends on.

## Holding bytes is not being able to continue

| have | without it you have |
| --- | --- |
| source at the pinned revision | a binary you cannot patch |
| the transitive dependency closure | a build that stops at the first missing edge |
| the build toolchain, pinned | source you cannot turn into the artifact |
| a **reproduced** build, not a stored one | a claim that you could rebuild it |
| the licence, recorded | bytes you may not be allowed to use |

**The fourth row decides whether this is real.** An escrow nobody has rebuilt from is the
storage form of a check that cannot fail: it looks like continuity and has never once been
exercised. So the deliverable is not a mirror — it is a mirror plus a periodic
**reproduce-from-escrow** run that is loud when it fails.

## Not greenfield

`references/prior-art/` mirrors external repositories. `vendored-upstream-parity.ts` makes a
"vendored verbatim" claim checkable against upstream. `ace` carries pinned artifacts, a
lockfile and package-hash. The pieces exist; nothing composes them into a **closure** with a
rebuild test.

## The honest limit, on the page so nobody forgets it

Escrow preserves the **code**, never the **community**. Hold every byte of Kubernetes and
you still do not have the people who review its security patches. Escrow buys the ability to
keep running and to fork under duress — not maintenance. A plan that treats it as though it
does has mispriced the risk.
