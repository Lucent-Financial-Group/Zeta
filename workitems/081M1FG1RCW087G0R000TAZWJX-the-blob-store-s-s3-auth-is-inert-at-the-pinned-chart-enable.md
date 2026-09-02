---
id: 081M1FG1RCW087G0R000TAZWJX
type: bug
state: backlog
priority: P2
slug: the-blob-store-s-s3-auth-is-inert-at-the-pinned-chart-enable
title: "The blob store's S3 auth is INERT at the pinned chart — enableAuth true, zero identities rendered"
created: 2026-09-01T22:04:48.412Z
depends_on: []
composes_with: []
---

# The blob store's S3 auth is INERT at the pinned chart — enableAuth true, zero identities rendered

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1FG1RCW087G0R000TAZWJX-*.md` glob. -->

## The measurement

`full-ai-cluster/k8s/applications/seaweedfs/Application.yaml` declares S3 auth:

```yaml
s3:
  enabled: false
  credentials:
    admin:
      accessKey: zeta-blob-store
      secretKey: zeta-blob-store-dev-secret
allInOne:
  s3:
    enabled: true
    enableAuth: true
```

Rendered at the **pinned** chart version (4.33.0) against those exact values:

| | 4.33.0 (pinned) | 4.45.0 |
|---|---|---|
| `identities` in the render | **0** | 1 |
| `zeta-blob-store` in the render | **0 mentions** | 4 |
| `config-s3-users` volume at `/etc/sw/s3` | **absent** | present |
| bucket declarations | 12 | 12 |

**No identity file is produced at the pinned version.** The credentials are declared and
inert. Combined with the loader's fail-**open** behaviour at that version — it changed to
fail closed only in a later release — the S3 gateway serves with no identities configured.

> **Anything able to reach `blob-store-seaweedfs-all-in-one.object-store.svc:8333` can
> read and write the blob store, with or without credentials.**

That endpoint currently holds loki chunks, loki ruler state, mimir TSDB blocks, mimir
ruler state, and `zeta-backups`.

## Why it went unnoticed

The Application looks correct. `enableAuth: true` is right there, credentials beside it,
and every static check passes — the keys are not *inert* in the `inert-valuesobject-keys`
sense (the chart HAS those keys), they simply do not reach a rendered identity file at
this version. This is the vacuity class one level up: **a configuration that is present,
well-formed, checked by every guard we own, and not in effect.**

Nothing in the tree asserts that S3 auth is *enforced*, only that it is *configured*.

## How it surfaced

Not by looking for it. #16279 bumps seaweedfs to 4.45.0 to close CVE-2026-77611, and the
`live kind included` proof went red with `mimir is Unknown/Degraded`. Investigating that
failure showed the bump **turns on authentication that was previously doing nothing** —
so the CVE fix and the auth fix are entangled, and the Degraded mimir is a *consequence
of auth beginning to work*, not of the CVE patch.

## What is NOT the problem (checked)

- **Credentials match.** mimir presents `zeta-blob-store` / `zeta-blob-store-dev-secret`;
  seaweedfs declares exactly those.
- **Permissions are sufficient.** The 4.45.0 identity is `anvAdmin` with
  `["Admin","Read","Write"]`.
- **Buckets are declared identically** at both versions.

## Open, and needing a live cluster

Why mimir is Degraded once auth is enforced — bucket ownership under a newly-enforced
identity, a rollout window while the Secret propagates, or something else. A render
cannot answer it. **This must not be fixed by guessing at a security bump.**

## Also noticed

The 4.45.0 render carries a second, chart-generated read-only identity (`anvReadOnly`)
with a fixed access/secret pair. Whether that is deterministic per-chart or regenerated
per-render decides whether it is a static credential in a rendered manifest.

## Done when

S3 auth on the blob store is **demonstrated enforced** — an unauthenticated request is
refused, by a test rather than by reading the values — and mimir and loki reach
Synced/Healthy against the authenticated store.

## Origin

Found 2026-09-01 while diagnosing why #16279 (the seaweedfs CVE bump) failed the live
kind proof. The CVE was the reason to look; this was underneath it.
