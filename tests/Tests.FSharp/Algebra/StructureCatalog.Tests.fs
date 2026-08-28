module Zeta.Tests.Algebra.StructureCatalogTests
#nowarn "0893"

open FsUnit.Xunit
open global.Xunit
open Zeta.Core


// ─── Helper graphs (reuse real Zeta patterns) ───

let private pipelineGraph =
    Graph.fromEdgeSeq [ (0, 1, 1L); (1, 2, 1L); (2, 3, 1L); (3, 4, 1L) ]

let private ringGraph =
    Graph.fromEdgeSeq [ (0, 1, 1L); (1, 2, 1L); (2, 3, 1L); (3, 0, 1L) ]

let private starGraph =
    Graph.fromEdgeSeq [ (0, 1, 1L); (0, 2, 1L); (0, 3, 1L); (0, 4, 1L); (0, 5, 1L) ]

let private treeGraph =
    Graph.fromEdgeSeq
        [ (0, 1, 1L); (0, 2, 1L); (1, 3, 1L); (1, 4, 1L); (2, 5, 1L) ]

let private layeredDagGraph =
    Graph.fromEdgeSeq
        [ (0, 1, 1L); (0, 2, 1L)
          (1, 3, 1L); (2, 3, 1L)
          (1, 4, 1L); (2, 4, 1L)
          (3, 5, 1L); (4, 5, 1L) ]


// ─── Empty catalog ───────────────────────────────

[<Fact>]
let ``empty catalog has zero entries`` () =
    StructureCatalog.count StructureCatalog.empty<int>
    |> should equal 0

[<Fact>]
let ``queryByShape on empty catalog returns empty list`` () =
    StructureCatalog.queryByShape
        StructureFingerprint.Pipeline
        StructureCatalog.empty<int>
    |> should be Empty


// ─── Add and query by shape ──────────────────────

[<Fact>]
let ``add then queryByShape returns the added entry`` () =
    let catalog =
        StructureCatalog.empty<int>
        |> StructureCatalog.add "etl-pipeline" pipelineGraph

    let results =
        StructureCatalog.queryByShape StructureFingerprint.Pipeline catalog

    results |> should haveLength 1
    results.[0].Id |> should equal "etl-pipeline"

[<Fact>]
let ``multiple entries with same shape are all returned`` () =
    let catalog =
        StructureCatalog.empty<int>
        |> StructureCatalog.add "pipeline-a" pipelineGraph
        |> StructureCatalog.add "pipeline-b"
            (Graph.fromEdgeSeq [ (10, 11, 1L); (11, 12, 1L); (12, 13, 1L) ])

    let results =
        StructureCatalog.queryByShape StructureFingerprint.Pipeline catalog

    results |> should haveLength 2

[<Fact>]
let ``queryByShape returns only matching shape`` () =
    let catalog =
        StructureCatalog.empty<int>
        |> StructureCatalog.add "my-pipeline" pipelineGraph
        |> StructureCatalog.add "my-ring" ringGraph

    let pipelines =
        StructureCatalog.queryByShape StructureFingerprint.Pipeline catalog
    let rings =
        StructureCatalog.queryByShape StructureFingerprint.Ring catalog

    pipelines |> should haveLength 1
    pipelines.[0].Id |> should equal "my-pipeline"
    rings |> should haveLength 1
    rings.[0].Id |> should equal "my-ring"


// ─── Count ───────────────────────────────────────

[<Fact>]
let ``count reflects total entries across all shapes`` () =
    let catalog =
        StructureCatalog.empty<int>
        |> StructureCatalog.add "p" pipelineGraph
        |> StructureCatalog.add "r" ringGraph
        |> StructureCatalog.add "s" starGraph
        |> StructureCatalog.add "t" treeGraph

    StructureCatalog.count catalog |> should equal 4


// ─── Query by similarity ─────────────────────────

[<Fact>]
let ``queryBySimilarity with threshold 1.0 returns exact matches only`` () =
    let catalog =
        StructureCatalog.empty<int>
        |> StructureCatalog.add "pipe" pipelineGraph
        |> StructureCatalog.add "ring" ringGraph
        |> StructureCatalog.add "dag" layeredDagGraph

    let probe = StructureFingerprint.fingerprint pipelineGraph
    let results = StructureCatalog.queryBySimilarity probe 1.0 catalog

    results |> should haveLength 1
    (fst results.[0]).Id |> should equal "pipe"
    snd results.[0] |> should equal 1.0

[<Fact>]
let ``queryBySimilarity with lower threshold returns related shapes`` () =
    let catalog =
        StructureCatalog.empty<int>
        |> StructureCatalog.add "pipe" pipelineGraph
        |> StructureCatalog.add "dag" layeredDagGraph
        |> StructureCatalog.add "ring" ringGraph

    let probe = StructureFingerprint.fingerprint pipelineGraph
    let results = StructureCatalog.queryBySimilarity probe 0.5 catalog

    results |> List.length |> should be (greaterThanOrEqualTo 2)
    let ids = results |> List.map (fun (e, _) -> e.Id)
    ids |> should contain "pipe"
    ids |> should contain "dag"


// ─── Real Zeta pattern: catalog of architecture shapes ──

[<Fact>]
let ``catalog with Zeta architecture shapes supports shape query`` () =
    let catalog =
        StructureCatalog.empty<int>
        |> StructureCatalog.add "zeta-operator-pipeline" pipelineGraph
        |> StructureCatalog.add "zeta-spine-tree" treeGraph
        |> StructureCatalog.add "zeta-circuit-dag" layeredDagGraph
        |> StructureCatalog.add "zeta-event-ring" ringGraph
        |> StructureCatalog.add "zeta-hub-star" starGraph

    StructureCatalog.count catalog |> should equal 5

    let trees =
        StructureCatalog.queryByShape StructureFingerprint.TreeHierarchy catalog
    trees |> should haveLength 1
    trees.[0].Id |> should equal "zeta-spine-tree"

    let dags =
        StructureCatalog.queryByShape StructureFingerprint.LayeredDag catalog
    dags |> should haveLength 1
    dags.[0].Id |> should equal "zeta-circuit-dag"
