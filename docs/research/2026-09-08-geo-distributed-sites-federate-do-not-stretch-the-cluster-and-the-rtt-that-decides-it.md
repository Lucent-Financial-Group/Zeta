# Geo-distributed sites: federate, do not stretch the cluster — and the RTT that decides it

**Source:** Aaron, 2026-09-08, answering what a dev stick should carry. Written up by shadow*.
**Register:** the etcd mechanism is **established** (vendor-documented, cited below). The
Zeta-specific argument in §4 is **argued, not measured**. The recommendation in §6 rests on
an **unmeasured RTT** and §5 says how to measure it rather than asserting a verdict.

---

## 1. What was asked

Aaron, verbatim:

> *"yes for dev we want the cluster join materials, for us, we are using the repo+github
> login of the contributor to join, this way a fork can have different clusters over time.
> Also max is geo destributed from me with his hardware. i think clusters are okay for local
> connections but we likely need federation for geo distributed, **this is an assumption on
> k8s design prinicples**, if we can do geo distriubted clusters without peanlity then me and
> max can join the same cluster with our hardware casue we are both using zeta repo and have
> access to zeta cause we are contributors if not, then we can still federate via zeta but
> maybe not cluster. Right now we are using github for coordination between geodistributed
> sites until we have our own decentralized version."*

He flagged the middle of that as an assumption. It is a correct one, and the reason is
mechanical rather than a matter of principle.

## 2. The penalty is real, and it is quorum latency

The cluster runs **k3s with embedded etcd** — `--cluster-init`, and `k3s-server.nix:331`
notes *"K3S embedded etcd binds 127.0.0.1 by default."* etcd replicates by **Raft**, so:

- **Every write needs a quorum.** A write is not acknowledged until a majority of members
  have received and **fsync'd** it. So control-plane write latency has a floor of the RTT to
  the median member, plus disk sync. Two sites at 60 ms RTT means every API write pays it.
- **Leader election is timing-based.** etcd's defaults — heartbeat interval **100 ms**,
  election timeout **1000 ms** — are documented as suiting a local network. On a WAN link
  where RTT approaches or exceeds the heartbeat interval, followers miss heartbeats that
  were merely slow, call elections, and the cluster churns leaders under no fault at all.
- **Tuning trades one cost for another.** The documented remedy is to raise the heartbeat
  toward the RTT and the election timeout to ~10x that. It buys stability by making
  **failover slower** — the cluster now takes seconds to notice a genuinely dead leader.

**Nothing in-tree tunes any of this.** Measured: no `heartbeat-interval`, no
`election-timeout`, no `etcd-arg` anywhere under `full-ai-cluster/`. So a stretched cluster
built today would run a WAN link at LAN defaults, which is the configuration most likely to
produce spurious elections.

**Where the penalty does NOT land:** workload-to-workload traffic. Pods talking to pods pay
network latency and nothing else. The cost is specifically on the **control plane** — kubectl
writes, scheduling decisions, lease renewals, controller reconciliation.

## 3. So the answer to "without penalty" is no — but "impossible" is also wrong

A stretched cluster is **buildable** and people run them. What it is not is free. The honest
formulation:

> A geo-stretched control plane trades **write latency and failover time** for the
> convenience of one API surface. Whether that trade is acceptable is a function of the RTT
> and of how write-heavy the control plane is.

## 4. The Zeta-specific argument, which is stronger than the Kubernetes one

This is mine, argued rather than measured, and it is the reason I would federate even at a
*low* RTT.

**Zeta's substrate is built to avoid global consensus.** Z-set retraction (`+1` then `−1`,
never erase), CRDT merge, the commutative belief fold, *reintegration is not reconvergence*
in [`anti-babel-preserve-reconcilability`](../../.claude/rules/anti-babel-preserve-reconcilability.md),
and [`local-time-never-enters-the-shared-fold`](../../.claude/rules/local-time-never-enters-the-shared-fold.md)
— which exists precisely so a node's own clock cannot decide what enters the shared result.
All of that machinery is there so decorrelated peers can reconcile **without a quorum**.

Putting a geo-stretched etcd underneath it inverts the stack: it makes the **strongest
consistency requirement in the system** the foundation for a design whose whole point is not
needing one. Every cross-site control-plane write would then be gated by a Raft majority in a
substrate that otherwise treats partition as a normal condition and disagreement as
information.

