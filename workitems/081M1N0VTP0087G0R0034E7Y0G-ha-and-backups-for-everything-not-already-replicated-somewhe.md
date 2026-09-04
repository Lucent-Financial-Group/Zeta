---
id: 081M1N0VTP0087G0R0034E7Y0G
type: task
state: backlog
priority: P1
slug: ha-and-backups-for-everything-not-already-replicated-somewhe
title: "HA and backups for everything not already replicated somewhere else"
created: 2026-09-04T01:34:52.096Z
depends_on: []
composes_with: []
---

# HA and backups for everything not already replicated somewhere else

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1N0VTP0087G0R0034E7Y0G-*.md` glob. -->

Aaron 2026-09-03: *"we need to file an HA one too we want to make sure we have HA and
backups enabled for everything that's not already replicated somewhere."*

## The backup half, measured first because the answer is a number

Searched the whole cluster tree on 2026-09-03 for every backup mechanism this stack could
plausibly use — `backupTarget`, `velero`, `barmanObjectStore`, `backup:`, `RecurringJob`,
`VolumeSnapshot`:

> **Zero hits. There is no backup machinery anywhere in `full-ai-cluster/`.**

Not a partial story, not one app missing a schedule. Nothing takes a backup of anything.
That includes:

- **Longhorn** — installed, no `backupTarget` configured, so no volume backups and no
  `RecurringJob` snapshots.
- **CloudNativePG** — the operator is deployed (#16416) with no `Cluster` CR yet, so its
  `barmanObjectStore` continuous archiving is unconfigured by construction. Whenever the
  first `Cluster` lands, it should land WITH backups rather than acquiring them later.
- **CockroachDB** — 3 Raft members and 48Gi each, the largest storage consumer in the
  catalogue, with no `BACKUP` schedule.
- **Vault** — no snapshot schedule. A lost Raft volume is a lost unseal state.

**Replication is not backup, and it is the specific confusion this item exists to prevent.**
Three Raft members protect against a node dying. They do not protect against a bad write, a
`DELETE`, a schema migration, an operator bug, or `prune: true` reaping a resource — all of
which replicate faithfully and instantly to every replica. Aaron's phrasing —
*"everything that's not already replicated somewhere"* — is the right test for the HA half
and is not sufficient for the backup half.

## The HA half — what already declares redundancy it does not have

`single-node-budget.json` carries `acknowledgedFalseRedundancy`, and it is not empty. Six
Applications declare multi-replica topologies on a `nodeCount: 1` cluster:

| app | |
|---|---|
| `cockroachdb` | 3 Raft members |
| `vault` | Raft HA |
| `nats` | 3-node JetStream cluster |
| `redis` | 2 read replicas |
| `platform` | |
| `kubevirt` | |

Plus [081M1N0VTMH087G0R001SKDMM0], found the same day: `dapr-scheduler-server` renders 3
replicas and 48Gi of PVCs while its Application says `ha: { enabled: false }`.

**Three copies in one failure domain is not HA — it is three times the disk for the same
availability**, and the acknowledgement file is honest that this is DEBT rather than an
exemption. The item is not "turn HA on"; it is to decide, per workload, which of these three
it is:

1. **Genuinely redundant** once a second node exists — keep, and make the node count the
   blocker rather than the topology.
2. **False redundancy that costs real resources today** — scale to 1 until there are nodes
   to spread across, and record what re-enables it.
3. **Needs a backup instead**, because no replica count protects it from the failure that
   actually threatens it.

## Shape of the work

1. **A per-workload table** — what is replicated, across how many failure domains, what
   backs it up, and what the recovery path is. Derived from the manifests, not hand-written,
   or it goes stale like every inventory does.
2. **Backups first, HA second.** Backups protect against the failures that replication
   cannot, and they work on one node today. HA on `nodeCount: 1` mostly cannot be honest
   until there is a second node.
3. **A falsifier**: a workload with a PVC and no backup path is a finding. That check can
   exist before any backup does, and its first run is the inventory.
4. **The recovery path is tested, or it is a belief.** An untested restore is the storage
   form of a check that cannot fail — it looks like coverage and has never once run.

## Depends on hardware

The HA half is partly blocked on node count — one node cannot host a real quorum. The backup
half is not blocked on anything.

Filed, not started. Sequenced behind the in-flight load-balancer and Cilium work.

Children: [081M1N0VTMH087G0R001SKDMM0] (dapr scheduler replicas vs declared ha).
