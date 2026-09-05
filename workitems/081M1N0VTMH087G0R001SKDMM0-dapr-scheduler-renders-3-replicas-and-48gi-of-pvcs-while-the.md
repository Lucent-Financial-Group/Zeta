---
id: 081M1N0VTMH087G0R001SKDMM0
type: bug
state: backlog
priority: P2
slug: dapr-scheduler-renders-3-replicas-and-48gi-of-pvcs-while-the
title: "dapr scheduler renders 3 replicas and 48Gi of PVCs while the Application declares ha disabled"
created: 2026-09-04T01:34:52.049Z
depends_on: []
composes_with: []
---

# dapr scheduler renders 3 replicas and 48Gi of PVCs while the Application declares ha disabled

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1N0VTMH087G0R001SKDMM0-*.md` glob. -->

## What was measured

`full-ai-cluster/k8s/applications/dapr/Application.yaml` sets:

```yaml
global:
  ha: { enabled: false }   # bump once multi-control-plane
dapr_placement:
  replicaCount: 1
```

Rendered at 1.18.3 with exactly those values on 2026-09-03:

| workload | replicas |
|---|---|
| `dapr-placement-server` | 1 — the setting reached it |
| **`dapr-scheduler-server`** | **3 — it did not** |

Each scheduler replica carries a `volumeClaimTemplate` of **16Gi**, so the Application
declares **3 pods and 48Gi of claims** while its own values say HA is off.

## The two questions, and they are separate

1. **Is the value inert, or is the scheduler deliberately exempt from `global.ha`?** Dapr's
   scheduler is an embedded-etcd quorum service, so 3 may be the chart's intent regardless
   of `global.ha` — in which case the defect is the Application's comment, not its values.
   Read the chart, do not infer.
2. **Do we want a 3-member etcd quorum on one node?** On `nodeCount: 1` that is three copies
   of the same failure domain — the shape `acknowledgedFalseRedundancy` already carries for
   cockroachdb, vault, nats, redis, platform and kubevirt. If we keep it, it belongs in that
   list with its reason. If we do not, `dapr_scheduler.replicaCount` is the knob.

## Not a budget defect

`rendered-storage-claims.snapshot.json` already records it correctly as
`dapr-scheduler-data-dir/dapr-scheduler-server ... size 16Gi, count 3`, so the disk budget
counts all three. Nothing is under-counted. What is wrong is that the manifest's stated
intent and its render disagree, which is the inert-key shape: a value set that does not do
what its neighbour does, and that nothing currently notices.

Rolls up under [081M1N0VTP0087G0R0034E7Y0G] (HA and backups).
