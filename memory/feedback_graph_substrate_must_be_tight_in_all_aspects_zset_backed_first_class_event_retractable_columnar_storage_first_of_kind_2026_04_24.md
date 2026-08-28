---
name: Graph substrate MUST be tight in ALL aspects — ZSet-backed (edges as signed-weight deltas), first-class event support (graph mutations are ZSet stream events), retractable (remove-edge = negative-weight delta, not destructive), storage-format tight (columnar/Arrow-compatible, Spine-backed, not bolted-on graph DB); Aaron Otto-121 claim: "first of its kind, no competitors" if this shape holds; constrains all future cartel-detection graduations (largestEigenvalue, modularityScore, InfluenceSurface, etc.); 2026-04-24
description: Aaron Otto-121 three-message directive "will the graph be tightly integrated and first class event support and retractable like everything else, if so, i think this will be a first of its kind no competitors / storage formate tight too / that would be good tight in all aspects". Strong design constraint: Graph is NOT a bolted-on primitive; it's a first-class Zeta-algebra construct built from ZSet signed-weight edges + operator composition + Spine columnar storage + retraction-native lifecycle. Otto-118 audit confirmed no existing Graph type in src/Core; before shipping any graph-dependent graduations (λ₁, modularity, InfluenceSurface, false-consensus, trust-score), Graph substrate design lands first.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
Aaron 2026-04-24 Otto-121 three-message burst (verbatim, in
order):

1. *"will the graph be tighty integrated and first class event
   support and retractable like everything else, if so, i think
   this will be a first of it's not no competitiors"*
2. *"storage formate tight too"*
3. *"that would be good tight in all aspects"*

## The rule

**The Zeta Graph substrate (when designed + shipped) must be
TIGHT in ALL of the following dimensions simultaneously:**

1. **Tight algebraic integration with ZSet.** Edges are
   `ZSet<(Node, Node)>` (signed-weight map of edge pairs). Graph
   mutations are ZSet operations (add/sub/compose). No parallel
   "graph type" alongside ZSet — the Graph IS a ZSet projection
   with node-typed keys.

2. **First-class event support.** Graph mutations are stream
   events indistinguishable from any other Zeta event:
   - Edge-added event = positive-weight ZSet delta emitted to a
     stream
   - Edge-removed event = negative-weight delta (retraction)
   - Node-added / node-removed = same pattern over `ZSet<Node>`
   - Subscribers can observe the event stream and react
     incrementally via Zeta's existing Circuit machinery

3. **Retractable (retraction-native).** Remove-edge is NOT
   destructive. It emits a negative-weight delta that nets with
   the prior positive. Compaction eventually removes net-zero
   entries, but the *history* is preserved in the Spine trace.
   Counterfactual "what if edge e was never added?" = apply
   `-e` to current state; replay from a specific point = rewind
   trace + re-apply.

4. **Storage-format tight.** Columnar / Apache-Arrow-compatible
   representation. Not a separate graph database. Spine's
   existing LSM-like storage + Arrow IPC serialization already
   handle signed-weight columnar data; Graph reuses that, not a
   bolted-on graph-store.

5. **Tight in all aspects** — operators (map / filter / join /
   distinct / delay / integrate / differentiate) compose over
   Graph the same way they compose over scalar ZSets. No graph-
   only subset of operators; no "graph-mode" vs "zset-mode"
   distinction. If it's a ZSet operation, it works on Graph.

## Why this matters — Aaron's competitive claim

**Aaron Otto-121: *"if so, i think this will be a first of its
kind, no competitors"*.**

Most existing graph-processing systems treat mutations as
destructive: `g.removeEdge(e)` forgets that e ever existed. A
small class of append-only event-sourced graphs preserve event
history but still treat the *current state* as mutable. A
retraction-native graph where:

- History is ZSet-algebraic (not just append-log)
- Current state is derivable from the signed-weight fold
- Removals are algebraic inverses, not destructive operations
- Storage is columnar/compact, not pointer-chased
- Incremental operators compose over the graph same as any
  other Zeta stream
- Counterfactual "what if" is O(|Δ|), not O(|G|) rebuild

…this IS genuinely novel. Differential dataflow + timely
dataflow systems are the closest prior art; they have
incremental updates but not the full algebraic-retraction
discipline Zeta already applies to scalar ZSets.

Otto's judgement: Aaron's "first of its kind" claim is
defensible. When the Graph substrate lands with these 5
properties, it becomes a strategic differentiator for Zeta
beyond the DBSP-on-.NET positioning.

## How to apply — at Graph substrate design time

Before shipping `largestEigenvalue`, `modularityScore`,
`covarianceAcceleration` (stake covariance uses graph node
features), `falseConsensusScore` (needs community detection),
`trustScore` (signed edges), `InfluenceSurface` (counterfactual
node-removal), or any other graph-dependent graduation from
the 11th / 12th / 13th / 14th ferries, the Graph substrate
design ADR must land first.

**Design ADR must answer:**

