---
id: 081M1N0VTKQ087G0R000ZXQZSA
type: bug
state: backlog
priority: P2
slug: dapr-control-plane-has-no-cpu-or-memory-requests-so-all-five
title: "dapr control plane has no cpu or memory requests so all five pods are BestEffort"
created: 2026-09-04T01:34:52.023Z
depends_on: []
composes_with: []
---

# dapr control plane has no cpu or memory requests so all five pods are BestEffort

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1N0VTKQ087G0R000ZXQZSA-*.md` glob. -->

## What was measured

Rendered `dapr` 1.18.3 against this Application's own `valuesObject` on 2026-09-03
(`helm template dapr dapr/dapr --version 1.18.3 --set global.ha.enabled=false --set
dapr_placement.replicaCount=1`). One Application, five control-plane workloads:

| workload | replicas |
|---|---|
| Deployment `dapr-operator` | 1 |
| Deployment `dapr-sentry` | 1 |
| Deployment `dapr-sidecar-injector` | 1 |
| StatefulSet `dapr-placement-server` | 1 |
| StatefulSet `dapr-scheduler-server` | 3 |

Plus 7 Services, 5 ClusterRole/Bindings, a MutatingWebhookConfiguration and a PDB.

**The only `resources:` block in the entire 1,480-line render is `storage: 16Gi`** on the
scheduler's `volumeClaimTemplate`. Not one container declares a CPU or memory request.

## Why it matters

`full-ai-cluster/k8s/storage-profiles.json` records this honestly — `ungovernedRequests`
carries `dapr` at `0m / 0Mi` — so no budget is lying. The consequence is what needs fixing:

- All five pods are **BestEffort**, the first eviction candidates under node pressure. The
  dev lane runs at 1165m against a 2500m budget on a 4000m node, so that pressure is not
  hypothetical.
- They contribute **zero** to every budget while consuming real CPU, which means the lane's
  arithmetic understates what is actually running — the direction that produces a Pending
  pod somewhere else.
- Evicting `dapr-sidecar-injector` or `dapr-sentry` does not degrade Dapr gracefully; it
  breaks sidecar injection and mTLS issuance for every application that depends on them.

Unlike `temporal` (excluded from the dev lane by `DEFAULT_ROOT_DEV_CATALOG.excludeGlob`),
`dapr` **is** in the dev lane, so this ships in CI on every run.

## What to do

Add a governed `resourceClaims` row per workload in `storage-profiles.json` with `dev` and
`metal` rungs, and write the numbers into the Application's `valuesObject` at the
coordinates the chart actually reads. `rendered-resource-requests.ts` will then verify the
values reach a container rather than sitting inert — which is the check that matters here,
since Dapr's values layout for per-component resources is not obvious from the chart.

Rolls up under [081M1N0VTN8087G0R0008VE34B] (requests everywhere). Filed, not started —
sequenced behind the in-flight load-balancer and Cilium work.
