---
id: 081M1W2K3DD087G0R000XZTFV7
type: task
state: backlog
priority: P2
slug: repo-split-plan-specs-docs-formal-analysis-and-one-repo-per
title: "Repo split plan: specs, docs, formal analysis, and one repo per language"
created: 2026-09-06T19:19:44.301Z
depends_on: []
composes_with: []
---

# Repo split plan: specs, docs, formal analysis, and one repo per language

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1W2K3DD087G0R000XZTFV7-*.md` glob. -->

The plan is `docs/DECISIONS/2026-09-06-DRAFT-repo-split-specs-docs-formal-and-one-repo-per-language.md`.

## The two findings that shape it

**1. "docs into its own repo" is NOT the easy one.** 728 files under `src/`, `tests/`,
`tools/`, `clis/`, `.github/`, `infra/` and `full-ai-cluster/` reference a `docs/` path.
Much of `docs/` is machine-read substrate that happens to live there: `docs/research` has
**432** readers, `docs/backlog` 101, `docs/DECISIONS` 59, `docs/security` 39. Of 77
subdirectories, ~26 have zero readers — and every one of those is 1–10 files. So the cut is
**prose vs machine-read substrate**, not `docs`, and the prose half is both easy and
low-value.

**2. The languages are already partitioned, and the blocker is the treaty.** Every language
has its own top-level directory already. But the golden vectors LIVE in `src/Core.TypeScript`
(71 files) and are READ from ten directories — F# tests (54), C# tests (36), F# src (22), C#
src (19), four Rust crates, `tests/cross-verification`. Splitting languages while the vectors
stay in one of them makes **TypeScript an appointed hub**, which
`itron-hub-patent-boundary-p2p-is-the-upgrade.md` forbids and
`clone-at-tag-stays-sufficient.md` compounds.

So the language split has a single prerequisite: **`zeta-treaty`**, a repo no oracle owns.

## Done when

The plan has been adversarially reviewed and either accepted or amended — and in particular
step 4 (`zeta-treaty`) is confirmed as the gate: if the four-oracle byte-lock cannot pass from
a pinned treaty checkout with no package manager, steps 5–6 do not start.

## Aaron's refinement, same day — the nexus architecture

> *"zeta is the nexus for now but it's an ACCIDENTAL nexus. we likely want a nexus repo per
> language/toolchain and a common one that is very intentional."*

**"Accidental nexus" renames the problem.** Zeta is not a monorepo that grew — it is a
junction nothing declared, and **an undeclared junction has no rules, so everything crosses.**
That is one cause behind all three measurements above: 728 cross-references, machine-read
substrate under `docs/`, and the golden vectors sitting inside one oracle.

Two tiers, and the second is already half-built here:

- **Per language/toolchain: a nexus repo.** One clone is a whole world — code, tests, its own
  Helm charts, and **stubs for everything it does not own**.
- **Across languages: one intentional common nexus — `zeta-treaty`.** *"Similar to our
  multi-oracle agreements in this repo"* is exact: the vectors already **are** the agreement,
  and `culture-invariant-by-default.md` already calls the seed a treaty. The split does not
  invent this; it moves the agreement out of one participant's house.

**Helm charts: the ask is nearly free today.** 37 cluster charts are third-party pins; this
repo owns exactly **two**, both fixtures under `examples/helm-dependency-graph/charts/`. So
the rule can be carved before the first service chart is written rather than after:

> A chart that deploys **code** lives in that code's repo and is rendered by that repo's CI.
> A chart that deploys **someone else's software** lives with the cluster that deploys it.

The second half stops the rule being read as licence to scatter 37 upstream pins across eight
repos, which would undo the pin-parity work.

**The stubbing has a falsifier and an honest limit.** A language repo's tests must pass with
**no other language present** — if `zeta-fs` needs `zeta-ts` on disk, the split moved the
coupling without removing it. But a stub that drifts from what it stands for is a lie with a
green tick, so stubs must be checked against the real thing by golden vector. **Stubs are how
a repo stands alone; the treaty is what stops them drifting. Neither works without the other.**

**The ace dimension, stated so it does not violate the rule beside it:** `ace` may resolve
*language nexus + toolchain + treaty pin* as a coordinate, but never become the only way to —
`clone-at-tag-stays-sufficient.md` is explicit that the moment `ace` is the only path it is an
appointed hub. The treaty pin stays a plain committed ref `git` alone can follow.

