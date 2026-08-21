---
id: 081M0JX5GQ8087G0R002TD5Z0Q
type: bug
state: done
priority: P2
slug: forgejo-pins-chart-9-0-6-never-published-and-its-repourl-is
title: "forgejo pins chart 9.0.6 -- never published -- and its repoURL is a dead http repo (chart is OCI-only now)"
created: 2026-08-21T19:36:04.584Z
completed: 2026-08-21T21:17:49.459Z
depends_on: []
composes_with: []
---

# forgejo pins chart 9.0.6 -- never published -- and its repoURL is a dead http repo (chart is OCI-only now)

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0JX5GQ8087G0R002TD5Z0Q-*.md` glob. -->

## Measured (2026-08-21)

`full-ai-cluster/k8s/applications/forgejo/Application.yaml`:

    :26   repoURL: https://code.forgejo.org/forgejo-helm/
    :27   chart: forgejo
    :28   targetRevision: 9.0.6

**Two independent defects, either of which alone stops the sync.**

### 1. The repoURL is not a Helm repository any more

- `https://code.forgejo.org/forgejo-helm/index.yaml` -> **HTTP 404**
- `https://code.forgejo.org/api/packages/forgejo-helm/helm/index.yaml` -> HTTP 200 with
  **`entries: {}`** — the classic HTTP chart repo exists and is empty.

The chart is OCI-only now: `helm install forgejo oci://code.forgejo.org/forgejo-helm/forgejo`
(README at <https://code.forgejo.org/forgejo-helm/forgejo-helm>).

### 2. Chart version `9.0.6` was never published

Read from the OCI tag list `https://code.forgejo.org/v2/forgejo-helm/forgejo/tags/list`
(anonymous pull token; **169 tags, unbroken history from `0.0.1` to `17.1.5`** — nothing pruned):

- the **`9.x` line contains exactly one release: `9.0.0`**. The next published version is `10.0.0`.
- `9.0.6` is **not an appVersion either**. Chart majors are offset one ahead of the app, read
  straight from the OCI config blobs:

  | chart | appVersion |
  |---|---|
  | `8.2.3` | `8.0.3` |
  | `9.0.0` | `8.0.3` |
  | `10.0.0` / `10.1.0` / `10.1.1` / `10.1.2` | `9.0.0` / `9.0.1` / `9.0.2` / `9.0.3` |
  | `11.0.0` | `10.0.0` |
  | `17.1.5` (latest) | `15.0.7` |

  The Forgejo `9.0.x` app line tops out at `9.0.3`, so `9.0.6` corresponds to nothing at all.

## Why this matters beyond one Application

This is the **second** instance of the same class in one survey. `oz` pins `ziti-controller 1.4.5`,
which is an *appVersion*-shaped guess (`081M0JVD5YG087G0R002QDFR9H` / PR #13313); this one is an
appVersion-shaped guess that is not even an appVersion. Both survived review because the number
*looks* like it belongs to the right numbering scheme. A pin that was never published is not drift —
it is a coordinate that has never once resolved, and nothing in the repo notices.

## Fix (three separate decisions, none of them a bump)

1. `repoURL` -> `oci://code.forgejo.org/forgejo-helm` with `chart: forgejo` (ArgoCD OCI Helm source).
2. Choose a real chart version.
3. If the target is current (`17.1.5`), that is an **eight-major** upgrade path from the `9.x` line;
   the chart README carries `To v10` ... `To v17` sections. This needs a human decision.

## Evidence

- `docs/research/2026-08-21-every-remote-helm-chart-pin-surveyed-against-its-own-upstream-index-two-were-never-published.md` §3.2


## Outcome (2026-08-21) — fixed, and the third decision turned out not to be one

All three items in "Fix" above are discharged.

**1. Source is OCI.** `repoURL: code.forgejo.org/forgejo-helm`, `chart: forgejo`.
Note the *absence* of the `oci://` scheme: ArgoCD's declarative Helm source takes the
registry host+path bare and adds the scheme itself — "note: the `oci://` syntax is not
included" (<https://argo-cd.readthedocs.io/en/stable/user-guide/helm/>). Three
Applications in this tree already do it that way (`arc-controller`, `arc-runner-set`,
`hindsight`), and both in-repo checkers classify a scheme-less `repoURL` as OCI
(`classifyRepoUrl` in the audit, `isOciRepo` in `validate-applications.ts`).

**2. Version is `17.1.5`** — the newest tag in the registry, appVersion `15.0.7`.
Re-measured independently for this fix from
`https://code.forgejo.org/v2/forgejo-helm/forgejo/tags/list?n=1000` (anonymous pull token
via the `WWW-Authenticate` challenge — realm `/v2/token`, service `container_registry`):
169 tags, majors 0–17, the 9.x line still exactly `9.0.0`. Confirms the survey.

**3. The "eight-major human decision" collapsed once the values were actually checked.**
Only one of the four `valuesObject` keys is affected, and it was never live:

| key | at chart 17.1.5 | verdict |
|---|---|---|
| `gitea.admin.existingSecret` | present | unchanged |
| `persistence.enabled` / `.size` / `.storageClass` | present | unchanged |
| `postgresql.enabled` | **absent** | removed at chart **14.0.0** |

And the key was already broken *below* 14: charts 9.x–13.x ship
`postgresql-ha.enabled: true` by default, and the chart refuses both at once — `helm
template` at `13.0.1` with our exact values dies on *"Only one of postgresql or
postgresql-ha can be enabled at the same time."* So there is **no published version** on
which the old `valuesObject` renders. Staying below 14 to keep the bundled database is
also not viable at the image layer: chart `13.0.1` renders
`docker.io/bitnami/postgresql:17.5.0-debian-12-r18`, and that manifest now returns
**HTTP 404** from Docker Hub — measured, not assumed. That is upstream's own stated
reason for the removal (Bitnami ending its free image catalogue).

So the `postgresql` key is deleted rather than migrated, with the reasoning written into
the manifest. The chart's default stands: `DB_TYPE=sqlite3` on the existing PVC. **What
remains open, and is genuinely a maintainer call, is whether this standby host gets an
external PostgreSQL (`gitea.config.database.*`) or the CockroachDB the old comment
pointed at** — nothing auto-deploys meanwhile, since this Application is manual-sync by
design.

**Verified:** `helm template` renders 19756 bytes, kubeconform clean (8/8 valid);
`audit-chart-target-revisions.ts` exits 0 with the `ACKNOWLEDGED_UNPUBLISHED` entry for
this pin **removed**; `ratchet-app-failures.ts` 21 → 19 (both forgejo failures cleared),
baseline updated in the same change.
