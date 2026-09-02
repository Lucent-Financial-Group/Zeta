---
id: 081M1HJMATC087G0R000HHK3KC
type: task
state: backlog
priority: P2
slug: chart-currency-report-misses-four-mechanical-signals-a-secon
title: "chart currency report misses four mechanical signals a second review had to find by hand"
created: 2026-09-02T17:28:23.116Z
depends_on: []
composes_with: []
---

# chart currency report misses four mechanical signals a second review had to find by hand

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1HJMATC087G0R000HHK3KC-*.md` glob. -->

## Why this exists

An independent second review of all 41 chart coordinates (2026-09-02) found four
things by hand that the report could have found mechanically. Each is a small
change to `report-chart-currency.ts` / `audit-chart-target-revisions.ts`, and each
would have caught something real without an agent sweep.

## The four signals

### 1. Repo-level liveness — `max(created)` over EVERY entry in an index

The report computes liveness from `created` on entries of the **pinned chart
only**. Computing the max across all charts in the same index costs nothing extra
— the file is already parsed — and cleanly separates one dead repository from the
live ones:

| repo age | chart repo | newest publish, ANY chart |
|---:|---|---|
| **559 d** | **gabe565** | 2025-02-19 |
| 73 d | szpadel | 2026-06-21 |
| 63 d | weaviate | 2026-07-01 |
| 54 d | nfd | 2026-07-10 |
| ≤ 19 d | all 23 others | 2026-08-14 … 2026-09-02 |

**This is the check that would have caught my own error.** I wrote that gabe565
was "still alive, publishing adguard-home actively" — inferred from a version
list, never from a date. Repo-level liveness makes that inference unnecessary.

**Pin this caveat:** do NOT use the index's `generated:` field alone.
`charts.jetstack.io` reports `generated: 2021-04-28` while serving a chart created
2026-08-18 — a false positive. `max(created)` is the honest metric; `generated` is
corroboration only.

### 2. Read `deprecated: true` — it is already in the index

`grafana/tempo 1.24.4` carries `deprecated: true`. The report renders that row as
`BEHIND … quiet 214d`, which reads as "a bit stale" when the correct reading is
"formally retired; the newest version exists only because publishing stopped."
One field, unread.

### 3. Record `appVersion` beside `version`

This is the column that makes weaviate, ollama, headscale, tempo and oz legible.
A chart that pins an application image freezes the PRODUCT at its last
`appVersion`, and chart-currency cannot see it. The field is already present in
every index entry the refresh reads. Worked instances found by the review:

- `weaviate` — we pin image `1.32.7`; the chart's own appVersion is `1.38.2`; the project ships `1.39.2`
- `headscale` — chart 0.16.0 carries appVersion `v0.25.0`; project at `v0.29.3`
- `oz` — chart 3.1.1 carries `1.7.2`; OpenZiti is at `v2.0.3`

### 4. Widen scope to `infra/k8s/`, or exclude it BY NAME

`docs/CHART-CURRENCY.md` §Scope names git-path sources and `bootstrap/` as
deliberately excluded. It never mentions that a **second complete ArgoCD
Application tree** exists carrying **six more chart pins** — so a reader concludes
the repo has 35 coordinates when it has **41**. Worse,
`audit-cluster-tree-consumers.ts` records that the two trees COLLIDE on
`Application/argocd/zeta-root`, both `prune` + `selfHeal`. Unreported pins in a
tree that can prune the reported one is the wrong asymmetry.

The six: `local-path-provisioner` (3rd-party personal org, 0.0.28→0.0.38),
`longhorn` (1.7.2→1.12.1, 16 behind), `cockroachdb` (13.0.1→22.0.3, 63 behind),
`argo-workflows` (0.42.5→2.0.3, 76 behind), `argo-rollouts`, `gitlab`.

Also in that tree, a checkable error:
`infra/k8s/applications/local-path-provisioner/Application.yaml:30` says
`targetRevision: 0.0.28   # tracks upstream rancher/local-path-provisioner v0.0.28`
— chart 0.0.28's appVersion is **v0.0.27**. The comment asserts a mapping the
index contradicts.

## Also worth fixing while in here

`docs/CHART-CURRENCY.md` is regenerated from a snapshot, so version numbers in it
go stale the moment upstream publishes. The review found `ollama` had already
moved to **1.79.0 / app 0.33.2** and `argocd` to **10.6.4** between the snapshot
and the review — both published after the refresh. That is the mechanism working
as designed; it is noted only so nobody reads a committed report as live data.

## Related

- `081M1HH1ERN087G0R00309EG9D` — headscale, the instance that motivated all of this
- `src/Core.TypeScript/hygiene/audit-dormant-chart-sources.ts` — consumes the
  liveness signal today at chart level; (1) above is what makes it repo level
