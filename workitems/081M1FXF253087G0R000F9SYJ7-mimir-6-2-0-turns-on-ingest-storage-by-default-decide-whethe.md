---
id: 081M1FXF253087G0R000F9SYJ7
type: task
state: backlog
priority: P2
slug: mimir-6-2-0-turns-on-ingest-storage-by-default-decide-whethe
title: "mimir 6.2.0 turns on ingest-storage by default — decide whether to keep the bundled Kafka"
created: 2026-09-02T01:59:15.875Z
depends_on: []
composes_with: []
---

# mimir 6.2.0 turns on ingest-storage by default — decide whether to keep the bundled Kafka

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1FXF253087G0R000F9SYJ7-*.md` glob. -->

## What changed under us

`mimir-distributed` 6.2.0 ships **both** `kafka.enabled: true` and
`mimir.structuredConfig.ingest_storage.enabled: true` in its own `values.yaml`.
5.5.1 rendered no Kafka at all. So the bump (#16301) moved mimir onto the
**ingest-storage** write path: distributors publish to a bundled
`StatefulSet/mimir-kafka` (`apache/kafka-native` 4.1.0) and ingesters consume
from it. This is not an extra sidecar — it is on the write path, so the pod
failing to schedule stops metric ingestion rather than degrading it.

Nothing declared it, because #16301 changed only the Application and never
re-measured the snapshots. It surfaced on 2026-09-01 while re-measuring for an
unrelated redis change.

## What it costs, measured

| | dev | metal |
|---|---|---|
| CPU | 25m (floored) | 1000m |
| memory | 1024Mi | 1024Mi |
| disk | 5Gi on the cluster default class | same |

The memory is the number that matters: the dev/CI lane now sits at **9036Mi of
a 9216Mi envelope — 180Mi of headroom**, and roughly 1Gi of that consumption is
this one reservation. It fits, and it is the tightest this lane has been.

## The decision

Two branches, and the ledger now prices both honestly either way:

1. **Keep it.** Accept upstream's default. This is where Grafana is heading, so
   it is the better-supported path, and opting out gets less trodden over time.
2. **Opt back out to the classic architecture.** Set **both** `kafka.enabled:
   false` and `ingest_storage.enabled: false`. Not a one-line revert: the
   chart's own values note that ingest-storage needs only **2** ingester zones
   where classic needs **3**, so the two paths do not have the same shape and
   our 3-zone config was written for classic.

Deliberately NOT settled as a side effect of a redis change. What is settled is
that the cost is declared (`full-ai-cluster/mimir/kafka`), so whichever branch
is taken, the arithmetic moves with it instead of hiding.

## Related

- The Kafka PVC (5Gi, cluster default class) is acknowledged in
  `rendered-storage-claims.baseline.json` on the same ground as its siblings —
  non-longhorn class, outside the ladder's declared scope — and NOT because the
  component was chosen.
- Whether this interacts with the open question in
  `081M1FG1RCW087G0R000TAZWJX` (mimir goes Degraded once seaweedfs S3 auth is
  enforced) is **unknown and untested** — both touch mimir's storage path, which
  is a reason to look, not a finding.
