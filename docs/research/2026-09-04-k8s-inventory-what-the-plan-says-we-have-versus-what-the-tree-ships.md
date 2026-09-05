# The k8s inventory: what the plan says we have, versus what the tree ships

*2026-09-04. Every row is checked against the tree, not against a document. Where a
claim could not be checked it says so. Written before hardware testing, at the
maintainer's request: "lets do a deep review of all our previous k8s plans and
inventory what we have vs what we are missing this is the last thing before we test
hardware again."*

## 0. The headline, in three lines

1. **Every frozen Bitnami image in the tree comes from ONE chart**, and the current
   version of that chart removes them structurally. §1.
2. **The plan's own §7 "immediate next steps" are all built** — including two the plan
   still lists as to-do. What is missing is one NixOS module and the game-server
   controller. §2.
3. **The most product-shaped part of the tree is the part CI never tests.** §3.

## 1. Legacy: `bitnamilegacy` is a gitlab problem, and only a gitlab problem

Bitnami relegated its older public images to the `bitnamilegacy/*` namespace, which is
**frozen — it receives no security updates**. Measured across
`lane-footprints.json`, four such images are pulled:

| image | pulled by |
| --- | --- |
| `bitnamilegacy/postgresql:14.8.0` | `gitlab`, `infra/gitlab` |
| `bitnamilegacy/redis:6.2.16-debian-12-r1` | `gitlab`, `infra/gitlab` |
| `bitnamilegacy/postgres-exporter:0.12.0-debian-11-r86` | `gitlab`, `infra/gitlab` |
| `bitnamilegacy/redis-exporter:1.46.0-debian-11-r8` | `gitlab`, `infra/gitlab` |

**All four, one chart.** Nothing else in the tree pulls a legacy image, and the one
remaining `bitnami/*` image — `bitnami/sealed-secrets-controller:0.39.1` — is in the
LIVE namespace, not the legacy one.

### The fix is the chart bump, and it is structural rather than incidental

Verified by unpacking both versions and listing their vendored subcharts:

| | vendored subcharts |
| --- | --- |
| `gitlab` **8.7.0** (our pin) | includes **`postgresql`, `redis`, `minio`** |
| `gitlab` **10.3.1** (newest) | **none of the three** |

GitLab 10.x removed the bundled datastores. `helm template` at 10.3.1 refuses outright
with *"external Redis became required"*, *"external PostgreSQL became required"* and
*"The chart provides no longer bundled object storage solution"*. So the legacy images
are not "upgraded away" — the subcharts that pulled them are gone.

**That makes the bump a wiring job, not a version edit**, and the three externals it
needs all have candidates already in the tree:

