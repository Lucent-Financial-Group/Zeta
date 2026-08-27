module Zeta.Tests.Formal.FourCornerC4LawsTests

open FsUnit.Xunit
open global.Xunit
open Zeta.Core

// ═══════════════════════════════════════════════════════════════════
// FourCornerC4 — three embeddings, none an identification with Cl(p,q).
//
// What is proved here (structure, not a matching count of four):
//   (G) C₄ as a group on Phase: i⁴ = 1, i² = −1, mul is associative
//       and commutative (small, exhaustive).
//   (R) IStarRing witness: on ℂ, two quarter-turns = pingReturn =
//       Negate. This is why FourCornerTrace needs IStarRing.
//   (E) even-subalgebra embedding: e₁₂² = −1, so C₄ sits in Cl(3,0)
//       the way ℂ sits in ℍ.
//   (D) discriminator: sending i to a Cl(3,0) *vector* gives e₁² = +1
//       ≠ Negate(One). Cl(3,0) ≅ M₂(ℂ), Cl(0,1) ≅ ℂ. Related, not the
//       same object.
//   (T) composition: FourCornerTrace instantiates over Cl3.Mv weights
//       because Cl3.algebra is an IStarRing — the trace consumes Negate,
//       not a Clifford signature.
//
// HONESTY: none of this claims FourCorner *is* a Clifford algebra.
// Anchors: Clifford 1878; Lounesto 2001; Atiyah–Bott–Shapiro;
// Cayley–Dickson; Joyal–Street–Verity 1996; numerology-vs-number-theory.
// ═══════════════════════════════════════════════════════════════════

module FC = FourCornerC4

let private cRing = ImaginaryStack.complex
let private clRing = Cl3.algebra

let private closeC (a: Complex) (b: Complex) =
    abs (a.Real - b.Real) < 1e-12 && abs (a.Imag - b.Imag) < 1e-12

let private closeMv (a: Cl3.Mv) (b: Cl3.Mv) = Cl3.normSq (Cl3.sub a b) < 1e-12

let private phases = [ FC.One; FC.I; FC.MinusOne; FC.MinusI ]

// ── (G) C₄ group ────────────────────────────────────────────────────

[<Fact>]
let ``G: i² = −1 and i⁴ = 1 on the phase group`` () =
    FC.mul FC.I FC.I |> should equal FC.MinusOne
    FC.ofQuarterTurns 4 |> should equal FC.One
    FC.ofQuarterTurns 2 |> should equal FC.MinusOne
    FC.rotateI (FC.rotateI FC.north) |> should equal FC.south

[<Fact>]
let ``G: C₄ mul is associative, commutative, and unital — exhaustive`` () =
    for a in phases do
        FC.mul FC.One a |> should equal a
        FC.mul a FC.One |> should equal a
        for b in phases do
            FC.mul a b |> should equal (FC.mul b a)
            for c in phases do
                FC.mul (FC.mul a b) c |> should equal (FC.mul a (FC.mul b c))

// ── (R) IStarRing witness: why the VALUE ping-return needs a ring ──

[<Fact>]
let ``R: on ℂ, two quarter-turns equal pingReturn equal Negate`` () =
    let w = Doubled.make 0.3 0.4
    closeC (FC.twoQuarterTurns cRing w) (FC.pingReturn cRing w)
    |> should equal true
    closeC (FC.twoQuarterTurns cRing w) (cRing.Negate w) |> should equal true
    closeC (cRing.Mul(FC.toComplex FC.I, FC.toComplex FC.I)) (cRing.Negate cRing.One)
    |> should equal true

[<Fact>]
let ``R: C₄ phases embed as the unit circle of ImaginaryStack.complex`` () =
    for p in phases do
        let z = FC.toComplex p
        closeC (cRing.Mul(z, cRing.Conj z)) cRing.One |> should equal true

// ── (E) even-subalgebra embedding — the honest Clifford relation ──

[<Fact>]
let ``E: e12² = −1, so C₄ lives in Cl(3,0)'s even subalgebra`` () =
    closeMv (clRing.Mul(Cl3.e12, Cl3.e12)) (clRing.Negate clRing.One)
    |> should equal true
    closeMv (clRing.Mul(FC.toCl3Even FC.I, FC.toCl3Even FC.I)) (FC.toCl3Even FC.MinusOne)
    |> should equal true

[<Fact>]
let ``E: phase mul agrees with the geometric product on the even embedding`` () =
    for a in phases do
        for b in phases do
            closeMv (clRing.Mul(FC.toCl3Even a, FC.toCl3Even b)) (FC.toCl3Even (FC.mul a b))
            |> should equal true

// ── (D) discriminator — not Cl(p,q) ────────────────────────────────

[<Fact>]
let ``D: sending i to a Cl(3,0) vector does NOT carry C₄ (e1² = +1)`` () =
    closeMv (clRing.Mul(FC.toCl3Vector FC.I, FC.toCl3Vector FC.I)) clRing.One
    |> should equal true
    closeMv (clRing.Mul(FC.toCl3Vector FC.I, FC.toCl3Vector FC.I)) (clRing.Negate clRing.One)
    |> should equal false
    // the even embedding still does
    closeMv (clRing.Mul(FC.toCl3Even FC.I, FC.toCl3Even FC.I)) (clRing.Negate clRing.One)
    |> should equal true

