---
id: 081M1N0VTN8087G0R0008VE34B
type: task
state: backlog
priority: P1
slug: every-deployed-workload-must-declare-resource-requests-and-l
title: "every deployed workload must declare resource requests, and limits where they are known safe"
created: 2026-09-04T01:34:52.072Z
depends_on: []
composes_with: []
---

# every deployed workload must declare resource requests, and limits where they are known safe

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1N0VTN8087G0R0008VE34B-*.md` glob. -->

Aaron 2026-09-03: *"we want to file making sure everything we deploy follows best practices
like at a minimum having resource requests, and for certain ones resource limits if they are
well known and don't cause crashes."*

## The measurement, not an impression

`storage-profiles.ts --resource-profile dev --budget` prints it every run and nobody has
acted on it: **29 of the 47 Applications render pods that request nothing at all.** Measured
2026-09-03 from `full-ai-cluster/k8s/storage-profiles.json`:

| bucket | count | apps |
|---|---|---|
| **governed** (a rung row exists) | 12 | agent-memory, arc-controller, cloudnativepg, game-hosting/gmod, hindsight, mimir, node-feature-discovery, open-policy-agent, platform, redis, seaweedfs, temporal |
| **renders requests, no rung row** | 6 | gitlab (2525m/5733Mi), cdi, cilium, forgejo, kubevirt, alloy |
| **renders NOTHING — BestEffort** | **29** | arc-runner-set, argo-rollouts, argo-workflows, argocd, cert-manager, cilium-lb-ipam, **cockroachdb**, dapr, deepseek-coder, external-secrets, hat-system, headlamp, headscale, kube-prometheus-stack, loki, **longhorn**, **nats**, ollama, orleans, oz, qwen-coder, sealed-secrets, **spire**, spire-crds, tempo, trust-manager, **vault**, vllm, weaviate |

The bolded ones are the argument. **`cockroachdb` is the largest declared storage consumer
in the catalogue and it is BestEffort. So are `vault`, `longhorn`, `nats`, `spire` and
`argocd` — the control plane, the storage layer, the secret store and the GitOps engine that
would have to recover from an eviction are all first in line to be evicted.**

## Why BestEffort is worse than a wrong number

A missing request is not a small request. It is:

- **QoS class BestEffort** — evicted before any Burstable pod under node pressure, in
  whatever order the kubelet picks.
- **Zero contribution to every budget** — the lane's arithmetic understates what is running,
  which is the direction that manufactures a Pending pod somewhere else and makes the
  scheduler's refusal land on an innocent workload.
- **Invisible to `rendered-resource-requests.ts`** — that check compares declared rungs
  against rendered requests, and an app with no row and no request agrees with itself
  vacuously.

## Requests are the floor; limits are case-by-case

**Requests: every workload, no exceptions.** A request is a scheduling reservation and a
cgroup share, not a ceiling. It costs nothing to be right about and it is what makes the
budget a measurement.

**Limits: only where they are known safe, and named per app.** Aaron's constraint is exact —
*"for certain ones resource limits if they are well known and don't cause crashes."* The
asymmetry is real and should be written down rather than re-derived per app:

| | CPU limit | memory limit |
|---|---|---|
| effect when hit | **throttled** — slower, still correct | **OOMKilled** — the pod dies |
| safe to set blind? | mostly, and still hurts latency-sensitive work | **no** |

So a memory limit on a JVM, a Go service with a large heap, or anything whose working set
scales with load is a crash waiting for a busy day. CPU limits on a control-plane component
with a leader-election lease can cause a throttle-induced lease loss, which looks like a
network partition. Neither belongs in a blanket policy.

## Shape of the work

1. **A rung row per workload** in `storage-profiles.json` with `dev` and `metal` values,
   written into the coordinate the chart actually reads.
2. **`rendered-resource-requests.ts` proves each one reaches a container** — it already does
   this for the governed 12, and it is what stops a row from being an inert key.
3. **A falsifier that the ungoverned set only shrinks.** Without a ratchet this is a
   one-time cleanup that regrows; with one, a new Application arrives governed or it is red.
   The natural home is beside `ungovernedRequests`, whose current membership becomes the
   high-water mark.
4. **Limits are opt-in per app, with the reason recorded** — the `consequence` field these
   rows already carry is the right place, and it is where a future reader learns why this
   app has a memory limit and its neighbour does not.

## Order

Requests before limits, and control plane before workloads: `argocd`, `vault`, `longhorn`,
`cockroachdb`, `nats`, `spire`, `cert-manager` first — those are the ones whose eviction
takes something else down with them.

Filed, not started. Sequenced behind the in-flight load-balancer and Cilium work.

Children: [081M1N0VTKQ087G0R000ZXQZSA] (dapr's five pods).
