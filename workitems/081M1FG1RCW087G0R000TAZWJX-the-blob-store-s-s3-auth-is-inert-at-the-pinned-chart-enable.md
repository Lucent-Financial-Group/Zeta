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

## 2026-09-03 — the live dump answered it, and the answer is not S3 auth

Riven handed this lane over after closing the Cilium cell; the "must not be fixed by guessing"
line above was right. Read from the included-proof dump on run 33713945771 / 33736439359:

**Cause A — seaweedfs 4.45.0 does not render under the ArgoCD the kind lane bootstraps.**
`condition ComparisonError … helm template … Error: parse error at
(seaweedfs/templates/shared/security-configmap.yaml:21): function "fromToml" not defined`.
`fromToml` is a **Helm 4** template function. The kind-lane bootstrap installed argo-cd
**7.7.10 = ArgoCD v2.13.2 = Helm 3**; the self-managed Application upgrades to 10.7.0
(v3.5.2, Helm 4 only) at wave −90 but the repo-server had already **cached** the failure
(`Manifest generation error (cached)`), and a cache entry is not invalidated by a binary
swap. Consequence chain, all measured: seaweedfs `sync=Unknown health=Healthy` **vacuously**
(zero applied resources) → no `blob-store-seaweedfs-all-in-one` Service → kube-dns
`no such host` ×700 → mimir's startup `sanity-check` module fails → every mimir module
"failed … because it depends on module sanity-check" → 9–12 restarts each. Loki logged **zero**
S3 lines: it never tried, so its Healthy was as vacuous as seaweedfs's. Fix: pin the kind
bootstrap to 10.7.0 (this PR); the k3s bootstrap had already moved on 2026-09-01.

**Cause B — independent of A — `mimir-kafka-0` never schedules:** `0/1 nodes are available:
1 Insufficient cpu` (kafka requests `cpu: 1` at the metal rung the committed tree carries; the
lane is over the runner budget, which is the already-acknowledged `acknowledgedRungBudgetGap`).
With ingest-storage on by default in mimir-distributed 6.2.0, no Kafka means the write path
cannot come up even after A is fixed. That is the next item on this lane, and it is a
capacity/rung decision, not a chart fix.

**What this leaves of the original claim.** The auth *finding* stands — 4.33.0 rendered zero
identities and fails open, 4.45.0 renders them and fails closed — and the "done when" still
holds: auth must be *demonstrated enforced* by a test. What is retracted is the implication that
auth becoming real is *why mimir went Degraded*. It was not reachable to find out, because the
store was never applied.
