---
id: 081M1PZA3WV087G0R001A8WTG4
type: task
state: backlog
priority: P1
slug: eight-applications-are-excluded-from-the-dev-lane-and-they-c
title: "eight Applications are excluded from the dev lane, and they carry the product surface"
created: 2026-09-04T19:46:11.995Z
depends_on: []
composes_with: []
---

# eight Applications are excluded from the dev lane, and they carry the product surface

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1PZA3WV087G0R001A8WTG4-*.md` glob. -->

## The finding

`DEFAULT_ROOT_DEV_CATALOG.excludeGlob` defers eight Applications from the dev lane:

```text
cilium, cilium-lb-ipam, longhorn, ollama, vllm, gitlab, temporal, platform
```text

Read that against what those Applications carry:

| excluded | what it is |
| --- | --- |
| **`platform`** | **the entire product surface** — seven CRDs (App, Blueprint, Deployable, GameServer, Policy, Tenant, WebApp), the controller, the portal, the gateway, the default policy |
| `cilium`, `cilium-lb-ipam` | the networking the game/VM external ports depend on |
| `longhorn` | the storage every stateful workload binds against |
| `gitlab`, `temporal` | the two charts with pending major bumps |
| `ollama`, `vllm` | GPU model-serving, deferred |

## What this is NOT

It is not a claim that the exclusions are wrong. Each has a recorded reason and most are
plainly right: a kind node cannot run Longhorn's real provisioner, and a
`type: LoadBalancer` Service cannot get an address on a single-node lane.

## What it IS

**"The included proof is green" means the 40 Applications that can run on a runner are
green.** The eight that carry the product are verified on hardware or not at all.

That is the thing worth knowing *before* a hardware test, because it says what the test is
for: it is not a bigger version of the CI lane. For eight Applications it is **the only
test that has ever run**.

## What to do with it

1. **Write the hardware run's checklist from this list**, not from the CI lane's. The
   eight are the point; the 40 are already covered.
2. **Ask, per exclusion, whether it is still true.** `agent-memory` left this glob on its
   own recorded lift condition, which is the precedent: a deferral should carry a
   condition, and someone should check it. `cilium-lb-ipam` in particular may be liftable
   now that the LB work has landed.
3. **`platform` deserves its own answer.** Seven CRDs and a controller that CI never
   applies is the largest untested surface in the tree, and a CRD-only smoke (apply the
   CRDs, apply one example CR, assert it is accepted) would cost almost nothing on a
   runner and cover most of the parse-and-apply risk.
