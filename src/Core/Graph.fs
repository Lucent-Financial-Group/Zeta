namespace Zeta.Core


/// **Graph — ZSet-backed retraction-native graph substrate.**
///
/// A `Graph<'N>` is a structural wrapper around `ZSet<'N * 'N>`:
/// every edge is an entry in the underlying ZSet with a signed
/// `Weight`. Add-edge is a ZSet add; remove-edge is a ZSet sub.
/// Net-zero entries compact by the existing ZSet consolidation
/// pass (Spine-backed when persisted).
///
/// **Design contract:** `docs/DECISIONS/2026-04-24-graph-
/// substrate-zset-backed-retraction-native.md` (Otto-123 ADR)
/// codifies the 5 tightness properties: ZSet-backed, first-class
/// event support, retractable, storage-format tight, operator-
/// algebra composable.
///
/// **Attribution.**
/// * Aaron — design bar ("tight in all aspects") Otto-121
/// * Amara — formalization (11th + 12th + 13th + 14th ferries
///   + validation-bar Otto-122 "can it detect a dumb cartel in
///   a toy simulation?")
/// * Otto — implementation (8th graduation under Otto-105
///   cadence; first module that completes a cross-ferry arc
///   from concept to running substrate)
///
/// **Scope of this first graduation.** Core type + minimal
/// mutation operators + node/edge accessors + retraction-
/// conservation property test. Detection primitives
/// (`largestEigenvalue`, `modularityScore`) and toy cartel
/// detector ship in follow-up PRs composing on this
/// foundation. Splitting across multiple PRs per Otto-105
/// small-graduation cadence; the ADR's single-PR preference
/// defers to cadence discipline.
///
/// **Graph event semantics.** Directed edges by default. Multi-
/// edges supported by ZSet weight (weight = count). Self-loops
/// allowed (source = target is a legal edge). Nodes derived
/// from edge-endpoint set — MVP; standalone-node tracking
/// deferred to future graduation if needed.
[<AutoOpen>]
module Graph =

    /// A directed-edge event emitted when a graph mutates.
    /// Subscribers consume this via Zeta's existing Circuit /
    /// Stream machinery — no graph-specific event plumbing.
    type GraphEvent<'N> =
        | EdgeAdded of source:'N * target:'N * weight:int64
        | EdgeRemoved of source:'N * target:'N * weight:int64

    /// `Graph<'N>` — a directed graph with signed-weight edges.
    /// Internal representation is `ZSet<'N * 'N>` so that every
    /// existing ZSet operator composes automatically.
    type Graph<'N when 'N : comparison> =
        internal
            { Edges: ZSet<'N * 'N> }

    /// Empty graph — no edges, no nodes.
    [<GeneralizableValue>]
    let empty<'N when 'N : comparison> : Graph<'N> =
        { Edges = ZSet.empty<'N * 'N> }

    /// `isEmpty g` — true when the graph has no edges with
    /// non-zero weight.
    let isEmpty (g: Graph<'N>) : bool = ZSet.isEmpty g.Edges

    /// `edgeCount g` — number of distinct edges with non-zero
    /// weight (multi-edges count as one; weight is not the
    /// count here — `edgeWeight` exposes the multiplicity).
    let edgeCount (g: Graph<'N>) : int = ZSet.count g.Edges

    /// `edgeWeight g source target` — the signed multiplicity
    /// of the edge `source → target`. Returns 0 when the edge
    /// is absent or has been fully retracted.
    let edgeWeight (source: 'N) (target: 'N) (g: Graph<'N>) : int64 =
        ZSet.lookup (source, target) g.Edges

    /// `addEdge g source target weight` — add `weight` to the
    /// multiplicity of the edge `source → target`. Returns the
    /// updated graph AND the emitted event. Weight of zero is
    /// a no-op and emits no event.
    let addEdge
            (source: 'N)
            (target: 'N)
            (weight: int64)
            (g: Graph<'N>)
            : Graph<'N> * GraphEvent<'N> list =
        if weight = 0L then (g, [])
        else
            let delta = ZSet.singleton (source, target) weight
            let merged = ZSet.add g.Edges delta
            ({ Edges = merged }, [ EdgeAdded(source, target, weight) ])

    /// `removeEdge g source target weight` — subtract `weight`
    /// from the multiplicity of the edge. NON-DESTRUCTIVE:
    /// emits a negative-weight ZSet delta; if the result
    /// net-zeros, ZSet consolidation drops the entry but the
    /// Spine trace preserves the history. Weight of zero is
    /// a no-op.
    let removeEdge
            (source: 'N)
            (target: 'N)
            (weight: int64)
            (g: Graph<'N>)
            : Graph<'N> * GraphEvent<'N> list =
        if weight = 0L then (g, [])
        else
            let delta = ZSet.singleton (source, target) (-weight)
            let merged = ZSet.add g.Edges delta
            ({ Edges = merged }, [ EdgeRemoved(source, target, weight) ])

    /// `fromEdgeSeq edges` — build a graph from an unordered
    /// sequence of `(source, target, weight)` triples.
    /// Duplicates sum via the underlying ZSet; zero-weight
    /// triples are dropped.
    let fromEdgeSeq (edges: ('N * 'N * int64) seq) : Graph<'N> =
        let pairs = edges |> Seq.map (fun (s, t, w) -> (s, t), w)
        { Edges = ZSet.ofSeq pairs }

    /// `nodes g` — the set of nodes that appear as an endpoint
    /// of any edge with non-zero weight. Derived from the edge
    /// set; standalone-node tracking is a future graduation
    /// candidate.
    let nodes (g: Graph<'N>) : Set<'N> =
        let mutable acc = Set.empty
        let span = g.Edges.AsSpan()
        for i in 0 .. span.Length - 1 do
            let entry = span.[i]
            let (s, t) = entry.Key
            acc <- acc.Add s |> Set.add t
        acc

    /// `nodeCount g` — `|nodes g|`.
    let nodeCount (g: Graph<'N>) : int = (nodes g).Count

    /// `outNeighbors source g` — for each `(source, t, w)` in
    /// the graph with non-zero `w`, return `(t, w)`. Does not
    /// traverse; direct lookup against the edge set.
    let outNeighbors (source: 'N) (g: Graph<'N>) : ('N * int64) list =
        let span = g.Edges.AsSpan()
        let mutable acc = []
        for i in 0 .. span.Length - 1 do
            let entry = span.[i]
            let (s, t) = entry.Key
            if s = source && entry.Weight <> 0L then
                acc <- (t, entry.Weight) :: acc
        List.rev acc

    /// `inNeighbors target g` — dual of `outNeighbors`, edges
    /// where `_ → target`.
    let inNeighbors (target: 'N) (g: Graph<'N>) : ('N * int64) list =
        let span = g.Edges.AsSpan()
        let mutable acc = []
        for i in 0 .. span.Length - 1 do
            let entry = span.[i]
            let (s, t) = entry.Key
            if t = target && entry.Weight <> 0L then
                acc <- (s, entry.Weight) :: acc
        List.rev acc

    /// `degree n g` — total in-degree + out-degree of `n`
    /// (counting each edge-weight once). Self-loops count
    /// twice (once as in-edge, once as out-edge).
    let degree (n: 'N) (g: Graph<'N>) : int64 =
        let span = g.Edges.AsSpan()
        let mutable acc = 0L
        for i in 0 .. span.Length - 1 do
            let entry = span.[i]
            let (s, t) = entry.Key
            if s = n then acc <- acc + entry.Weight
            if t = n then acc <- acc + entry.Weight
        acc

    /// `map f g` — relabel nodes via `f`. The resulting graph
    /// preserves edge multiplicity: `(s, t, w)` becomes
    /// `(f s, f t, w)`. Collisions (two edges mapping to the
    /// same `(f s, f t)` pair) sum their weights via the
    /// underlying ZSet consolidation.
    ///
    /// Operator-algebra composition: wraps `ZSet.map` with a
    /// projection over the node-tuple. The "tight-with-ZSet"
    /// property (ADR Otto-121) is manifest here — we don't
    /// reimplement map; we project through it.
    let map (f: 'N -> 'M) (g: Graph<'N>) : Graph<'M> when 'M : comparison =
        { Edges = ZSet.map (fun (s, t) -> (f s, f t)) g.Edges }

    /// `filter predicate g` — keep only edges where
    /// `predicate (source, target)` is true. Weights are
    /// preserved for kept edges.
    ///
    /// Operator-algebra composition: delegates to `ZSet.filter`
    /// directly; no graph-specific logic.
    let filter (predicate: 'N * 'N -> bool) (g: Graph<'N>) : Graph<'N> =
        { Edges = ZSet.filter predicate g.Edges }

    /// `distinct g` — collapse each edge's multiplicity to
    /// exactly `1` if it has positive total weight, `0`
    /// otherwise (dropping anti-edges).
    ///
    /// Rationale: when downstream code wants "set semantics"
    /// over edges (does edge `(s, t)` exist vs. does it have
    /// multiplicity 7), `distinct` collapses the multi-graph
    /// into a simple graph. Implemented as `ZSet.distinct`
    /// wrapped over the edge ZSet.
    ///
    /// Note: `distinct` drops negative-weight anti-edges. A
    /// graph with `(1,2)` at weight `-3` becomes empty after
    /// distinct. This is the correct set-semantics answer —
    /// an edge with negative multiplicity "doesn't exist" as
    /// a positive set member.
    let distinct (g: Graph<'N>) : Graph<'N> =
        { Edges = ZSet.distinct g.Edges }

    /// `union a b` — add all edge weights between two graphs.
    /// An edge present in both sums the weights; an edge in
    /// only one is preserved at its own weight.
    ///
    /// Delegates to `ZSet.add`. The retraction-native semantics
    /// carry through: a graph containing `(1,2, -5)` (an
    /// anti-edge) unioned with `(1,2, 5)` cancels cleanly.
    let union (a: Graph<'N>) (b: Graph<'N>) : Graph<'N> =
        { Edges = ZSet.add a.Edges b.Edges }

    /// `difference a b` — subtract graph `b` from graph `a`.
    /// Equivalent to `union a (negate b)`.
    ///
    /// Delegates to `ZSet.sub`. Useful for counterfactuals:
    /// "what does `graph minus suspected-cartel-edges` look
    /// like?"
    let difference (a: Graph<'N>) (b: Graph<'N>) : Graph<'N> =
        { Edges = ZSet.sub a.Edges b.Edges }