| gitlab 10.x requires | candidate in tree | state |
| --- | --- | --- |
| external PostgreSQL | `cloudnativepg` | operator installed (#16416); **no `Cluster` CR yet** |
| external Redis | `redis` (valkey) | running |
| external object storage | `seaweedfs` | running, S3-compatible |

This is not a coincidence: `cloudnativepg` was added on 2026-09-02 and the sync-wave
graph records it as *"the shared prerequisite of the gitlab and temporal bumps"*.
Somebody already saw this. What is missing is the `Cluster` CR and the values wiring.

### temporal is the same shape

| | vendored subcharts |
| --- | --- |
| `temporal` **0.59.0** (our pin) | `cassandra`, `elasticsearch`, `grafana`, `prometheus` |
| `temporal` **1.6.0** (newest) | **none** |

Our Application **already** uses an external datastore (CockroachDB), and its own header
argues at length against the bundled Cassandra — *"the chart's bundled subchart is
`cassandra` 0.14.3 from the ARCHIVED helm/incubator repo … `persistence.enabled: false`
by default — i.e. emptyDir"*. So the 1.6.0 bump **deletes a subchart we already refuse
to use.** It is the more aligned of the two bumps, and the lower risk.

### headscale is the one with no upgrade path

`headscale` 0.16.0 is at the newest published version and upstream has not published in
**560 days** — `DORMANT`, not behind. There is nothing to bump to. That is a
replace-or-retire decision, not a maintenance one.

### The stale claim this review corrected

`storage-profiles.json` carried *"the pinned repoURL is stale"* for sealed-secrets. The
URL it names (`bitnami-labs.github.io/sealed-secrets`) does still 404 — re-checked — but
the Application stopped using it on 2026-08-21 and its current repoURL answers 200. The
stale claim was in the evidence string, not the manifest. Corrected.

## 2. `PLATFORM-ARCHITECTURE.md` §7 "immediate next steps", checked one by one

| # | step | in the tree? |
| --- | --- | --- |
| 1 | Headlamp ArgoCD app | **yes** — `applications/headlamp/` |
| 2 | Cilium LB-IPAM: `CiliumLoadBalancerIPPool` + `CiliumL2AnnouncementPolicy` | **yes** — `applications/cilium-lb-ipam/{ip-pool,l2-policy}.yaml`, both kinds present |
| 3 | KubeVirt operator + CDI | **yes** — both apps, vendored verbatim |
| 3 | `nixos/modules/kubevirt-node.nix` | **NO — not in the tree** |
| 4 | `GameServer` CRD | **yes**, but not where the plan says: `applications/platform/crd-gameserver.yaml` |
| 4 | template-based controller | **partial** — `platform/controller.yaml` exists; whether it reconciles `GameServer` is unverified here |
| 4 | GMod instance | **yes** — `applications/game-hosting/gmod/` |

**The plan understates itself.** §6 lists a `Tenant` CRD as a phase-1 "draft" and
multi-tenancy as phase 2; `platform/` already ships **seven** CRDs — `App`, `Blueprint`,
`Deployable`, `GameServer`, `Policy`, `Tenant`, `WebApp` — plus a controller, a portal, a
gateway and a default policy. The roadmap is behind the repository, which is the
opposite of the usual failure and worth knowing before anyone plans from it.

**Genuinely missing**, and both are named in the plan:

- `kubevirt-node.nix` — the NixOS module that makes a node able to host VMs. KubeVirt
  and CDI are installed; the host-side enablement is not in the tree.
- **OpenCost** (phase 3 billing) — appears only in the plan document.

## 3. The gap that matters most before hardware: what CI never tests

`DEFAULT_ROOT_DEV_CATALOG.excludeGlob` defers **eight** Applications from the dev lane:

```text
cilium, cilium-lb-ipam, longhorn, ollama, vllm, gitlab, temporal, platform
```

Read that list against §2. **`platform` is the entire product surface** — every CRD, the
controller, the portal, the gateway, the default policy — and it is the one thing the
included proof never exercises. `cilium` and `cilium-lb-ipam` are the networking the
game/VM external ports depend on. `longhorn` is the storage every stateful workload
binds against.

Each exclusion has a recorded reason and most are honest (a kind node cannot run
Longhorn's real provisioner; a LoadBalancer cannot get an address). The point is not
that the exclusions are wrong. It is that **"the included proof is green" means the
40 Applications that can run on a runner are green**, and the eight that carry the
product are verified by hardware or not at all.

That is the correct thing to know before testing hardware, because it says what the
hardware test is actually *for*: it is not a bigger version of the CI lane, it is the
**only** test of eight Applications.

## 4. What is measured versus what is asserted

| claim | status |
| --- | --- |
| legacy images and their source | **measured** — `lane-footprints.json`, image-by-image |
| subchart removal in both bumps | **measured** — both chart versions unpacked and their `charts/` listed |
| §7 steps present or absent | **measured** — file existence and manifest kinds |
| the eight-app exclusion | **measured** — read from `ports.ts` |
| *"the controller reconciles GameServer"* | **NOT checked** — `controller.yaml` exists; its behaviour was not read |
| *"the hardware test will exercise the eight"* | **NOT checked** — no hardware run is in evidence here |

## 5. Work items

- `081M1PZA3TF087G0R002VKM8RJ` — gitlab 8.7.0 → 10.3.x: the three externals, and the
  `bitnamilegacy` removal that comes with it.
- `081M1PZA3VF087G0R003W8FWMS` — temporal 0.59.0 → 1.6.x: the aligned bump.
- `081M1PZA3W6087G0R003DJ5RDD` — headscale is DORMANT: replace or retire.
- `081M1PZA3WV087G0R001A8WTG4` — the eight untested Applications, and what a hardware
  run must therefore cover.
