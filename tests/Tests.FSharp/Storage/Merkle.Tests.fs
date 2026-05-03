module Zeta.Tests.Storage.MerkleTests
#nowarn "0893"

open FsCheck
open FsCheck.FSharp
open FsCheck.Xunit
open FsUnit.Xunit
open global.Xunit
open Zeta.Core


[<Fact>]
let ``MerkleTree root of no leaves is Zero`` () =
    let t = MerkleTree [||]
    t.Root |> should equal MerkleHash.Zero


[<Fact>]
let ``MerkleTree root is deterministic`` () =
    let leaves = [| "a"B; "b"B; "c"B |]
    let t1 = MerkleTree leaves
    let t2 = MerkleTree leaves
    t1.Root |> should equal t2.Root


[<Fact>]
let ``MerkleTree root changes under a single-leaf edit`` () =
    let t1 = MerkleTree [| "a"B; "b"B; "c"B |]
    let t2 = MerkleTree [| "a"B; "b"B; "d"B |]
    t1.Root |> should not' (equal t2.Root)


[<Fact>]
let ``MerkleTree LeafDiff detects single-leaf change`` () =
    let leaves1 = [| "alpha"B; "bravo"B; "charlie"B; "delta"B |]
    let leaves2 = [| "alpha"B; "bravo"B; "charlie"B; "echo"B |]
    let diff = (MerkleTree leaves2).LeafDiff(MerkleTree leaves1)
    diff.Length |> should equal 1
    diff.[0] |> should equal 3


// ─── Property: same-leaves determinism + pair collision-freedom ────
// Generalisations of the existing [<Fact>] checks. FsCheck shrinks
// failing inputs to minimal counter-examples — useful if the leaf
// hashing pipeline ever loses determinism (e.g. a regression that
// hashes byte arrays via reference equality) or if tree-building
// introduces accidental collisions on small byte-array inputs.

[<Property>]
let ``MerkleTree root is deterministic for any leaf set`` (leaves: byte array array) =
    // Both trees built from the SAME input must produce equal roots.
    // Treats null arrays as empty (FsCheck can generate null).
    let safe = if isNull leaves then [||] else leaves |> Array.map (fun b -> if isNull b then [||] else b)
    let t1 = MerkleTree safe
    let t2 = MerkleTree safe
    t1.Root = t2.Root

[<Property>]
let ``MerkleTree root differs under any single-leaf edit (collision-free in practice)``
        (NonEmptyArray (leaves: byte array array)) (replacement: byte array) =
    // Replace the first leaf, expect a different root. The 128-bit
    // XxHash makes practical collisions astronomically unlikely for
    // the small inputs FsCheck generates; if the hashing pipeline
    // regresses to <128 bits or to a non-collision-resistant hash,
    // this property starts failing.
    let arr = leaves |> Array.map (fun b -> if isNull b then [||] else b)
    let r = if isNull replacement then [||] else replacement
    if arr.[0] = r then true   // skip cases where replacement is identical
    else
        let modified = Array.copy arr
        modified.[0] <- r
        (MerkleTree arr).Root <> (MerkleTree modified).Root
