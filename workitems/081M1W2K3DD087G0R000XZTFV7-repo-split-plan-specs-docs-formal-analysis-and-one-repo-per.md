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

