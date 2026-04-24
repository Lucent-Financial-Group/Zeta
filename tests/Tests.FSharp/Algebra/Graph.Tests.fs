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


// ─── map / filter / distinct / union / difference ─────────

[<Fact>]
let ``map relabels nodes via the projection`` () =
    let g = Graph.fromEdgeSeq [ (1, 2, 3L); (2, 3, 1L) ]
    let g' = Graph.map (fun n -> n * 10) g
    Graph.edgeWeight 10 20 g' |> should equal 3L
    Graph.edgeWeight 20 30 g' |> should equal 1L

[<Fact>]
let ``map collisions sum weights via underlying ZSet consolidation`` () =
    // Two edges (1,2) and (3,4) both map to ("same", "same").
    // The underlying ZSet consolidates them.
    let g = Graph.fromEdgeSeq [ (1, 2, 3L); (3, 4, 5L) ]
    let g' = Graph.map (fun _ -> "collapsed") g
    Graph.edgeWeight "collapsed" "collapsed" g' |> should equal 8L
    Graph.edgeCount g' |> should equal 1

[<Fact>]
let ``filter keeps only edges matching the predicate`` () =
    let g =
        Graph.fromEdgeSeq [
            (1, 2, 3L)
            (2, 3, 1L)
            (3, 1, 5L)
        ]
    let g' = Graph.filter (fun (s, _) -> s > 1) g
    Graph.edgeCount g' |> should equal 2
    Graph.edgeWeight 2 3 g' |> should equal 1L
    Graph.edgeWeight 3 1 g' |> should equal 5L
    Graph.edgeWeight 1 2 g' |> should equal 0L

[<Fact>]
let ``distinct collapses multi-edges to multiplicity 1`` () =
    let (g1, _) = Graph.addEdge 1 2 3L Graph.empty
    let (g2, _) = Graph.addEdge 1 2 4L g1
    // Now (1,2) has weight 7
    Graph.edgeWeight 1 2 g2 |> should equal 7L
    let g' = Graph.distinct g2
    Graph.edgeWeight 1 2 g' |> should equal 1L

[<Fact>]
let ``distinct drops anti-edges (negative-weight entries)`` () =
    // An anti-edge has negative multiplicity; set semantics say
    // it "doesn't exist" as a positive set member.
    let (g, _) = Graph.removeEdge 1 2 3L Graph.empty
    Graph.edgeWeight 1 2 g |> should equal -3L
    let g' = Graph.distinct g
    Graph.edgeWeight 1 2 g' |> should equal 0L

[<Fact>]
let ``union sums edge weights across graphs`` () =
    let a = Graph.fromEdgeSeq [ (1, 2, 3L); (2, 3, 1L) ]
    let b = Graph.fromEdgeSeq [ (1, 2, 5L); (3, 4, 2L) ]
    let u = Graph.union a b
    Graph.edgeWeight 1 2 u |> should equal 8L
    Graph.edgeWeight 2 3 u |> should equal 1L
    Graph.edgeWeight 3 4 u |> should equal 2L

[<Fact>]
let ``difference subtracts b from a (retraction-native)`` () =
    let a = Graph.fromEdgeSeq [ (1, 2, 5L); (2, 3, 3L) ]
    let b = Graph.fromEdgeSeq [ (1, 2, 2L); (3, 4, 1L) ]
    let d = Graph.difference a b
    Graph.edgeWeight 1 2 d |> should equal 3L      // 5 - 2
    Graph.edgeWeight 2 3 d |> should equal 3L      // preserved
    Graph.edgeWeight 3 4 d |> should equal -1L     // anti-edge

[<Fact>]
let ``union then difference recovers original (retraction conservation across operators)`` () =
    // The same algebraic invariant from single-edge mutations,
    // demonstrated across whole-graph operators. Union-with-b
    // followed by difference-with-b restores the original
    // (modulo consolidation metadata).
    let a = Graph.fromEdgeSeq [ (1, 2, 5L); (2, 3, 3L) ]
    let b = Graph.fromEdgeSeq [ (1, 2, 2L); (3, 4, 7L) ]
    let combined = Graph.union a b
    let restored = Graph.difference combined b
    Graph.edgeWeight 1 2 restored |> should equal 5L
    Graph.edgeWeight 2 3 restored |> should equal 3L
    Graph.edgeWeight 3 4 restored |> should equal 0L
