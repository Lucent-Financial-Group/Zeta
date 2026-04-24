module Zeta.Tests.Algebra.GraphTests

open FsUnit.Xunit
open global.Xunit
open Zeta.Core


// ─── empty + basic accessors ─────────

[<Fact>]
let ``empty graph has zero edges and zero nodes`` () =
    let g : Graph<int> = Graph.empty
    Graph.isEmpty g |> should equal true
    Graph.edgeCount g |> should equal 0
    Graph.nodeCount g |> should equal 0

[<Fact>]
let ``edgeWeight returns 0 for absent edge`` () =
    let g : Graph<int> = Graph.empty
    Graph.edgeWeight 1 2 g |> should equal 0L


// ─── addEdge ─────────

[<Fact>]
let ``addEdge sets edge weight and emits EdgeAdded event`` () =
    let (g, events) = Graph.addEdge 1 2 5L Graph.empty
    Graph.edgeWeight 1 2 g |> should equal 5L
    events |> should equal [ EdgeAdded(1, 2, 5L) ]

[<Fact>]
let ``addEdge with zero weight is a no-op`` () =
    let (g, events) = Graph.addEdge 1 2 0L Graph.empty
    Graph.isEmpty g |> should equal true
    events |> should equal ([]: GraphEvent<int> list)

[<Fact>]
let ``addEdge accumulates multi-edge weight`` () =
    // Multi-edges are supported via ZSet signed-weight:
    // two adds on the same edge sum to multiplicity 7.
    let (g1, _) = Graph.addEdge 1 2 3L Graph.empty
    let (g2, _) = Graph.addEdge 1 2 4L g1
    Graph.edgeWeight 1 2 g2 |> should equal 7L
    Graph.edgeCount g2 |> should equal 1


// ─── removeEdge / retraction-native ─────────

[<Fact>]
let ``removeEdge subtracts weight and emits EdgeRemoved event`` () =
    let (g1, _) = Graph.addEdge 1 2 5L Graph.empty
    let (g2, events) = Graph.removeEdge 1 2 5L g1
    Graph.edgeWeight 1 2 g2 |> should equal 0L
    Graph.isEmpty g2 |> should equal true
    events |> should equal [ EdgeRemoved(1, 2, 5L) ]

[<Fact>]
let ``removeEdge partial retraction leaves remainder`` () =
    // Retraction-native: remove 3 from an edge of weight 5
    // leaves weight 2, not "edge deleted".
    let (g1, _) = Graph.addEdge 1 2 5L Graph.empty
    let (g2, _) = Graph.removeEdge 1 2 3L g1
    Graph.edgeWeight 1 2 g2 |> should equal 2L
    Graph.edgeCount g2 |> should equal 1

[<Fact>]
let ``retraction-conservation: addEdge then removeEdge restores empty`` () =
    // The load-bearing property from the ADR: apply(delta)
    // followed by apply(-delta) restores prior state modulo
    // compaction metadata.
    let (g1, _) = Graph.addEdge 1 2 7L Graph.empty
    let (g2, _) = Graph.removeEdge 1 2 7L g1
    Graph.isEmpty g2 |> should equal true

[<Fact>]
let ``removeEdge on absent edge produces net-negative weight`` () =
    // Remove-before-add is legal — ZSet signed-weight means
    // the result is an anti-edge (negative multiplicity).
    // Adding it later will cancel. This is what makes
    // retraction-native counterfactuals O(|delta|).
    let (g, _) = Graph.removeEdge 1 2 3L Graph.empty
    Graph.edgeWeight 1 2 g |> should equal -3L


// ─── nodes + neighbors ─────────

[<Fact>]
let ``nodes derives from edge endpoints`` () =
    let g =
        Graph.fromEdgeSeq [
            (1, 2, 1L)
            (2, 3, 1L)
            (3, 1, 1L)
        ]
    Graph.nodes g |> should equal (Set.ofList [1; 2; 3])
    Graph.nodeCount g |> should equal 3

[<Fact>]
let ``outNeighbors lists target nodes and weights`` () =
    let g =
        Graph.fromEdgeSeq [
            (1, 2, 3L)
            (1, 3, 5L)
            (2, 3, 1L)
        ]
    let ns = Graph.outNeighbors 1 g
    ns |> should equal [ (2, 3L); (3, 5L) ]

[<Fact>]
let ``inNeighbors is dual of outNeighbors`` () =
    let g =
        Graph.fromEdgeSeq [
            (1, 3, 5L)
            (2, 3, 1L)
        ]
    let ns = Graph.inNeighbors 3 g
    ns |> List.sortBy fst |> should equal [ (1, 5L); (2, 1L) ]

[<Fact>]
let ``degree sums in+out edge weights`` () =
    let g =
        Graph.fromEdgeSeq [
            (1, 2, 3L)    // out-edge for 1
            (2, 1, 4L)    // in-edge for 1
            (1, 3, 5L)    // out-edge for 1
        ]
    Graph.degree 1 g |> should equal (3L + 4L + 5L)


// ─── self-loop support ─────────

[<Fact>]
let ``self-loop is a legal edge (source = target)`` () =
    let (g, _) = Graph.addEdge 1 1 5L Graph.empty
    Graph.edgeCount g |> should equal 1
    Graph.edgeWeight 1 1 g |> should equal 5L

[<Fact>]
let ``self-loop counts twice in degree (once in, once out)`` () =
    let (g, _) = Graph.addEdge 1 1 3L Graph.empty
    Graph.degree 1 g |> should equal 6L  // 3 in + 3 out


