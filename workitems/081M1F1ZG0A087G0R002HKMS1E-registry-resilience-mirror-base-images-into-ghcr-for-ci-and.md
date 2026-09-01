---
id: 081M1F1ZG0A087G0R002HKMS1E
type: task
state: backlog
priority: P2
slug: registry-resilience-mirror-base-images-into-ghcr-for-ci-and
title: "Registry resilience: mirror base images into GHCR for CI, and a peer-to-peer pull-through on our own hardware"
created: 2026-09-01T17:58:54.218Z
depends_on: []
composes_with: []
---

# Registry resilience: mirror base images into GHCR for CI, and a peer-to-peer pull-through on our own hardware

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1F1ZG0A087G0R002HKMS1E-*.md` glob. -->

## The problem, stated precisely

Two different problems get called "rate limiting" and they need different fixes.

1. **CI pull volume.** GitHub-hosted runners share egress IPs, so anonymous Docker Hub
   pulls (100 per 6h per IP) are consumed by everyone on that IP, not just us. Our own
   pull count is not the variable we control.
2. **Upstream withdrawal.** This is the one that has already bitten us, twice in a week.
   Bitnami withdrew every versioned tag from `docker.io/bitnami/*`; the pins went to HTTP
   404, charts became unpullable and unmeasurable, and the repair was to re-point at
   `bitnamilegacy/*` — an archive frozen since 2025-08 (`081M1F1K5N5087G0R0019JKRV0`).
   MinIO archived its repository entirely. **No rate limit was involved in either.**

A cache fixes (1). Only a *copy we own* fixes (2), and (2) is the one with teeth.

## Correcting one assumption before it becomes a plan

**GHCR is not a pull-through proxy.** It does not front `docker.io` and it has no
upstream-caching mode, so "point CI at GHCR and let it cache" is not a thing that can be
configured. Recording this here because it is the obvious first design and it does not
exist.

What GHCR *can* do is hold **our own copies** of the base images we depend on — and for
problem (2) that is strictly better than a cache. A cache expires and re-fetches from an
upstream that may have deleted the tag; a copy does not.

## The shape

**A. Mirror the base images we depend on into GHCR.** A scheduled workflow reads the image
roster we already compute (`src/Core.TypeScript/cluster/image-footprint.measured.json`, 124
images) and `skopeo copy`s each into `ghcr.io/lucent-financial-group/mirror/<path>`, pinned
**by digest**. Applications pull from the mirror.

- Fixes CI volume: GHCR pulls from Actions authenticate with `GITHUB_TOKEN`, are not
  metered against us, and are not subject to Docker Hub's limit.
- Fixes withdrawal: an upstream deletion stops future syncs; it does not remove what we
  already hold. Had this existed, the Bitnami withdrawal would have been a sync warning
  rather than a fleet-wide unpullable-image event.
- Cost: free — public GHCR packages carry no storage or bandwidth charge.

**B. Peer-to-peer pull-through on our own hardware.** K3S reads
`/etc/rancher/k3s/registries.yaml` natively, so the mirror is a config file, not an
add-on. Two candidate mechanisms, and the choice is not a toss-up here:

| | central mirror (zot / Harbor) | Spegel |
|---|---|---|
| shape | one registry every node must reach | nodes serve each other what they already hold |
| new failure mode | **it is a single point every pull routes through** | none — a node that cannot find a peer falls back upstream |
| this repo's own rule | that is an **appointed hub** | peers, which is what §1 asks for |

`itron-hub-patent-boundary-p2p-is-the-upgrade.md` is directly on point: the discriminator
is **exit**, and a mirror every node MUST route through is a hub in the strict sense. Spegel
is the recommendation.

**HONEST LIMIT, and it is why A and B are complementary rather than alternatives:** Spegel
can only serve an image some node has already pulled. A cold cluster's first pull still goes
upstream, so Spegel alone does nothing for problem (2). A without B leaves per-node pull
amplification on real hardware; B without A leaves us exposed to deletion. Both, or the
gap stays open.

## Measured starting state (2026-09-01)

- No `registries.yaml` and no mirror configuration anywhere in `full-ai-cluster/nixos/`
  or `full-ai-cluster/k8s/` — checked, not assumed.
- The org already publishes three **public** GHCR packages (`zeta-portal`,
  `zeta-platform-controller`, `zeta-ci-runtime`); anonymous manifest GET returns HTTP 200.
  So the registry, its permissions, and the publish path are proven — this item adds a
  mirror namespace to a mechanism that already works.
- 124 images are already enumerated and digest-measured by the footprint tool, so the
  roster this needs is a read of an existing artifact rather than a new inventory.

## A gap this item does NOT close, but must not be confused with

New GHCR packages are created **private** by default, and nothing in
`build-platform-images.yml` sets visibility — so `zeta-orleans-silo` will land private on
its first push while its StatefulSet carries no `imagePullSecret`. `PATCH
/orgs/{org}/packages/container/{name}` returns 404, so it is not automatable by that route
and the mechanism is currently **unknown**. Tracked separately; noted here because "GHCR is
fine, three packages are public" would otherwise read as covering it.

## Done when

Applications pull base images from a mirror we control; a scheduled sync keeps it current
and reports (never silently skips) an upstream that has stopped publishing; K3S nodes on
real hardware resolve through a peer-to-peer mirror with upstream fallback; and a removed
upstream tag is demonstrated to leave a cluster still able to pull — demonstrated, not
assumed.

## Origin

Aaron, 2026-09-01: *"we for sure need to do this 100% lets make sure we are setup for this,
if we can make GHCR our pull through backup for our github jobs that would be amazing. on
our own hardware we can have an in cluster pull though."* The split between the two
environments is his; the correction that GHCR mirrors rather than proxies is recorded above
so the plan does not start from an option that does not exist.
