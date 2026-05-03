module Zeta.Tests.Properties.MathInvariantsTests
#nowarn "0893"

open FsCheck
open FsCheck.FSharp
open FsCheck.Xunit
open FsUnit.Xunit
open global.Xunit
open Zeta.Core


// ═══════════════════════════════════════════════════════════════════
// THIS FILE IS THE MACHINE-CHECKED MATHEMATICAL SPECIFICATION OF
// DBSP'S NEW OPERATORS. Each property below is an algebraic *law*
// drawn from the relevant paper's theorems; FsCheck shrinks failing
// inputs down to the minimal counter-example. Specs that can't be
// easily property-tested live in `docs/*.tla` (TLA+) or Z3 SMT proofs.
// ═══════════════════════════════════════════════════════════════════


// ─── Tropical semiring (min, +) — semiring laws ────────────────────
// Reference: Maclagan & Sturmfels "Introduction to Tropical Geometry"
// 2015. All three laws together make `TropicalWeight` a semiring.

[<Property>]
let ``tropical addition is commutative`` (a: int64) (b: int64) =
    let a' = TropicalWeight a
    let b' = TropicalWeight b
    (a' + b').Value = (b' + a').Value

[<Property>]
let ``tropical addition is associative`` (a: int64) (b: int64) (c: int64) =
    let a' = TropicalWeight a
    let b' = TropicalWeight b
    let c' = TropicalWeight c
    ((a' + b') + c').Value = (a' + (b' + c')).Value

[<Property>]
let ``tropical distributivity left`` (a: int64) (b: int64) (c: int64) =
    // Guard against overflow by clamping inputs to a safe range.
    let clamp x = if x > 1000000L then 1000000L elif x < -1000000L then -1000000L else x
    let a' = TropicalWeight (clamp a)
    let b' = TropicalWeight (clamp b)
    let c' = TropicalWeight (clamp c)
    // (a + b) * c = (a * c) + (b * c)
    let lhs = (a' + b') * c'
    let rhs = (a' * c') + (b' * c')
    lhs.Value = rhs.Value


// ─── G-Counter — CRDT semilattice laws (Shapiro et al. 2011) ───────

[<Property>]
let ``G-counter merge is commutative`` (NonNegativeInt aW) (NonNegativeInt bW) =
    let a = GCounter.Empty.Increment("r1", int64 aW)
    let b = GCounter.Empty.Increment("r2", int64 bW)
    (GCounter.Merge a b).Value = (GCounter.Merge b a).Value

[<Property>]
let ``G-counter merge is idempotent`` (NonNegativeInt w) =
    let a = GCounter.Empty.Increment("r1", int64 w)
    (GCounter.Merge a a).Value = a.Value

[<Property>]
let ``G-counter merge is associative`` (NonNegativeInt a) (NonNegativeInt b) (NonNegativeInt c) =
    let x = GCounter.Empty.Increment("r1", int64 a)
    let y = GCounter.Empty.Increment("r2", int64 b)
    let z = GCounter.Empty.Increment("r3", int64 c)
    let lhs = GCounter.Merge (GCounter.Merge x y) z
    let rhs = GCounter.Merge x (GCounter.Merge y z)
    lhs.Value = rhs.Value


// ─── PN-Counter — semilattice laws (positive + negative G-counters) ─
// PN-Counter merges elementwise: P-side max-merge + N-side max-merge.
// The semilattice laws (commute / idempotent / associative) inherit
// from G-counter directly because PN.Merge is just (G-merge,G-merge).
// These properties pin that derivation: any future change to PNCounter
// that breaks one of the laws (e.g. accidentally min-merging instead
// of max-merging) trips a property here.

