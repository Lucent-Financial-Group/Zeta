---
id: 081M1PZKGM4087G0R000Z4VC1Y
type: task
state: backlog
priority: P3
slug: tempo-stores-traces-on-a-local-pvc-while-loki-and-mimir-use
title: "tempo stores traces on a local PVC while loki and mimir use object storage"
created: 2026-09-04T19:51:19.940Z
depends_on: []
composes_with: []
---

# tempo stores traces on a local PVC while loki and mimir use object storage

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1PZKGM4087G0R000Z4VC1Y-*.md` glob. -->

## The asymmetry

| signal | backend |
| --- | --- |
| logs (`loki`) | **seaweedfs** (S3) |
| metrics (`mimir`) | **seaweedfs** (S3) |
| traces (`tempo`) | **`backend: local`**, `/var/tempo/traces` on a 20Gi Longhorn PVC |

## What it is NOT

Not data loss. Persistence is enabled and the volume is Longhorn, so traces survive the
pod. This is filed as an inconsistency with a consequence, not as a defect.

## The consequence

Two things the other two signals have and traces do not:

1. **Object-store retention and scale.** Loki and Mimir grow into seaweedfs; Tempo grows
   into a fixed 20Gi PVC, so its retention is bounded by a disk rather than by a policy.
   The Application already notes the governor did not move with an earlier size cut.
2. **Fan-out.** A local-backend Tempo is effectively single-writer. Object storage is what
   lets Tempo run multiple ingesters, which is the horizontal-scale axis the maintainer
   asked about on 2026-09-04.

## Before changing it

`tempo` 2.3.0's S3 backend points at the same seaweedfs the other two use, so this looks
mechanical — but *looks mechanical* is how the inert-valuesObject defects got in. The
change is: set `tempo.storage.trace.backend: s3` with the seaweedfs endpoint, then verify
by **render** that the value reaches the container, and by a live run that a trace written
before a pod restart is readable after it. Without that second half it is a config edit
with no evidence behind it.
