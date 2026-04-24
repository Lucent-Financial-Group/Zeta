module Zeta.Tests.Support.CartelInjector

open Zeta.Core


/// **CartelInjector** — test-only red-team synthetic cartel
/// generator. Lives in `tests/_Support/` per Otto-118 discipline:
/// adversarial tooling is NOT shipped as Zeta public API. Purpose:
/// validate detectors, not attack production systems.
///
/// Provenance: 13th ferry §3 (Synthetic Cartel Injector) + 14th
/// ferry §Adversarial Simulation Loop + Amara Otto-122 validation
/// bar (toy cartel at 50 validators + 5-node cartel).


/// Build a baseline synthetic validator network with random-ish
/// sparse edges. `nodeCount` synthetic validator nodes labelled
/// `0 .. nodeCount - 1`. Each node gets `~avgDegree` outbound
/// edges to random other nodes with weight 1. The resulting
/// graph has no deliberate community structure — a "null"
/// baseline the detector should NOT flag.
let buildBaseline (rng: System.Random) (nodeCount: int) (avgDegree: int) : Graph<int> =
    let edges =
        [ for s in 0 .. nodeCount - 1 do
              for _ in 1 .. avgDegree do
                  let t = rng.Next(nodeCount)
                  if t <> s then yield (s, t, 1L) ]
    Graph.fromEdgeSeq edges


/// Inject a dense cartel clique of `cartelSize` nodes picked
/// uniformly at random from `0 .. nodeCount - 1`. Every pair
/// within the cartel gets an edge of weight `cartelWeight` in
/// BOTH directions. Lower `cartelWeight` = stealthier cartel;
/// higher = louder.
///
/// Returns the attacked graph + the set of cartel node-IDs so
/// the test can verify detection correctness.
let injectCartel
        (rng: System.Random)
        (baseline: Graph<int>)
        (cartelSize: int)
        (cartelWeight: int64)
        (nodeCount: int)
        : Graph<int> * Set<int> =
    let cartelNodes =
        let shuffled = [| 0 .. nodeCount - 1 |]
        // Fisher-Yates shuffle
        for i in shuffled.Length - 1 .. -1 .. 1 do
            let j = rng.Next(i + 1)
            let tmp = shuffled.[i]
            shuffled.[i] <- shuffled.[j]
            shuffled.[j] <- tmp
        shuffled |> Array.take cartelSize |> Set.ofArray
    let cartelEdges =
        [ for s in cartelNodes do
              for t in cartelNodes do
                  if s <> t then yield (s, t, cartelWeight) ]
    let attacked =
        let combined =
            List.append
                (baseline.Edges.AsSpan().ToArray()
                 |> Array.map (fun entry ->
                     let (s, t) = entry.Key
                     (s, t, entry.Weight))
                 |> Array.toList)
                cartelEdges
        Graph.fromEdgeSeq combined
    attacked, cartelNodes