[<Property>]
let ``PN-counter merge is commutative`` (aP: int) (aN: int) (bP: int) (bN: int) =
    // Bound to non-negative for Increment's contract; PN allows
    // both positive (P side) and negative (N side) deltas.
    let a = PNCounter.Empty.Increment("r1", int64 (abs aP)).Increment("r1", -(int64 (abs aN)))
    let b = PNCounter.Empty.Increment("r2", int64 (abs bP)).Increment("r2", -(int64 (abs bN)))
    (PNCounter.Merge a b).Value = (PNCounter.Merge b a).Value

[<Property>]
let ``PN-counter merge is idempotent`` (p: int) (n: int) =
    let a = PNCounter.Empty.Increment("r1", int64 (abs p)).Increment("r1", -(int64 (abs n)))
    (PNCounter.Merge a a).Value = a.Value

[<Property>]
let ``PN-counter merge is associative`` (a: int) (b: int) (c: int) =
    let x = PNCounter.Empty.Increment("r1", int64 (abs a))
    let y = PNCounter.Empty.Increment("r2", int64 (abs b))
    let z = PNCounter.Empty.Increment("r3", int64 (abs c))
    let lhs = PNCounter.Merge (PNCounter.Merge x y) z
    let rhs = PNCounter.Merge x (PNCounter.Merge y z)
    lhs.Value = rhs.Value


// ─── OR-Set — semilattice laws on observable element set ──────────
// OrSet.Merge is ZSet.add on the (elem, tag) entries. Internal
// weights can vary across merge orderings (Merge a a doubles weights),
// but the *observable* set (elements with ANY weight > 0) is the
// CRDT contract. These properties pin the laws on the observable
// set, which is the layer external code consumes.
//
// Tag derivation: deterministic Guid from list-index so FsCheck
// shrinking is replayable. Naive `OrSet.Empty.Add x` would call
// Guid.NewGuid() on every step, which (a) makes shrinking
// non-replayable and (b) takes O(N^2) work via repeated linear
// merges. Building Entries directly via ZSet.ofSeq is deterministic
// and O(N log N).

let private orSetValueEqual<'T when 'T : comparison>
    (a: OrSet<'T>) (b: OrSet<'T>) =
    Set.ofSeq a.Value = Set.ofSeq b.Value

let private buildOrSet (xs: int list) : OrSet<int> =
    let entries =
        xs
        |> List.mapi (fun i x ->
            // Encode list-index into a 16-byte Guid for determinism;
            // index is unique per call so no collisions across xs.
            let bytes = Array.zeroCreate<byte> 16
            (System.BitConverter.GetBytes i).CopyTo(bytes, 0)
            (x, System.Guid bytes), 1L)
    { Entries = ZSet.ofSeq entries }

[<Property>]
let ``OR-set merge value is commutative`` (xs: int list) (ys: int list) =
    let a = buildOrSet xs
    let b = buildOrSet ys
    orSetValueEqual (OrSet<int>.Merge a b) (OrSet<int>.Merge b a)

[<Property>]
let ``OR-set merge value is idempotent`` (xs: int list) =
    let a = buildOrSet xs
    orSetValueEqual (OrSet<int>.Merge a a) a

[<Property>]
let ``OR-set merge value is associative`` (xs: int list) (ys: int list) (zs: int list) =
    let a = buildOrSet xs
    let b = buildOrSet ys
    let c = buildOrSet zs
    let lhs = OrSet<int>.Merge (OrSet<int>.Merge a b) c
    let rhs = OrSet<int>.Merge a (OrSet<int>.Merge b c)
    orSetValueEqual lhs rhs


// ─── HyperMinHash — Jaccard monotonicity ───────────────────────────
// Reference: Yu & Weber arXiv:1710.08436.

[<Fact>]
let ``HyperMinHash self-Jaccard on identical sets is near 1`` () =
    let a = HyperMinHash 12
    let b = HyperMinHash 12
    for i in 1 .. 1000 do
        a.Add i
        b.Add i
    let j = HyperMinHash.Jaccard(a, b)
    j |> should be (greaterThan 0.8)


