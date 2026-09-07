# What the hardware cluster actually unlocks — capacity is the blocker, and storage already isn't

**Aaron, 2026-09-07**, on the CI exclusions: *"we should be able to work around this and test them
... we stand up two nodes during our cluster and we can emulate real block storage for testing
even at small sizes ... try to think outside the box here ... we can make drastic changes if
needed."*

This is the answer after actually looking. **Three of the four barriers I reported an hour
earlier were wrong**, and the one that is real is not the one the plan targets.

## The correction, first — because hardware decisions are being made on this

I told Aaron the CI gap was *"GPU + multi-node storage + real CNI — six Applications."* Measured:

| I said | measured |
|---|---|
| **Cilium is untested; only hardware closes it** | **FALSE.** `live kind Cilium CNI` is its own job, with `networking.disableDefaultCNI` and a dedicated profile. Cilium is excluded from the *included-apps* lane because it is tested in a *dedicated* one. |
| **Longhorn storage needs real disks + multi-node** | **ALREADY SOLVED**, and by exactly the move Aaron proposed. `dev-cluster/manifests/longhorn.yaml` binds a StorageClass *named* `longhorn` to `rancher.io/local-path`. Measured on run 32519516070: **11 Applications stopped being storage-excluded; 6 reach Synced+Healthy** (headscale, mimir, nats, oz, redis, tempo). |
| **The remaining exclusions are hardware** | **MOSTLY NOT.** They are credentials and convergence bugs. |

The Longhorn alias deserves its own sentence because it is the sharpest idea in the tree and it
was already there: **the workloads never need Longhorn, they need the NAME.** A StorageClass is a
name bound to a provisioner, so dev binds `longhorn` to `local-path` and the *same unmodified
manifests* — same 100Gi request, same class name — bind on a kind node. That is "emulate real
block storage at small sizes", implemented before it was asked for.

## What is actually blocking, measured

The live-kind lane has been red on `main` since **2026-09-05 16:56** — 21 failures in the last 29
completed runs. Final state of a representative run: **34/37 healthy**, laggards `hindsight`
(Degraded), `headscale` (Progressing), `orleans` (Progressing).

And `hindsight` is not a chart defect. Its own deferral record says so in capitals:

> *"CAPACITY — AND HINDSIGHT IS THE SYMPTOM, NOT THE CAUSE. MEASURED run 32519516070:
> `hindsight-postgresql-0` never scheduled — FailedScheduling `0/1 nodes are available: 1
> Insufficient cpu`."*

**The blocker is CPU on a 4-vCPU runner.** Not disks, not the CNI, not the storage class.

## The load-bearing correction to the two-node plan

> **Adding kind nodes does not add CPU.**

kind nodes are containers on one host, sharing one kernel and one CPU allocation. A 3-node kind
cluster on a 4-vCPU runner has 4 vCPU, arranged differently. So the two-node change — right for
the reasons below — **does not fix the failure that is actually red today**, and would slightly
worsen it by adding two more kubelets and containerds to the same budget.

What fixes capacity: a **larger runner**, **the hardware cluster**, or **lowering dev-profile
resource requests**. Only the third is free, and it makes the lane prove less.

## So what is multi-node still worth?

Real things, none of which is the current red:

- **Replication.** Longhorn's own default is 3 replicas; a single node can place one. Anti-affinity,
  PDBs and topology spread constraints are all no-ops on one node — they pass vacuously today.
- **Scheduling paths.** `nodeSelector: zeta.io/gpu`, taints, tolerations. On one node every pod
  lands regardless, so the selector wiring the GPU DaemonSet depends on is never exercised. This
  matters directly: it is the same wiring that made the device plugin defect invisible.
- **The drain/upgrade path.** Nothing that requires evicting a node is testable on one.

That is a real bill of goods — it is just not the capacity bill.

## GPU without a GPU — split the claim in two

The current exclusion of `ollama`/`vllm` conflates two different assertions, and only one needs
silicon:

| claim | needs a GPU? | how to test without one |
|---|---|---|
| syncs, schedules onto the labelled node, image pulls, probes pass | **no** | advertise `nvidia.com/gpu` as an extended resource on a labelled node (a stub device plugin, or a node-status patch) and run the workload **CPU-only** — ollama supports CPU inference; vLLM has a CPU backend |
| the model actually infers on the accelerator | **yes** | the hardware lane |

Splitting it converts two hard exclusions into two assertions at a named depth plus one honest
hardware deferral. And it should be **vendor-parameterised from the start** — Aaron: *"i have gpus
more than just nvidia eventually"* — which the module already anticipates: `zeta.gpu-device-plugin`
takes a `vendors` list (`nvidia`, `amd`), so the fake resource should too.

## The pattern this all points at, and it is already the repo's

Cilium has its own lane. kubevirt+cdi has its own lane. **The broad included-apps lane should not
grow new capabilities; new capabilities get focused lanes.** That is why "make the included lane
multi-node" is the wrong shape — it would add cost to the one lane that is already CPU-starved.

Proposed, in leverage order:

1. **Raise the runner** for the included lane, or cut dev-profile CPU requests. This is the only
   change that turns the lane green, and it is the prerequisite for trusting anything else it says.
2. **A focused multi-node lane** — Longhorn real, replication, anti-affinity, drain. Small app set.
3. **A focused GPU-scheduling lane** — fake extended resource, CPU-mode workloads, vendor-parameterised.
4. Leave Cilium alone. It is tested. The `PROBE kind+Cilium included proof` job already exists for
   the combination and is `workflow_dispatch`-gated on cost.

## What the hardware cluster unlocks, precisely

**It does:** capacity (the current red), GPU execution, real Longhorn, and every multi-node
behaviour above.

**It does not:** `grafana` (wants a secret), `arc-runner-set` (GitHub App + RWX), `platform` (image
pull credential), `weaviate` (never converges its sync), `cockroachdb` (never `init`ed), `orleans`
(Progressing). Those are credentials and bugs, and they will follow the code onto the metal.

## Register

Measured: the lane's failure history and final states, the `hindsight` capacity finding (quoted
from its own record), the Longhorn alias outcome (quoted, from run 32519516070), the Cilium lane's
existence, and both kind profiles being single-node. Argued, not measured: that a larger runner
fixes the capacity red — the size needed is not yet measured, and the honest next step is to
measure peak requested CPU against the runner's 4, not to guess a tier.
