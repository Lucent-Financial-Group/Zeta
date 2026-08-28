---
name: clock-primitive-fdb-versionstamp-rx-ischeduler-dst-2026-06-04
description: The core clock/causal-order primitive — injectable deterministic time from FoundationDB (versionstamp + DST) + Rx IScheduler (virtual time); z⁻¹ = scheduler step = versionstamp increment
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron, confirming all four implicit core-primitive gaps (clock,
Merkle integrity, CRDT/lattice merge+idempotency, identity/keys) as real, and
naming the **clock primitive** design:

> "we are basing the clock of Foundation DB / RX framework IScheduler /
> deterministic simulation"

**One idea, three sources:** time is an INJECTED, deterministic, monotonic
PARAMETER — never ambient wall-clock.
- **FoundationDB** → the **versionstamp** (single-sequencer monotonic commit
  version = TOTAL order over the log) + the canonical **DST** methodology (replay
  the whole world from a seed).
- **Rx `IScheduler`** → the interface that makes time injectable; swap the real
  scheduler for `TestScheduler`/`HistoricalScheduler` (virtual time) and the same
  reactive/DBSP pipeline ticks deterministically. Time is a passed-in parameter.
- **DST** (manifesto spec #7) → demands exactly that: seed → same time sequence →
  same curve.

**Unification (the payoff):** `z⁻¹` (DBSP delay) = one `IScheduler` step = one
versionstamp increment — the SAME operation at three layers. ⇒ the cost curve's
x-axis is well-defined AND reproducible; curve + curvature (∂/∂²) become
replayable theorems, not wall-clock artifacts.

**Total vs causal order (where clock meets the CRDT/merge primitive):**
- **single-sequencer / single-writer lightlike log** → FDB versionstamp = TOTAL
  order (the tight core case).
- **distributed / scale-free (many writers)** → causal/partial order (git DAG /
  Lamport / vector) + **CRDT merge** to reconcile. Total-order is the degenerate
  single-sequencer case of causal-order-plus-join. So gap #1 (clock) and gap #3
  (lattice/merge) are the SAME boundary.

The `IScheduler` abstraction is what lets the SAME proven curve logic run on real
time in prod and virtual time in the proof. Relates to `Watermark.fs` (progress =
how far the logical clock advanced). Composes [[feedback_seed_first_is_future_affecting_the_past...]]
+ DST + [[project_proven_event_store_one_primitive_at_a_time...]] + three-clocks rule.

**Status:** confirmed design direction (slow-down phase — NOT yet built). The
four gaps are real and accepted; clock anchored to FDB-versionstamp + IScheduler
+ DST. Next: which primitive to prove first (Aaron sequences).