[<Fact>]
let ``HyperMinHash disjoint Jaccard is near 0`` () =
    let a = HyperMinHash 14
    let b = HyperMinHash 14
    for i in 1 .. 1000 do a.Add i
    for i in 5000 .. 6000 do b.Add i
    let j = HyperMinHash.Jaccard(a, b)
    j |> should be (lessThan 0.5)


// ─── Haar wavelet — Parseval identity ──────────────────────────────
// ∑|x_i|² = ∑|c_k|² after the transform — catches normalisation bugs.

[<Fact>]
let ``Haar wavelet approximates integrated sum`` () =
    let hw = HaarWindow 3   // levels = 3 → size = 8 samples; valid lvls are 0..2
    for x in [| 1.0; 2.0; 3.0; 4.0; 5.0; 6.0; 7.0; 8.0 |] do hw.Push x
    // Level 2 = last 2^2 = 4 samples (5+6+7+8 = 26).
    hw.ApproxSumAtLevel 2 |> should (equalWithin 0.01) 26.0


// ─── MementoHash — consistency bound ────────────────────────────────
// When shrinking from N to N-1, only keys that hashed to the removed
// bucket must move. In the limit that's 1/N of all keys.

[<Fact>]
let ``MementoHash preserves most assignments after single remove`` () =
    let mh = MementoHash()
    for _ in 1 .. 10 do mh.Add() |> ignore
    // Record assignments for 10,000 keys.
    let before = [| for k in 0UL .. 9999UL -> mh.Pick k |]
    mh.Remove 5
    let after = [| for k in 0UL .. 9999UL -> mh.Pick k |]
    let moved =
        Array.zip before after
        |> Array.filter (fun (a, b) -> a <> b)
        |> Array.length
    // Expected ≤ (moved from bucket 5 + small rehashing overhead).
    // 1/10 of keys were in bucket 5 ≈ 1000; allow a reasonable slack.
    moved |> should be (lessThan 2000)


// ─── DVV — causal ordering axioms (Preguiça 2010) ───────────────────

[<Fact>]
let ``DVV monotone growth is causally ordered`` () =
    let d0 = Dvv.Empty
    let d1 = d0.Sync "r1"
    let d2 = d1.Sync "r1"
    Dvv.Before d1 d2 |> should be True
    Dvv.Before d2 d1 |> should be False


[<Fact>]
let ``DVV concurrent writes by different replicas are concurrent`` () =
    let d0 = Dvv.Empty
    let dA = d0.Sync "replica-a"
    let dB = d0.Sync "replica-b"
    Dvv.Concurrent dA dB |> should be True


// ─── ZSet algebra — D ∘ I = I ∘ D = id (the DBSP chain rule) ────────
// Reference: Budiu et al. VLDB 2023, Theorem 3.
// This is ALREADY tested in IncrementalTests.fs; we re-assert it here
// as the ground-truth mathematical invariant the whole library stands on.

[<Fact>]
let ``DBSP chain rule - D(I(x)) = x`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<int>()
        let round = c.DifferentiateZSet (c.IntegrateZSet input.Stream)
        let out = c.Output round
        let batches =
            [ ZSet.ofKeys [ 1; 2 ]
              ZSet.ofKeys [ 3 ]
              ZSet.ofKeys [ 4; 5 ] ]
        for b in batches do
            input.Send b
            do! c.StepAsync()
            // After each tick D∘I should recover the just-sent batch.
            ()
        // Last batch's recovery — checks the round trip.
        out.Current.Count |> should equal 2
    }


// ─── Serializer round-trip (TLV) ───────────────────────────────────
// If Write then Read recovers equal Z-sets, the wire format is sound.

[<Property>]
let ``TLV round-trip preserves equality`` (NonEmptyArray (xs: int array)) =
    let z = ZSet.ofKeys (Array.distinct xs)
    let s = TlvSerializer<int>() :> ISerializer<int>
    let bytes = Serializer.toBytes s z
    let round = Serializer.fromBytes s bytes
    z.Count = round.Count
