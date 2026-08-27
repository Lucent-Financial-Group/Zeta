namespace Zeta.Core

open Zeta.Core.Abstractions

/// **FourCornerC4 — three embeddings of the four-corner phase, none of which
/// identifies FourCorner with Cl(p,q).**
///
/// Aaron 2026-08-26: FourCornerTrace VALUE (WSet ping-return; −1 = i² is a
/// *ring* identity) needs `IStarRing`. Clifford ±1 and the C₄ compass on
/// FourCorner are related; they are **not** "FourCorner is Cl(p,q)".
/// Matching a count of four is numerology until the invariants separate the
/// objects (`.claude/rules/numerology-vs-number-theory.md`).
///
/// Three embeddings, three jobs:
///
///   1. **Compass labeling.** FourCorner's 2×2 is *named* N S E W =
///      `{1, i, −1, −i}` = C₄ = `i`-rotation. That is a labeling of a
///      directed I/O record, not a proof that `FourCornerOwnership` is a
///      group object.
///   2. **IStarRing witness.** On ℂ, `i² = Negate(One)` (ring, exact) and
///      `e^{iπ} = Negate(One)` (Euler, analysis, same C₄ point). The TRACE
///      ping-return needs the ring identity, hence `IStarRing : IRing`.
///      Euler is why the compass *looks* like a half-turn; it is extra
///      structure (`cos`/`sin`), not what `FourCornerTrace` consumes.
///      Inverse-free corners (Boolean, tropical, EP, IntervalRing) stay at
///      `ISemiring` and refuse the trace at compile time.
///      Existing `IStarRing` dictionaries that DO apply for TRACE:
///      `IntegerRing.Star` (ℤ, Conj=id), `Real.algebra`, the Cayley–Dickson
///      tower (`ImaginaryStack.*`), `Cl3.algebra`. C₄ `u² = −1` is a
///      *stricter* ask: ℂ and above, plus Cl(3,0) bivectors — not ℝ, not ℤ.
///   3. **Clifford discriminator.** Generator squares ±1 are the
///      **signature** of Cl(p,q) (the quadratic form on the generating
///      vectors), not the compass. Cl(3,0) has `eᵢ² = +1 = One`, the
///      *opposite* of `i²`. C₄ *does* sit in Cl(3,0)'s **even
///      subalgebra** as `e₁₂² = −1`, and the Clifford algebra whose
///      generator *is* `i` is Cl(0,1) ≅ ℂ (`CliffordPeriodicity`).
///      `Cl3.algebra` is an `IStarRing`, so the TRACE can instantiate
///      over Clifford *weights* without FourCorner *being* Cl(p,q).
///
/// Anchors (Beacon): W. K. Clifford 1878; Lounesto 2001 §3 (signature vs
/// involutions); Cayley–Dickson doubling (`CayleyDickson.fs`);
/// Atiyah–Bott–Shapiro periodicity (`CliffordPeriodicity.fs`);
/// Joyal–Street–Verity 1996 (the trace that consumes Negate).
[<RequireQualifiedAccess>]
module FourCornerC4 =

    /// The cyclic group C₄ as four named phases. Order: `One → I → MinusOne → MinusI → One`.
    type Phase =
        | One
        | I
        | MinusOne
        | MinusI

    /// Compass labels for FourCorner's 2×2. Labeling, not a group action on the record.
    let north = One // TIn rest
    let east = I // TOut
    let south = MinusOne // retraction / TOutFeedback
    let west = MinusI // co-owned TInFeedback

    let rotateI =
        function
        | One -> I
        | I -> MinusOne
        | MinusOne -> MinusI
        | MinusI -> One

    let order =
        function
        | One -> 0
        | I -> 1
        | MinusOne -> 2
        | MinusI -> 3

    let ofQuarterTurns (n: int) : Phase =
        match ((n % 4) + 4) % 4 with
        | 0 -> One
        | 1 -> I
        | 2 -> MinusOne
        | _ -> MinusI

    /// C₄ multiplication: add quarter-turns. `mul I I = MinusOne`.
    let mul (a: Phase) (b: Phase) : Phase = ofQuarterTurns (order a + order b)

    /// VALUE-channel ping-return: the additive inverse. This is why
    /// `FourCornerTrace` takes `IStarRing` and not `ISemiring`.
    /// Applies on every existing `IStarRing` instance (ℤ, ℝ, ℂ, ℍ, 𝕆, 𝕊, Cl3).
    let pingReturn (ring: IStarRing<'W>) (w: 'W) : 'W = ring.Negate w

    /// Imaginary unit of ℍ — Cayley–Dickson `(i_ℂ, 0)`. Already the `i` of
    /// `CayleyWeightedSet.Tests`. `i² = −1`, so C₄ embeds as a *subgroup* of
    /// ℍ*, not as ℍ (which is not C₄).
    let quaternionI : Quaternion =
        Doubled.make (Doubled.make 0.0 1.0) (Doubled.make 0.0 0.0)

    /// The doubling unit of ℍ (`j`). Also `j² = −1`; `{1,j,−1,−j}` is another
    /// C₄ subgroup, independent of the `i` copy. Not an identification.
    let quaternionJ : Quaternion =
        Doubled.make (Doubled.make 0.0 0.0) (Doubled.make 1.0 0.0)

    /// Imaginary unit of 𝕆 lifted from ℍ's `i` (lower half). Same C₄ subgroup.
    let octonionI : Octonion =
        Doubled.make quaternionI (Doubled.make (Doubled.make 0.0 0.0) (Doubled.make 0.0 0.0))

    let toComplex =
        function
        | One -> Doubled.make 1.0 0.0
        | I -> Doubled.make 0.0 1.0
        | MinusOne -> Doubled.make -1.0 0.0
        | MinusI -> Doubled.make 0.0 -1.0

    /// Two quarter-turns of a ℂ weight: multiply by `i` twice. On ℂ this
    /// *is* `pingReturn` — the L5 identity `i² = −1`, lifted off WSet.
    let twoQuarterTurns (ring: IStarRing<Complex>) (w: Complex) : Complex =
        let i = toComplex I
        ring.Mul(ring.Mul(w, i), i)

    /// Euler's formula on ℂ: `exp(i θ) = cos θ + i sin θ`. Extra structure
    /// beyond `IStarRing` (needs ℝ-analysis / `cos`/`sin`). Not a ring identity
    /// and not "FourCorner is U(1)".
    let expI (theta: float) : Complex =
        Doubled.make (cos theta) (sin theta)

    /// `e^{i π}` — the analytic landing on `Negate(One)`. Same C₄ point as
    /// `i²`, different presentation: exponential of the Lie algebra `iℝ ⊂ ℂ`,
    /// not `Mul`. Float residual on `sin π` is expected (IEEE); the ring
    /// identity `i²` is exact. Aaron 2026-08-26: thinking `e^{iπ} = −1`
    /// instead of `i² = −1`. Book register: *You, Born at the Hinge* / `e^{iπ}`.
    let eulerPi : Complex = expI System.Math.PI

    /// Spin-½ double cover on Cl(3,0): rotor `R(θ) = cos(θ/2) − sin(θ/2)·e₁₂`.
    /// A **2π** spatial turn is `θ/2 = π` ⇒ `R = −1 = e^{iπ}`. A **4π** turn
    /// returns to `+1`. Same C₄ point as the amplitude compass, different
    /// object (SU(2) covering SO(3), not FourCorner). `Cl3.rotor` already
    /// uses the half-angle; `QubitIso.ry`/`rz` match Q#'s convention.
    let spinHalfRotor (spatialTheta: float) : Cl3.Mv =
        Cl3.rotor spatialTheta Cl3.e12

    let private e1 = Cl3.vector 1.0 0.0 0.0

    /// The *right* Clifford embedding of C₄: into the even subalgebra, generated
    /// by the bivector `e₁₂` with `e₁₂² = −1`. This is ℂ sitting inside Cl(3,0)
    /// the way it sits inside ℍ, not "FourCorner is Cl(3,0)".
    let toCl3Even =
        function
        | One -> Cl3.one
        | I -> Cl3.e12
        | MinusOne -> Cl3.algebra.Negate Cl3.one
        | MinusI -> Cl3.algebra.Negate Cl3.e12

    /// The *wrong* embedding: send the compass generator `i` to a Cl(3,0)
    /// vector. `e₁² = +1`, so this does **not** carry C₄. It is the falsifier
    /// of "the four corners are Cl(3,0)" read as an identification.
    let toCl3Vector =
        function
        | One -> Cl3.one
        | I -> e1
        | MinusOne -> Cl3.algebra.Negate Cl3.one
        | MinusI -> Cl3.algebra.Negate e1

    /// Cl(0,1) ≅ ℂ — the Clifford algebra whose single generator squares to −1.
    /// Already pinned in `CliffordPeriodicity.Tests`; restated here as the
    /// *related* object, not as FourCorner.
    let cl01IsTheComplexLine : bool =
        match CliffordPeriodicity.classify 0 1 with
        | Ok t ->
            t.Ground = CliffordPeriodicity.Complex
            && t.MatrixDim = 1
            && not t.IsSplit
        | Error _ -> false

    /// Cl(3,0) ≅ M₂(ℂ) — *not* ℂ. Four corners are not this algebra.
    let cl30IsMatrixTwoComplex : bool =
        match CliffordPeriodicity.classify 3 0 with
        | Ok t ->
            t.Ground = CliffordPeriodicity.Complex
            && t.MatrixDim = 2
            && not t.IsSplit
        | Error _ -> false