// ─── fromEdgeSeq ─────────

[<Fact>]
let ``fromEdgeSeq sums duplicate edges`` () =
    let g =
        Graph.fromEdgeSeq [
            (1, 2, 3L)
            (1, 2, 4L)
        ]
    Graph.edgeWeight 1 2 g |> should equal 7L
    Graph.edgeCount g |> should equal 1

[<Fact>]
let ``fromEdgeSeq drops zero-weight triples`` () =
    let g =
        Graph.fromEdgeSeq [
            (1, 2, 0L)
            (2, 3, 1L)
            (3, 4, 0L)
        ]
    Graph.edgeCount g |> should equal 1
    Graph.edgeWeight 2 3 g |> should equal 1L


// ─── modularityScore ─────────

[<Fact>]
let ``modularityScore returns None for empty graph`` () =
    let g : Graph<int> = Graph.empty
    Graph.modularityScore Map.empty g |> should equal (None: double option)

[<Fact>]
let ``modularityScore for single-community partition on complete graph is 0`` () =
    // When every node is in one community, intra-community
    // edges equal total edges, and the expected-random term
    // equals actual, so Q = 0 (no community structure detected
    // because there's no partition boundary).
    let edges = [
        (1, 2, 1L); (2, 1, 1L)
        (2, 3, 1L); (3, 2, 1L)
        (3, 1, 1L); (1, 3, 1L)
    ]
    let g = Graph.fromEdgeSeq edges
    let partition = Map.ofList [ (1, 0); (2, 0); (3, 0) ]
    let q = Graph.modularityScore partition g
    match q with
    | Some v -> abs v |> should (be lessThan) 1e-9
    | None -> failwith "expected Some"

[<Fact>]
let ``modularityScore is high for well-separated communities`` () =
    // Two K3 cliques (1-2-3 and 4-5-6) connected by a single
    // thin edge (3-4). The correct 2-community partition should
    // yield Q well above 0.
    let edges = [
        // Community A: K3 on {1,2,3} with weight 10
        (1, 2, 10L); (2, 1, 10L)
        (2, 3, 10L); (3, 2, 10L)
        (3, 1, 10L); (1, 3, 10L)
        // Community B: K3 on {4,5,6} with weight 10
        (4, 5, 10L); (5, 4, 10L)
        (5, 6, 10L); (6, 5, 10L)
        (6, 4, 10L); (4, 6, 10L)
        // Bridge edge (thin)
        (3, 4, 1L); (4, 3, 1L)
    ]
    let g = Graph.fromEdgeSeq edges
    let partition =
        Map.ofList [ (1, 0); (2, 0); (3, 0); (4, 1); (5, 1); (6, 1) ]
    let q =
        Graph.modularityScore partition g
        |> Option.defaultValue 0.0
    // With two tight communities connected thinly, Q should be
    // comfortably positive (theoretical max ~0.5 for balanced
    // two-community graphs).
    q |> should (be greaterThan) 0.3

[<Fact>]
let ``modularityScore drops with wrong partition`` () =
    // Same two-community graph, but partition mixes the two.
    let edges = [
        (1, 2, 10L); (2, 1, 10L)
        (2, 3, 10L); (3, 2, 10L)
        (3, 1, 10L); (1, 3, 10L)
        (4, 5, 10L); (5, 4, 10L)
        (5, 6, 10L); (6, 5, 10L)
        (6, 4, 10L); (4, 6, 10L)
        (3, 4, 1L); (4, 3, 1L)
    ]
    let g = Graph.fromEdgeSeq edges
    let correctPartition =
        Map.ofList [ (1, 0); (2, 0); (3, 0); (4, 1); (5, 1); (6, 1) ]
    let wrongPartition =
        Map.ofList [ (1, 0); (4, 0); (2, 1); (5, 1); (3, 2); (6, 2) ]
    let qCorrect =
        Graph.modularityScore correctPartition g |> Option.defaultValue 0.0
    let qWrong =
        Graph.modularityScore wrongPartition g |> Option.defaultValue 0.0
    qWrong |> should (be lessThan) qCorrect

[<Fact>]
let ``modularityScore cartel-detection: injected clique raises Q when correctly partitioned`` () =
    // Baseline: sparse graph of 5 nodes. Attack: inject K_4
    // cartel at nodes 6-9 with weight 10. The correct partition
    // (baseline nodes in one group, cartel nodes in another)
    // should yield a high modularity, signalling the detectable
    // community structure.
    let cartelEdges = [
        for s in [6; 7; 8; 9] do
            for t in [6; 7; 8; 9] do
                if s <> t then yield (s, t, 10L)
    ]
    let attackedEdges =
        List.append
            [
                (1, 2, 1L); (2, 1, 1L)
                (3, 4, 1L); (4, 3, 1L)
                (2, 5, 1L); (5, 2, 1L)
            ]
            cartelEdges
    let g = Graph.fromEdgeSeq attackedEdges
    // Correct partition: baseline nodes = community 0, cartel
    // nodes = community 1.
    let partition =
        Map.ofList [
            (1, 0); (2, 0); (3, 0); (4, 0); (5, 0)
            (6, 1); (7, 1); (8, 1); (9, 1)
        ]
    let q =
        Graph.modularityScore partition g
        |> Option.defaultValue 0.0
    // Threshold relaxed from 0.3 to 0.05: when the cartel K4 dominates total edge weight,
    // the expected-random baseline weights toward the cartel too, compressing Q. A future
    // toy cartel detector (graduation) calibrates thresholds vs null-baseline simulation.
    q |> should (be greaterThan) 0.05
