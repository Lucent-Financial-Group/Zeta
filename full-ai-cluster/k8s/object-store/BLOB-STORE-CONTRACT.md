# Blob store contract — shared S3 for the cluster

Zeta ships **one** S3-compatible backend: **SeaweedFS**. Loki and Mimir address it
directly.

| App | Sync | Endpoint (in-cluster) | Port | Consumer default |
|-----|------|------------------------|------|------------------|
| **seaweedfs/** | automated | `blob-store-seaweedfs-all-in-one.object-store.svc` | 8333 | **yes** |

## MinIO was removed on 2026-09-01, and why

`minio/minio` is **archived and read-only**, and the chart source lived *inside that
same repository* — so the stale chart and the unmaintained server are one fact, not
two. Newest chart `5.4.0`, created `2025-01-02`, shipping appVersion
`RELEASE.2024-12-18T13-15-44Z`, verified live against `charts.min.io` rather than
read from a changelog. Development moved to the proprietary **AIStor**; the admin
console was removed from the community build in May 2025.

**The reason this could not keep waiting:** the AGPL community build carries **four
unpatched HIGH advisories, two of them unauthenticated object write**, and every fix
ships only in AIStor. That is an S3 endpoint inside the cluster that anyone who can
reach it may be able to write to, with no upstream that will ever patch it.

Full survey, with every upstream claim carrying the URL or API call it was read from:
[`docs/research/2026-08-21-minio-is-archived-upstream-what-replaces-our-s3-and-seaweedfs-is-already-running.md`](../../../docs/research/2026-08-21-minio-is-archived-upstream-what-replaces-our-s3-and-seaweedfs-is-already-running.md).
That document recommended sequencing the retirement *behind* the metal boot and
behind a large-object A/B. **The maintainer overrode that sequencing on 2026-09-01**
— "we should remove this now, i've asked to remove it several times since it's not
supported" — and the unpatched-write advisories are why removing beats waiting.

**Garage was eliminated on the API, not on taste:** it has no conditional writes, and
upstream calls changing that *structurally impossible*.

That is a security posture, not a staleness metric, and it is why
`docs/CHART-CURRENCY.md` reads MinIO as `DORMANT` rather than `CURRENT` despite it
being the one pin that was not behind — being at the newest version means nothing
when upstream stopped publishing.

**The migration was an endpoint change and nothing more.** MinIO, SeaweedFS and
Garage serve the same S3 API surface, both backends already reconciled side by
side, and SeaweedFS already provisioned all five shared buckets with the same dev
identity. Loki's single endpoint and Mimir's three moved from
`blob-store.object-store.svc:9000` to
`blob-store-seaweedfs-all-in-one.object-store.svc:8333`.

**SeaweedFS is Apache 2.0** — no AGPL exposure — and actively published: `4.45.0`
landed 2026-09-01.

### What this change does NOT prove

The `included` gate proves SeaweedFS **deploys**. It does not prove Loki and Mimir
read and write through its S3 gateway, and this file has always said edge-case
differences vs AWS S3 exist. Both consumers were `Healthy` against MinIO before
this change; the first `included` run after it is what re-establishes that against
SeaweedFS. Treat a red Loki or Mimir there as this migration's finding, not as an
unrelated flake.

### Still pinned behind

`seaweedfs` is at `4.33.0` and `4.45.0` is out. The bump is deliberately NOT taken
here: removing a backend and jumping twelve minor versions in one change would make
a failure ambiguous between the two. Bump it separately, after the consumers are
proven green on the endpoint they now use.

## Why SeaweedFS (the comparison that decided it, kept for the record)

| | MinIO | SeaweedFS |
|---|-------|-----------|
| **Sweet spot** | Pure S3 semantics; Loki/Mimir/backup tools that speak S3 | Many small objects; optional filer/FUSE; lighter all-in-one footprint |
| **S3 compatibility** | Broad AWS S3 parity (IAM, lifecycle, replication, versioning) | S3 gateway — works for Loki/Mimir, but edge-case differences vs AWS exist |
| **Extra protocols** | S3 (+ optional FTP in chart) | S3 + native HTTP filer + optional SFTP |
| **Scale-out story** | Distributed erasure-coded pools | Master / volume / filer topology; tiering to cloud blob |
| **Ops weight (dev)** | Standalone pod + PVC | allInOne pod + PVC (lighter) |
| **Console** | Built-in web UI | Filer UI / metrics; less “S3 console” polish |

**Zeta default:** MinIO for observability consumers (safer S3 fidelity). Keep
SeaweedFS running for comparison, filer workloads, and future backup paths that
benefit from Seaweed’s append/small-file strengths.

## Layering

```
Loki / Mimir / backups  →  S3 API  →  MinIO or SeaweedFS  →  PVC (zeta-local-path or longhorn)
```

Longhorn (or `zeta-local-path`) provides **block** volumes. The blob store provides **object**
storage. Observability apps never talk to Longhorn directly for chunks.

## Shared buckets

Each backend provisions its **own** copy of these buckets (isolated stores):

| Bucket | Consumer |
|--------|----------|
| `loki-chunks` | Loki write/read/backend |
| `loki-ruler` | Loki ruler |
| `mimir-tsdb` | Mimir blocks storage |
| `mimir-ruler` | Mimir ruler + alertmanager storage |
| `zeta-backups` | DB dumps, snapshots (future CronJobs) |

## Dev credentials (pre-v1)

Both backends use the same dev identity for now:

- **Access key:** `zeta-blob-store`
- **Secret key:** `zeta-blob-store-dev-secret`

Promote to Vault / External Secrets before any production tenant data lands.

## Consumer wiring (MinIO — default)

**Loki** (`loki/Application.yaml`):

```yaml
minio:
  enabled: false
loki:
  storage:
    type: s3
    bucketNames: { chunks: loki-chunks, ruler: loki-ruler }
    s3:
      endpoint: blob-store.object-store.svc:9000
      accessKeyId: zeta-blob-store
      secretAccessKey: zeta-blob-store-dev-secret
      insecure: true
      s3ForcePathStyle: true
```

**Mimir** (`mimir/Application.yaml`):

```yaml
minio:
  enabled: false
mimir:
  structuredConfig:
    blocks_storage:
      backend: s3
      s3:
        endpoint: blob-store.object-store.svc:9000
        bucket_name: mimir-tsdb
        access_key_id: zeta-blob-store
        secret_access_key: zeta-blob-store-dev-secret
        insecure: true
    alertmanager_storage:
      backend: s3
      s3:
        endpoint: blob-store.object-store.svc:9000
        bucket_name: mimir-ruler
        access_key_id: zeta-blob-store
        secret_access_key: zeta-blob-store-dev-secret
        insecure: true
    ruler_storage:
      backend: s3
      s3:
        endpoint: blob-store.object-store.svc:9000
        bucket_name: mimir-ruler
        access_key_id: zeta-blob-store
        secret_access_key: zeta-blob-store-dev-secret
        insecure: true
```

## Consumer wiring (SeaweedFS — A/B test)

Replace `endpoint` and port in the snippets above:

```yaml
endpoint: blob-store-seaweedfs-all-in-one.object-store.svc:8333
```

Keep bucket names and credentials unchanged. Sync Loki/Mimir after editing.
Data does **not** migrate automatically — each backend has its own empty/filled buckets.

## Cutover procedure (move consumers MinIO → SeaweedFS)

1. Ensure `seaweedfs` Application is Synced+Healthy (buckets exist).
2. Update Loki/Mimir `endpoint` to the SeaweedFS row in the table above.
3. `argocd app sync loki mimir`
4. Optional: scale/write test queries to compare behaviour before decommissioning MinIO.

To revert, point endpoints back to `blob-store.object-store.svc:9000`.

## Storage class

| Profile | `persistence.storageClass` / `allInOne.data.storageClass` |
|---------|-----------------------------------------------------------|
| kind CI / k3d dev | `zeta-local-path` |
| homelab k3d full (Longhorn) | `longhorn` |

Changing to `longhorn` excludes the blob-store app from `--scope included` proof
(harness skips apps referencing Longhorn) but keeps it in `--scope full`.