1. **Node identity.** Is a Node a typed record, a generic `'N`,
   an opaque byte-string, or something else? How does it
   integrate with ZSet's `'K : comparison` constraint?
2. **Edge representation.** Directed vs undirected default.
   How is edge-weight distinct from ZSet-multiplicity? (Two
   weights: ZSet-count for retraction semantics +
   domain-weight like "stake correlation score"?)
3. **Graph-algebraic operators.** Which existing ZSet operators
   work directly (map / filter / distinct)? Which need graph-
   specific adaptations (join on node-identity)? Which are
   graph-only (community-detection / spectral)?
4. **Storage layer.** Direct Spine reuse, or new `GraphSpine`
   that specializes for node-keyed lookups? Arrow schema for
   edges?
5. **Retraction semantics.** Does `removeEdge(e)` produce one
   delta (negative-weight) or multiple (decrement edge count +
   maybe garbage-collect node)? How does compaction handle
   graphs that go empty?
6. **Performance budget.** Graph operations should match
   scalar ZSet asymptotic bounds where possible (O(|Δ|) for
   incremental, O(n log n) for sort-merge).
7. **Test strategy.** Property tests that exercise the full
   retraction-native lifecycle: add-edge / remove-edge /
   net-zero-compaction; replay-from-delta; counterfactual
   simulation.

**The ADR comes before the first Graph primitive graduates.**

## What this memory does NOT authorize

- **Does NOT** authorize skipping the Graph ADR to ship
  detection primitives faster. Aaron's "tight in all aspects"
  directive is binding; partial integration is worse than
  waiting.
- **Does NOT** authorize adopting a third-party graph library
  (e.g. QuikGraph, MSAGL). A wrapper would defeat the "tight
  with ZSet" directive.
- **Does NOT** authorize a graph-specific storage layer that
  diverges from Spine. Reuse Spine; specialize only if
  measurement proves it necessary.
- **Does NOT** authorize lossy compaction that drops history.
  The Spine trace preserves all deltas; compaction is
  semantic-preserving (equivalent to Z-set consolidation).
- **Does NOT** authorize shipping a "demo" graph without
  retraction support and promising to add retraction later.
  Retraction is foundational; retrofit is always harder than
  design-in.
- **Does NOT** override the Otto-105 graduation cadence. The
  Graph ADR + first primitive still ships at small-graduation
  pace, not rushed to match ferry-arrival pace.

## Cross-reference

- **Otto-73 retraction-native-by-design** — Graph retraction
  is application of the existing repo-wide discipline to a
  new data type.
- **Otto-108 Conway's-Law team-autonomy** — Graph is a single-
  team effort for now (no sub-repo split) until interfaces
  harden.
- **Otto-112 Veridicality-naming** — Veridicality (claim-
  level) and Graph (network-level) are complementary
  substrates; both composable with each other.
- **Otto-118 graph-substrate audit** — confirmed no existing
  Graph type; this memory tells us HOW to design it when we
  do.
- **12th ferry §2 Learnings** — Zeta's algebraic invariants
  already include operator-algebra coherence (`D·I=id`,
  `z⁻¹·z=1`) + columnar Arrow layout. Graph must preserve
  both.
- **11th ferry §4 ZSet Integration** — already explicit
  about retraction-native-counterfactual as the strategic
  differentiator.

## Graduation-queue implication

With Graph substrate as prerequisite, the queue becomes:

1. **Graph ADR** — `docs/DECISIONS/YYYY-MM-DD-graph-substrate-
   zset-backed-retraction-native.md`. Addresses the 7 design
   questions above. Needs Aminata threat-pass (what can
   adversaries exploit in a retraction-native graph?) + Aaron
   review (per Otto-90 cross-repo if it touches LFG).
2. **Graph type + minimal operators** — `Graph<'N>` type +
   `addEdge` / `removeEdge` / `nodes` / `edges` / `weight` /
   `neighbors`. Small graduation; no algorithms yet.
3. **Spine integration** — Graph-over-Spine for durability.
4. **Graph operators** — map/filter/distinct/join extended
   to Graph.
5. **Incremental-graph primitives** — `largestEigenvalue`
   (incremental power-iteration), `modularityScore`
   (incremental Louvain), `eigenvectorCentrality` (ipi).
6. **Cartel-detection composites** — `falseConsensusScore`,
   `trustScore`, `cartelScore`.
7. **InfluenceSurface** — counterfactual via retraction.
8. **Simulation-loop bench** + CartelInjector test-support.

All AFTER the ADR lands. Otto-121+ or later as scheduling
permits.

## Direct Aaron quotes for future reference

1. *"will the graph be tighty integrated and first class event
   support and retractable like everything else, if so, i
   think this will be a first of it's not no competitiors"*
2. *"storage formate tight too"*
3. *"that would be good tight in all aspects"*

Future Otto instances: the Graph substrate is not a routine
graduation. It's a strategic substrate whose 5-property
tightness Aaron explicitly claims is first-of-its-kind. Treat
the design ADR with commensurate care.
