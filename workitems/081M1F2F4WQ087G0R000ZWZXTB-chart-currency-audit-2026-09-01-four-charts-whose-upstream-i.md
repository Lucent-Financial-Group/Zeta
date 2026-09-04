---
id: 081M1F2F4WQ087G0R000ZWZXTB
type: task
state: backlog
priority: P2
slug: chart-currency-audit-2026-09-01-four-charts-whose-upstream-i
title: "Chart currency audit 2026-09-01: four charts whose UPSTREAM is dead or EOL, not merely behind"
created: 2026-09-01T18:07:27.127Z
depends_on: []
composes_with: []
---

# Chart currency audit 2026-09-01: four charts whose UPSTREAM is dead or EOL, not merely behind

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1F2F4WQ087G0R000ZWZXTB-*.md` glob. -->

## Why this audit ran

Aaron, 2026-09-01, after the minio removal surfaced six images pinned to `bitnamilegacy`:
*"lets route a background agent to check each chart and image one at a time and look for
unsupported products and also latest versions."* Three agents audited all 34 remote chart
pins. `docs/CHART-CURRENCY.md` already reported the *gaps*; what it cannot report is
whether the thing on the other end of a pin is still alive. That is what this adds.

## The headline: "behind" was the wrong worry on four of them

`CHART-CURRENCY.md` says it in its own header — *a versions-behind metric reports the most
dangerous dependency as the healthiest one, which is exactly what happened with minio.*
Four charts prove it again, and **two of them are at or near the newest version**:

| chart | the finding | why the gap number missed it |
|---|---|---|
| **cilium** | **1.16 reached EOL 2026-02-03** — ~7 months with no security patches, on the CNI | "56 behind" reads as staleness; EOL is a support fact the count cannot carry |
| **tempo** | **chart source is DEAD.** `grafana/helm-charts` deprecated it 2026-01-30 and froze it at 1.24.4; OSS moved to `grafana-community/helm-charts`, now at 2.3.0 | it reads "17 behind" against a **frozen** repo — the newest version there exists only because publishing stopped |
| **redis** | bumping the chart **does not fix it**: 28.0.12 defaults to `bitnami/redis:latest`, an UNPINNED rolling tag. The free versioned path is gone entirely | the chart repo is genuinely active; the rot is one layer down, in distribution |
| **hindsight** | bundles **`ankane/pgvector:latest`** — archived, no push since **2023-10-11**, maintainer's own description says use `pgvector/pgvector` | a bundled subchart image is invisible to a chart-version metric |

`loki` is a fifth, softer case: its README says the OSS chart moved to
`grafana-community/helm-charts` in March 2026 and that the `grafana/helm-charts` copy is
**GEL-only now** — yet that repo *keeps publishing OSS-usable releases* (7.3.0, 2026-08-10).
The chart's stated purpose and its actual behaviour disagree. Nothing breaks today; the
risk is that it resolves itself the hard way. Maintainer call.

## Progress 2026-09-04 — Cilium first-boot pin

Application `targetRevision` is CURRENT `1.20.1` (#16287). Bootstrap
`cilium-install.yaml` matched that pin on 2026-09-04 (#16570 squash
`cb9b223df`): there is no live cluster, so first-boot may jump (Aaron:
"we can be on latest from the start"). Cilium still forbids skip-minor on an in-place upgrade; the
equality test in `cilium-kind-lane.test.ts` is the control. Redis already
Valkey (#16292). Hindsight already `pgvector/pgvector:pg17-trixie`.
hat-system wait Job is `registry.k8s.io/kubectl:v1.32.3` (shell-free).
Tempo already CURRENT 2.3.0. Remaining `081M1F1K5N5` outside deferred
gitlab: none.

## Two upstream facts that change earlier recommendations

1. **Redis is back under AGPLv3** (Redis 8.0, May 2025). The licence change that created
   Valkey is resolved upstream, so the official `redis` image is a legitimate option too —
   `081M1F1K5N5087G0R0019JKRV0` recommends Valkey partly on licence grounds and that half
   of the argument is now weaker. Both remain better than an unpinned `bitnami/redis:latest`.
2. **`mimir`'s chart defaults `minio.enabled: true`.** We override it to `false`, which is
   the only reason the minio removal did not leave a bundled copy behind. **That override
   must survive any values reset** — worth a falsifier rather than a memory.

## Staged-upgrade requirements a single `targetRevision` bump will NOT satisfy

Recorded because the obvious move — bump the pin, let ArgoCD sync — is wrong for these:

- **cockroachdb** 24.2 → 26.3 is ~6 majors, and CockroachDB permits **one major at a time**
  ("leaping over a major version upgrade is not possible"); each hop needs its own finalize.
- **cilium** 1.16 → 1.20 needs 5 sequential hops; upstream tests no skipping. Touches our
  exact feature set: Gateway API (v1.6.1 min, TLSRoute migration), kube-proxy-replacement,
  and L7 policy (proxylib removed at 1.20).
- **nats** 2.10 → 2.14 changes the **stream state file format** (downgrade only to ≥2.11.9,
  and then with an on-disk rebuild) and makes **JetStream strict mode the default**. Also:
  **2.13 does not exist** — 2.14 succeeds 2.12.
- **temporal** v1.28 requires deleting all Worker Deployments before upgrading; v1.31
  requires a mandatory schema migration.
- **dapr** 1.14.4 is **out of support** (N-2 policy), and the 1.14 → 1.15 hop carries a
  documented **data-loss warning** for actor reminders during the Scheduler migration.
- **external-secrets** v1beta1 → v1 CRD auto-conversion causes **GitOps drift in ArgoCD
  specifically** (upstream issue #5478) — which is our exact deployment model.

## Repository relocations to make before any version bump is meaningful

- `tempo` → `grafana-community/helm-charts` (current repo frozen)
- `cert-manager` → `oci://quay.io/jetstack/charts` (`charts.jetstack.io` is now a legacy mirror)
- `loki` → possibly `grafana-community/helm-charts`, pending the maintainer call above
- `headscale` → evaluate `Szpadel/szpadel-charts`; the `gabe565` sub-chart has had no
  release in 18 months and an image-bump PR open since 2025-02-25

## What is genuinely fine

8 of the 9 largest-gap charts (kube-prometheus-stack, argocd, argo-workflows, cockroachdb,
external-secrets, alloy, nats, plus loki functionally) have healthy, actively-maintained
upstreams. For those the versions-behind number **is** just staleness. `argocd` is already
addressed — bumped to 10.6.0 in its own PR, since everything depends on it.

## Done when

No chart in the tree points at a frozen or deprecated repository; no bundled subchart pulls
an archived image; `cilium` is on a supported branch; and the distinction this audit rests
on — *upstream alive* versus *pin recent* — is checked by something mechanical rather than
by an annual agent sweep.

## Method note, and its limit

Three agents, 34 charts, primary sources only (GitHub REST for archived/`pushed_at`, each
chart's own `index.yaml`, upstream upgrade docs, Docker Hub `last_updated`). Findings marked
unverified in the raw reports are carried as unverified here. **This is a snapshot, not a
mechanism** — the same sweep six months from now would need re-running by hand, which is
exactly the shape of check this repo distrusts. The *Done when* above asks for the
mechanical version.
