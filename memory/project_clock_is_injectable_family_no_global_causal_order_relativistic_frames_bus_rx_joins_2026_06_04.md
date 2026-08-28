---
name: clock-injectable-family-no-global-causal-order-relativistic-2026-06-04
description: "The clock primitive is an injectable FAMILY (FDB total-order / CockroachDB HLC-uncertainty / generator-time+retrocausality), with NO global causal order — each agent is its own git-repo frame, reconciled via bus repos over Rx joins"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron, generalizing the clock primitive (after the FDB total-order
Versionstamp was proven, PR ff3104743):

> "We can do different clock types too not just FoundationDB style — we should be
> able to inject generator-function time and retrocausality, and also CockroachDB
> type and other time systems that preserve uncertainty and allow different causal
> orders per shard. There is no global causal order of things, like relativity,
> cause each agent is in its own git repo and they connect through bus repos over
> rx joins (already designed and backlogged)."

**The clock is an INJECTABLE FAMILY behind `IScheduler`/`IClock`, not one type:**
- **FoundationDB versionstamp (total order)** — PROVEN (Clock.fs). The
  **single-shard / single-sequencer DEGENERATE case.**
- **CockroachDB-style HLC** — hybrid logical clock + an **uncertainty interval**
  (max clock offset); preserves uncertainty rather than forcing false total order.
- **Generator-function time + retrocausality** — three-clocks shape (the future
  affects the GENERATOR that makes the past intelligible, not the past event;
  [[feedback_seed_first_is_future_affecting_the_past...]]); injectable time source.
- **Per-shard causal orders** — different shards may hold DIFFERENT causal orders.

**No global causal order — relativistic.** Each agent = its own **git repo = its
own reference frame / worldline**; there is no universal "now." Frames connect
ONLY through **bus repos over Rx joins** — the join across worldlines is where
orders reconcile (the light-cone connection between frames). Total order (FDB) is
the single-shard collapse of per-shard-causal-order + bus-join. This IS the
lightlike/Clifford structure already in substrate
([[feedback-dbsp-lightlike-retract-of-clifford...]]).

**Already backlogged (reference, don't duplicate):** B-0684 (clock-protocol-
negotiation-stack), B-0683 (tier-deferred-causality worked example, Z-sets),
B-0907 (Rx temporal joins / bus), B-0924 (IScheduler DST). The proven Versionstamp
is one protocol in the B-0684 negotiation stack.

**Causal order AND SPEED are set by a CONSENSUS LADDER driven by the TRUST
GRADIENT** (Aaron 2026-06-04): as trust drops / frames get more distant, climb to
stronger-but-slower consensus:
  1. **local** (own git repo) — total self-trust, fastest, trivial total order.
  2. **CRDT within shard** — coordination-free merge, eventual.
  3. **CRDT across shard** — coordination-free merge across frames.
  4. **row-based CAS** — optimistic linearizable per key.
  5. **Paxos/Raft** — crash-fault-tolerant quorum consensus.
  6. **BFT** — Byzantine-fault-tolerant (no trust / adversarial), slowest.
speed ∝ 1/consensus-strength; the rung is CHOSEN by trust. Within a frame stay
fast+weak; across frames climb. The **bus/Rx-join picks the rung by the trust
between the frames it joins.** Rungs 2–3 = the gap-#3 CRDT/lattice merge primitive;
rung 6 = the 4-oracle BFT work. Composes trust-calculus + m-acc multi-oracle.

**Implication:** Clock.fs Versionstamp should sit behind an injectable
`IClock`/`IScheduler` interface as the total-order instance; HLC + generator-time
are sibling instances; the bus/Rx-join reconciles per-frame orders. NOT built yet
(slow-down) — captured so the clock isn't mistaken for finished. Composes
[[project_clock_primitive_foundationdb_versionstamp_rx_ischeduler_dst...]] +
[[project_proven_event_store_one_primitive_at_a_time...]] + relativity/lightlike.
