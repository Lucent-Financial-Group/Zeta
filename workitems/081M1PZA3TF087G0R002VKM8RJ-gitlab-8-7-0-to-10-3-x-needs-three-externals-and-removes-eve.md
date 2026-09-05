---
id: 081M1PZA3TF087G0R002VKM8RJ
type: task
state: backlog
priority: P1
slug: gitlab-8-7-0-to-10-3-x-needs-three-externals-and-removes-eve
title: "gitlab 8.7.0 to 10.3.x needs three externals, and removes every bitnamilegacy image"
created: 2026-09-04T19:46:11.919Z
depends_on: []
composes_with: []
---

# gitlab 8.7.0 to 10.3.x needs three externals, and removes every bitnamilegacy image

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1PZA3TF087G0R002VKM8RJ-*.md` glob. -->

## Why this is the security item, not just a version item

Every `bitnamilegacy/*` image in the tree — **four of them** — is pulled by this one chart,
and `bitnamilegacy` is Bitnami's **frozen** namespace: it receives no security updates.

| image | version |
| --- | --- |
| `bitnamilegacy/postgresql` | 14.8.0 |
| `bitnamilegacy/redis` | 6.2.16-debian-12-r1 |
| `bitnamilegacy/postgres-exporter` | 0.12.0-debian-11-r86 |
| `bitnamilegacy/redis-exporter` | 1.46.0-debian-11-r8 |

Nothing else in the tree pulls a legacy image. The one remaining `bitnami/*` image
(`sealed-secrets-controller`) is in the live namespace.

## The bump removes them structurally, not incidentally

Verified by unpacking both versions and listing `charts/`:

| | vendored subcharts |
| --- | --- |
| **8.7.0** (our pin) | includes `postgresql`, `redis`, `minio` |
| **10.3.1** (newest) | none of the three |

`helm template` at 10.3.1 refuses with *"external Redis became required"*, *"external
PostgreSQL became required"* and *"The chart provides no longer bundled object storage
solution"*. The images are not upgraded away — the subcharts that pulled them are gone.

## So it is a wiring job, and the prerequisites already exist

| required | candidate | state |
| --- | --- | --- |
| external PostgreSQL | `cloudnativepg` | operator installed (#16416); **no `Cluster` CR yet** |
| external Redis | `redis` (valkey) | running |
| external object storage | `seaweedfs` | running, S3-compatible |

Not a coincidence — the sync-wave graph records `cloudnativepg` as *"the shared
prerequisite of the gitlab and temporal bumps"*. The missing pieces are the `Cluster` CR
and the values wiring.

## Verification is hardware-only

`gitlab/**` is in `DEFAULT_ROOT_DEV_CATALOG.excludeGlob`, so the CI lane never applies it.
Whatever lands here is verified on the box or not at all — see
[081M1PZA3WV087G0R001A8WTG4].
