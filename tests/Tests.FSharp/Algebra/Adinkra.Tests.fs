module Zeta.Tests.Algebra.AdinkraTests

open FsUnit.Xunit
open global.Xunit
open Zeta.Core

[<Fact>]
let ``BinaryVector operations are correct`` () =
    let v1 = BinaryVector(5uy) // binary: 00000101
    v1.Weight |> should equal 2
    v1.GetBit(0) |> should be True
    v1.GetBit(1) |> should be False
    v1.GetBit(2) |> should be True
    v1.GetBit(3) |> should be False

    let v2 = BinaryVector(3uy) // binary: 00000011
    let sum = v1 + v2 // XOR: 5 ^ 3 = 6
    sum.Value |> should equal 6uy

    let prod = v1 * v2 // AND: 5 & 3 = 1
    prod.Value |> should equal 1uy

    // Dot product: (5 * 3).Weight % 2 = 1 % 2 = 1
    BinaryVector.Dot(v1, v2) |> should equal 1

    let fromBits = BinaryVector.FromBits([| true; false; true; false; false; false; false; false |])
    fromBits.Value |> should equal 5uy


[<Fact>]
let ``Extended Hamming code standard properties hold`` () =
    let code = BinaryCode.extendedHamming()

    // 1. Should have exactly 16 codewords
    code.Codewords.Count |> should equal 16

    // 2. Must be doubly-even (all weights are 0, 4, or 8)
    code.IsDoublyEven |> should be True
    for cw in code.Codewords do
        (cw.Weight % 4 = 0) |> should be True

    // 3. Must be self-dual (C = C^\perp)
    code.IsSelfDual |> should be True


[<Fact>]
let ``Adinkra Graph quotient H_8 / C has correct size and degrees`` () =
    let code = BinaryCode.extendedHamming()
    let graph = BinaryCode.constructAdinkra(code)

    // 1. Quotient vertex count: 2^8 / 16 = 16
    graph.Vertices.Count |> should equal 16

    // 2. Exactly 8 Bosons and 8 Fermions
    let bosons = graph.Vertices |> Set.filter (fun v -> v.Parity = Boson)
    let fermions = graph.Vertices |> Set.filter (fun v -> v.Parity = Fermion)
    bosons.Count |> should equal 8
    fermions.Count |> should equal 8

    // 3. 3-layer height ranking: height 0 (1 vertex), height 1 (8 vertices), height 2 (7 vertices)
    let height0 = graph.Vertices |> Set.filter (fun v -> v.Height = 0)
    let height1 = graph.Vertices |> Set.filter (fun v -> v.Height = 1)
    let height2 = graph.Vertices |> Set.filter (fun v -> v.Height = 2)
    height0.Count |> should equal 1
    height1.Count |> should equal 8
    height2.Count |> should equal 7

    // 4. Edge count: (16 vertices * 8 colors) / 2 = 64
    graph.Edges.Count |> should equal 64

    // 5. Each vertex has exactly 8 edges connected to it, one of each color 1..8
    for v in graph.Vertices do
        let connectedEdges =
            graph.Edges
            |> Seq.filter (fun e -> e.Source = v || e.Target = v)
            |> Seq.toArray
        connectedEdges.Length |> should equal 8

        let colors = connectedEdges |> Array.map (fun e -> e.Color) |> Set.ofArray
        colors.Count |> should equal 8
        colors |> should equal (Set.ofList [1..8])


[<Fact>]
let ``Adinkra Graph satisfies the loop sign condition`` () =
    let code = BinaryCode.extendedHamming()
    let graph = BinaryCode.constructAdinkra(code)

    // Verify that every 4-cycle has product of edge signs equal to -1
    graph.VerifyLoopCondition() |> should be True


[<Fact>]
let ``Adinkra State recovery and key derivation are robust`` () =
    let code = BinaryCode.extendedHamming()

    // 1. Deterministic Private Key Derivation
    let seed1 = [| 42uy; 100uy; 200uy |]
    let key1 = code.DerivePrivateKey(seed1)
    key1.Length |> should equal 32

    let key2 = code.DerivePrivateKey(seed1)
    key1 |> should equal key2 // must be deterministic

    let seed2 = [| 42uy; 100uy; 201uy |]
    let key3 = code.DerivePrivateKey(seed2)
    key1 |> should not' (equal key3) // must change with seed

    // 2. Incomplete State Recovery (Erasure correction)
    // Select a codeword, e.g. generator g0 = 225uy (11100001 in bit order: bits 0, 5, 6, 7 are 1, others 0)
    let original = BinaryVector(225uy)

    // Case A: 1 erasure (missing bit 0)
    let partial1 = Map.ofList [
        (1, original.GetBit(1))
        (2, original.GetBit(2))
        (3, original.GetBit(3))
        (4, original.GetBit(4))
        (5, original.GetBit(5))
        (6, original.GetBit(6))
        (7, original.GetBit(7))
    ]
    let recovered1 = code.RecoverState(partial1)
    recovered1.IsSome |> should be True
    recovered1.Value |> should equal original

    // Case B: 3 erasures (missing bits 0, 1, 2)
    let partial2 = Map.ofList [
        (3, original.GetBit(3))
        (4, original.GetBit(4))
        (5, original.GetBit(5))
        (6, original.GetBit(6))
        (7, original.GetBit(7))
    ]
    let recovered2 = code.RecoverState(partial2)
    recovered2.IsSome |> should be True
    recovered2.Value |> should equal original

    // Case C: Too many erasures (5 erasures, not uniquely recoverable)
    let partial3 = Map.ofList [
        (5, original.GetBit(5))
        (6, original.GetBit(6))
        (7, original.GetBit(7))
    ]
    let recovered3 = code.RecoverState(partial3)
    recovered3.IsNone |> should be True

    // 3. Error Correction / Corruption Decoding
    // Distance d=4 guarantees we can always correct up to 1 bit error.
    let corrupted = BinaryVector(224uy) // bit 0 flipped (225 ^ 1 = 224)
    let decoded = code.Decode(corrupted)
    decoded |> should equal original