[<Fact>]
let ``D: Cl(0,1) ≅ ℂ is the related Clifford algebra; Cl(3,0) ≅ M₂(ℂ) is not`` () =
    FC.cl01IsTheComplexLine |> should equal true
    FC.cl30IsMatrixTwoComplex |> should equal true
    // they are different Morita types — matching "complex ground" is not identity
    let cl01 = CliffordPeriodicity.classify 0 1
    let cl30 = CliffordPeriodicity.classify 3 0
    match cl01, cl30 with
    | Ok a, Ok b -> (a.MatrixDim = b.MatrixDim) |> should equal false
    | _ -> failwith "classify refused a non-negative signature"

// ── (T) composition — the TRACE consumes IStarRing, not a signature ─

[<Fact>]
let ``T: FourCornerTrace instantiates over Cl3.Mv weights without FourCorner being Cl(p,q)`` () =
    let isZero (m: Cl3.Mv) = Cl3.normSq m < 1e-12
    let w = Cl3.one
    let gen: FourCornerTrace.Generator<int list, Map<int, int>, int, Cl3.Mv> =
        fun interp history ->
            history
            |> List.map (fun x ->
                (match Map.tryFind x interp with
                 | Some y -> y
                 | None -> x),
                w)
    let update (interp: Map<int, int>) ((raw, label): int * int) = Map.add raw label interp
    let history = [ 0 ]
    let st0, _ = FourCornerTrace.start clRing isZero gen history Map.empty
    let st1, d = FourCornerTrace.step clRing isZero gen update history (0, 7) st0
    closeMv (snd (List.head d)) (clRing.Negate w) |> should equal true
    st1.Emitted |> List.map fst |> should equal [ 7 ]
    // ping-return on a Clifford weight is Negate, not a generator square
    closeMv (FC.pingReturn clRing w) (clRing.Negate w) |> should equal true
    closeMv (clRing.Mul(Cl3.vector 1.0 0.0 0.0, Cl3.vector 1.0 0.0 0.0)) clRing.One
    |> should equal true

// ── (A) existing IStarRing instances — TRACE vs C₄ are different asks ─
// TRACE (Negate) applies on every IStarRing already in src. C₄ `u² = −1`
// is stricter: ℂ and above + Cl(3,0) bivectors. ℝ and ℤ have unit group
// C₂, not C₄. IntervalRing / tropical / Boolean stay at ISemiring and
// cannot even take pingReturn (compile-time). Ports (TS star-ring,
// Rust f64/Complex) are the same dictionaries, not extra algebras.

let private closeQ (a: Quaternion) (b: Quaternion) =
    closeC a.Real b.Real && closeC a.Imag b.Imag

let private closeO (a: Octonion) (b: Octonion) =
    closeQ a.Real b.Real && closeQ a.Imag b.Imag

let private pingAnnihilates (ring: IStarRing<'W>) (eq: 'W -> 'W -> bool) (w: 'W) =
    eq (ring.Add(w, FC.pingReturn ring w)) ring.Zero
    && eq (FC.pingReturn ring (FC.pingReturn ring w)) w

[<Fact>]
let ``A: IntegerRing.Star is the ℤ IStarRing — TRACE applies, C₄ does not`` () =
    let r = IntegerRing.Star
    pingAnnihilates r (=) 7L |> should equal true
    r.Mul(r.One, r.One) |> should equal r.One
    r.Mul(r.Negate r.One, r.Negate r.One) |> should equal r.One
    r.Mul(r.One, r.One) = r.Negate r.One |> should equal false
    // FourCornerTrace on the named ℤ instance (no test-local re-box)
    let gen: FourCornerTrace.Generator<int list, Map<int, int>, int, int64> =
        fun interp history ->
            history
            |> List.map (fun x ->
                (match Map.tryFind x interp with
                 | Some y -> y
                 | None -> x),
                1L)
    let update (interp: Map<int, int>) ((raw, label): int * int) = Map.add raw label interp
    let st0, _ = FourCornerTrace.start r ((=) 0L) gen [ 0 ] Map.empty
    let st1, d = FourCornerTrace.step r ((=) 0L) gen update [ 0 ] (0, 7) st0
    d |> should equal [ 0, -1L; 7, 1L ]
    st1.Emitted |> should equal [ 7, 1L ]

[<Fact>]
let ``A: Real.algebra TRACE applies; unit group is C₂ not C₄`` () =
    let r = Real.algebra
    pingAnnihilates r (fun a b -> abs (a - b) < 1e-12) 2.5 |> should equal true
    r.Mul(1.0, 1.0) |> should equal 1.0
    r.Mul(-1.0, -1.0) |> should equal 1.0
    r.Mul(1.0, 1.0) = r.Negate r.One |> should equal false

[<Fact>]
let ``A: quaternion i and j each square to −1 — C₄ is a subgroup of ℍ*, not ℍ`` () =
    let r = ImaginaryStack.quaternion
    pingAnnihilates r closeQ FC.quaternionI |> should equal true
    closeQ (r.Mul(FC.quaternionI, FC.quaternionI)) (r.Negate r.One) |> should equal true
    closeQ (r.Mul(FC.quaternionJ, FC.quaternionJ)) (r.Negate r.One) |> should equal true
    // i and j anticommute — ℍ is bigger than C₄ (the identification refusal)
    closeQ (r.Mul(FC.quaternionI, FC.quaternionJ)) (r.Mul(FC.quaternionJ, FC.quaternionI))
    |> should equal false

[<Fact>]
let ``A: octonion lift of i still squares to −1 — tower TRACE + C₄ both apply`` () =
    let r = ImaginaryStack.octonion
    pingAnnihilates r closeO FC.octonionI |> should equal true
    closeO (r.Mul(FC.octonionI, FC.octonionI)) (r.Negate r.One) |> should equal true