It also collides with [`manifesto-13-specifications`](../../.claude/rules/manifesto-13-specifications.md)
**§1 scale-free** (no central point of coordination) and **§2 lock/wait-free**: a shared etcd
quorum is exactly a coordination point that blocks progress on another party's availability.

## 5. The measurement that settles it, instead of a rule

Aaron's framing — *"if we can do geo distributed clusters without penalty"* — is a
conditional, so it deserves a number rather than a doctrine:

```
# from each site, against the other site's control-plane address
ping -c 100 <peer>          # median and p99 RTT
# and the thing that actually matters, disk:
#   etcd write latency floor ~= RTT_to_median_member + fsync time
```

| median RTT | reading |
|---|---|
| **< ~10 ms** | same-metro. A shared cluster is unremarkable; the defaults hold. |
| **~10–50 ms** | stretched. Workable **with tuning**, and the tuning is not in-tree today. |
| **> ~50 ms** | every control-plane write pays it, and the default election timeout is close enough to be dangerous. Federate. |

**This is the falsifier for the recommendation below.** If Aaron and Max measure single-digit
RTT, §6 is wrong for their case and a shared cluster is fine.

## 6. Recommendation: one cluster per site, federate across

- **Per site:** Aaron's hardware is one cluster; Max's is another. Local etcd, LAN latency,
  defaults valid, no cross-site quorum on any write path.
- **Across sites:** federation, which this repo has already been building toward —
  `src/Core.TypeScript/federated-identity/` (ceremony-gate, local-issuer, node-attestation,
  verdict-vault). **Honest status:** `federation-loop.ts` is explicit that it is an
  in-process model — *"No network listener of any kind ... No real SPIRE ... No hardware ...
  Ephemeral keys only"* — so federation is **modelled, not deployed**.
- **The cross-site plane today is GitHub**, and that is already a federation rather than a
  stopgap: git is append-only, partition-tolerant, and needs no quorum to accept a write.
  A fork is a legitimate divergent branch of the world, which is the same shape as
  reintegration-without-reconvergence. Prior art in-tree:
  `2026-06-01-cap-per-layer-map-multi-oracle-review-at-merge-federated-git-push-truth-machine-calm-aaron-otto.md`.

**Aaron's identity design already points this way.** Join authorised by *repo + contributor's
GitHub login*, with a fork able to run different clusters over time, means **identity is
anchored outside any cluster**. A cluster-CA-anchored join would make the cluster the root of
trust and a fork a second-class citizen; repo-anchored join makes each site's cluster an
implementation detail. That is federation-native, and it is the part that makes §6 cheap
rather than a compromise.

## 7. What this implies for the dev stick

Aaron: *"for dev we want the cluster join materials."* That is consistent with everything
above — join material is **per-site**, not global, and a dev stick joining the local cluster
is exactly the intended shape. It does not commit to a stretched cluster.

Current state, measured: `--role`, `--join-server-url` and `--join-token` are accepted only by
`file-backed.ts`, which writes an image rather than a device, so the device-flashing path
cannot carry them (B5, #17075). Wiring them onto the device path is the follow-up this
document unblocks.

## Pointers

- `full-ai-cluster/nixos/modules/k3s-server.nix` — embedded etcd, `--cluster-init`, the 127.0.0.1 bind note
- `src/Core.TypeScript/federated-identity/` — the modelled federation; `federation-loop.ts` states its own limits
- [`manifesto-13-specifications.md`](../../.claude/rules/manifesto-13-specifications.md) §1 scale-free, §2 lock/wait-free
- [`local-time-never-enters-the-shared-fold.md`](../../.claude/rules/local-time-never-enters-the-shared-fold.md) · [`anti-babel-preserve-reconcilability.md`](../../.claude/rules/anti-babel-preserve-reconcilability.md)
- **Anchors (Beacon):** Ongaro & Ousterhout, *In Search of an Understandable Consensus Algorithm* (Raft, 2014) — quorum on every commit; etcd's own tuning documentation for the heartbeat/election defaults and the RTT guidance; Brewer's CAP and the CALM result (Hellerstein & Alvaro) for why coordination is required only by the operations that need it.
