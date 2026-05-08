module Zeta.Tests.Algebra.StructureFingerprintTests

open FsUnit.Xunit
open global.Xunit
open Zeta.Core


// ─── Helper builders ──────────────────────────

let private pipeline (n: int) : Graph<int> =
    [ for i in 0 .. n - 2 -> (i, i + 1, 1L) ]
    |> Graph.fromEdgeSeq

let private ring (n: int) : Graph<int> =
    [ for i in 0 .. n - 1 -> (i, (i + 1) % n, 1L) ]
    |> Graph.fromEdgeSeq

let private star (n: int) : Graph<int> =
    [ for i in 1 .. n - 1 -> (0, i, 1L) ]
    |> Graph.fromEdgeSeq

let private tree () : Graph<int> =
    Graph.fromEdgeSeq
        [ (0, 1, 1L); (0, 2, 1L); (1, 3, 1L); (1, 4, 1L); (2, 5, 1L) ]

let private layeredDag () : Graph<int> =
    Graph.fromEdgeSeq
        [ (0, 1, 1L); (0, 2, 1L)
          (1, 3, 1L); (2, 3, 1L)
          (1, 4, 1L); (2, 4, 1L)
          (3, 5, 1L); (4, 5, 1L) ]

let private stateMachine () : Graph<string> =
    Graph.fromEdgeSeq
        [ ("idle", "running", 1L)
          ("running", "idle", 1L)
          ("running", "error", 1L)
          ("error", "idle", 1L)
          ("idle", "paused", 1L)
          ("paused", "idle", 1L) ]

let private pubsub () : Graph<int> =
    Graph.fromEdgeSeq
        [ (0, 1, 1L); (0, 2, 1L); (0, 3, 1L); (0, 4, 1L); (0, 5, 1L) ]


// ─── Pipeline recognition ─────────────────────

[<Fact>]
let ``fingerprint recognizes a linear 5-node chain as Pipeline`` () =
    let fp = StructureFingerprint.fingerprint (pipeline 5)
    fp.Shape |> should equal StructureFingerprint.Pipeline
    fp.Confidence |> should be (greaterThan 0.8)

[<Fact>]
let ``fingerprint recognizes a 3-node chain as Pipeline`` () =
    let fp = StructureFingerprint.fingerprint (pipeline 3)
    fp.Shape |> should equal StructureFingerprint.Pipeline


// ─── Ring recognition ─────────────────────────

[<Fact>]
let ``fingerprint recognizes a 5-node ring as Ring`` () =
    let fp = StructureFingerprint.fingerprint (ring 5)
    fp.Shape |> should equal StructureFingerprint.Ring
    fp.Confidence |> should be (greaterThan 0.8)

[<Fact>]
let ``fingerprint recognizes a 3-node ring as Ring`` () =
    let fp = StructureFingerprint.fingerprint (ring 3)
    fp.Shape |> should equal StructureFingerprint.Ring


// ─── Star recognition ─────────────────────────

[<Fact>]
let ``fingerprint recognizes a star graph as StarTopology`` () =
    let fp = StructureFingerprint.fingerprint (star 6)
    fp.Shape |> should equal StructureFingerprint.StarTopology
    fp.Confidence |> should be (greaterThan 0.8)


// ─── Tree recognition ─────────────────────────

[<Fact>]
let ``fingerprint recognizes a branching tree as TreeHierarchy`` () =
    let fp = StructureFingerprint.fingerprint (tree ())
    fp.Shape |> should equal StructureFingerprint.TreeHierarchy
    fp.Confidence |> should be (greaterThan 0.8)


// ─── Layered DAG recognition ──────────────────

[<Fact>]
let ``fingerprint recognizes a multi-layer DAG as LayeredDag`` () =
    let fp = StructureFingerprint.fingerprint (layeredDag ())
    fp.Shape |> should equal StructureFingerprint.LayeredDag
    fp.Confidence |> should be (greaterThan 0.7)


// ─── State machine recognition ────────────────

[<Fact>]
let ``fingerprint recognizes a cyclic state graph as StateMachine`` () =
    let fp = StructureFingerprint.fingerprint (stateMachine ())
    fp.Shape |> should equal StructureFingerprint.StateMachine
    fp.Confidence |> should be (greaterThan 0.4)


// ─── Pub/sub recognition ──────────────────────

[<Fact>]
let ``fingerprint recognizes a fan-out from single source as PubSub or Star`` () =
    let fp = StructureFingerprint.fingerprint (pubsub ())
    (fp.Shape = StructureFingerprint.PubSub
     || fp.Shape = StructureFingerprint.StarTopology)
    |> should equal true


// ─── Empty graph ──────────────────────────────

[<Fact>]
let ``fingerprint of empty graph is Unknown with zero confidence`` () =
    let fp = StructureFingerprint.fingerprint Graph.empty<int>
    fp.Shape |> should equal StructureFingerprint.Unknown
    fp.Confidence |> should equal 0.0


// ─── Signal extraction ────────────────────────

[<Fact>]
let ``extractSignals returns correct node and edge counts for pipeline`` () =
    let signals = StructureFingerprint.extractSignals (pipeline 4)
    signals.NodeCount |> should equal 4
    signals.EdgeCount |> should equal 3
    signals.HasCycles |> should equal false
    signals.RootCount |> should equal 1
    signals.LeafCount |> should equal 1

[<Fact>]
let ``extractSignals detects cycles in a ring`` () =
    let signals = StructureFingerprint.extractSignals (ring 4)
    signals.HasCycles |> should equal true
    signals.RootCount |> should equal 0
    signals.LeafCount |> should equal 0


// ─── Similarity ───────────────────────────────

[<Fact>]
let ``similarity of same shape is 1.0`` () =
    let fp1 = StructureFingerprint.fingerprint (pipeline 4)
    let fp2 = StructureFingerprint.fingerprint (pipeline 6)
    StructureFingerprint.similarity fp1 fp2 |> should equal 1.0

[<Fact>]
let ``similarity of pipeline and layered DAG is 0.5`` () =
    let fp1 = StructureFingerprint.fingerprint (pipeline 4)
    let fp2 = StructureFingerprint.fingerprint (layeredDag ())
    StructureFingerprint.similarity fp1 fp2 |> should equal 0.5

[<Fact>]
let ``similarity of unrelated shapes is 0.0`` () =
    let fp1 = StructureFingerprint.fingerprint (ring 5)
    let fp2 = StructureFingerprint.fingerprint (pipeline 5)
    StructureFingerprint.similarity fp1 fp2 |> should equal 0.0


// ─── Shape labels ─────────────────────────────

[<Fact>]
let ``shapeLabel returns kebab-case for all shapes`` () =
    StructureFingerprint.shapeLabel StructureFingerprint.Pipeline
    |> should equal "pipeline"
    StructureFingerprint.shapeLabel StructureFingerprint.StateMachine
    |> should equal "state-machine"
    StructureFingerprint.shapeLabel StructureFingerprint.Unknown
    |> should equal "unknown"
