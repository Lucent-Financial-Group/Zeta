---
id: 081M1F8ZE90087G0R003X3PYN9
type: task
state: backlog
priority: P2
slug: re-model-the-redis-storage-resource-ledger-for-valkey-one-st
title: "Re-model the redis storage/resource ledger for Valkey — one StatefulSet with a shared volumeClaimTemplate, not master+replicas"
created: 2026-09-01T20:01:12.480Z
depends_on: []
composes_with: []
---

# Re-model the redis storage/resource ledger for Valkey — one StatefulSet with a shared volumeClaimTemplate, not master+replicas

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1F8ZE90087G0R003X3PYN9-*.md` glob. -->

## The shape mismatch

`full-ai-cluster/k8s/storage-profiles.json` models redis as **two things**:

| ledger row | addresses |
|---|---|
| `full-ai-cluster/redis/master` | `master.persistence.{size,storageClass}`, `master.resourcesPreset` |
| `full-ai-cluster/redis/replicas` | `replica.persistence.*`, `replica.replicaCount` |

That was true of the Bitnami chart, which rendered a master StatefulSet and a separate
replica StatefulSet. The Valkey chart (`valkey-io/valkey-helm` 0.11.0) renders **one**
StatefulSet with `replicas: 2` — primary plus replica — and **one shared
`volumeClaimTemplate`**.

So the coordinates do not merely need re-pointing. `master.persistence.storageClass` and
`replica.replicaCount` no longer exist, and **re-pointing them at the nearest Valkey paths
would preserve a two-row shape that no longer describes what deploys.**

## What the render actually says (measured 2026-09-01)

```
StatefulSet redis-valkey   replicas: 2   image docker.io/valkey/valkey:9.1.1
  volumeClaimTemplate valkey-data   storageClassName "longhorn"   storage "8Gi"
  resources: requests cpu 100m / memory 128Mi, limits memory 256Mi   (per pod)
```

Totals: **200m / 256Mi** compute and **16 GiB** storage across two pods — down from
`300m / 384Mi` under Bitnami, which rendered three pods for the same role. The lane
arithmetic moves with it.

## The work

1. Collapse the two ledger rows into one that matches a single StatefulSet with a shared
   claim template, keeping the `evidence` / `consequence` / `podsEvidence` conventions.
2. Re-derive the lane totals the change moves, exactly as the minio removal did.
3. Preserve, do not delete, the reasoning already recorded on the Bitnami rows — the size
   choice (8Gi as a size cut, not a pod cut) is still the operative decision and its
   provenance should survive the re-model.

## Done when

`rendered-storage-claims` and `storage-profiles` resolve every redis coordinate against the
live tree, the row count reflects what actually renders, and #16292 leaves draft.

## Origin

Aaron delegated the redis choice on 2026-09-01 ("most supported, or best fit for our
workflows"). The chart decision is made and evidenced in #16292; this is the ledger half,
filed rather than rushed because it governs cluster capacity planning.
