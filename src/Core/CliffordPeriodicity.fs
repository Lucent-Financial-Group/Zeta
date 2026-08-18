namespace Zeta.Core

/// **CliffordPeriodicity — the mod-8 clock, and the three eights it explains.**
///
/// Real Clifford algebras `Cl(p,q)` are classified by **`p − q (mod 8)`** alone, up to the
/// Morita class: the algebra type repeats with period 8 as the signature walks. This is the
/// **Atiyah–Bott–Shapiro** periodicity (Atiyah, Bott & Shapiro, *Clifford Modules*, Topology 3
/// (1964), Suppl. 1, 3–38), the real-case sibling of Bott periodicity.
///
/// ── **Why this module exists** ──
/// `AdinkraCode.fs` already stated *one consequence* of this clock — "a doubly-even self-dual
/// binary code exists ONLY at length ≡ 0 (mod 8)" — without holding the periodicity that
/// explains it. A repo that knows a corollary and not its theorem will keep rediscovering the
/// corollary. Added 2026-08-18 after the Geometric Unity ferry made the gap visible: GU builds
/// its whole spinor sector out of the `(7,7)` signature, and *why* `(7,7)` splits evenly is a
/// mod-8 fact, not a coincidence of that theory.
///
/// ── **THREE EIGHTS, ONE PERIODICITY** ──
/// These are not three sightings of the integer 8. They are one phenomenon in three categories
/// joined by known constructions, which is the difference between number theory and numerology
/// (`.claude/rules/numerology-vs-number-theory.md`):
///
///   1. `Cl(p,q)` depends only on `p − q (mod 8)`                        — Atiyah–Bott–Shapiro
///   2. doubly-even self-dual binary codes exist only at length ≡ 0 (8)  — Gleason
///   3. even unimodular lattices exist only in dimension ≡ 0 (mod 8)     — Milnor–Husemoller
///
/// Construction A (Conway–Sloane) carries (2) to (3): that is *why* the in-tree `[8,4]` extended
/// Hamming code of `AdinkraCode.fs` generates the **E8** lattice. Adinkra representation theory
/// closes at `N = 8` because of (1). The eight is the same eight throughout.
///
/// ── **WHAT THIS MODULE DOES NOT CLAIM** ──
/// It classifies algebras. It says nothing about physics, and nothing about whether any
/// particular signature is realised by anything. `toy`-vs-`metered`
/// (`.claude/rules/toy-is-free-metered-must-be-earned.md`): the classification below is
/// **metered** — every row is a theorem with a falsifier in the test suite, and the table is
/// checked against independently-known small cases (`Cl(0,1) ≅ C`, `Cl(0,2) ≅ H`,
/// `Cl(1,3) ≅ M₂(H)`, `Cl(3,1) ≅ M₄(R)`) rather than asserted. Any *use* of it to interpret a
/// decorrelation trajectory or a unification claim is a separate, unmetered question.
module CliffordPeriodicity =

    /// The division algebra a Clifford algebra's Morita class is built over.
    /// `Split` means the algebra is a direct sum of two matrix algebras rather than one.
    type Ground =
        | Real
        | Complex
        | Quaternionic

    /// The Morita type of `Cl(p,q)`: a matrix algebra over `Ground`, possibly split in two.
    /// `MatrixDim` is `n` in `M_n(K)`; `IsSplit` marks the `K ⊕ K` cases (`s = 1` and `s = 5`).
    type CliffordType =
        { Ground: Ground
          /// `n` such that the algebra is `M_n(Ground)` (or two copies of it when `IsSplit`).
          MatrixDim: int
          IsSplit: bool }

    /// Errors are values here, not exceptions — the repo's Result-over-exception convention.
    type PeriodicityError =
        | NegativeSignature of p: int * q: int

    /// `p − q (mod 8)`, normalised into `0..7`.
    ///
    /// .NET's `%` is remainder, not modulus: `(-2) % 8 = -2`. Every classification below indexes
    /// a table by this value, so an unnormalised remainder would index out of range or silently
    /// pick the wrong row for any signature with `q > p` — which is most of them in physics
    /// (Minkowski `(1,3)` gives `-2`). The `+ 8` before the second `%` is load-bearing.
    let signatureClass (p: int) (q: int) : int =
        (((p - q) % 8) + 8) % 8

    /// Classify `Cl(p,q)` up to Morita type.
    ///
    /// The table is the standard one (Lawson & Michelsohn, *Spin Geometry*, I.4): with
    /// `n = p + q` and `s = p − q (mod 8)`,
    ///
    /// ```
    ///   s = 0 → M(2^(n/2),     R)         s = 4 → M(2^((n-2)/2), H)
    ///   s = 1 → M(2^((n-1)/2), R) ⊕ same  s = 5 → M(2^((n-3)/2), H) ⊕ same
    ///   s = 2 → M(2^(n/2),     R)         s = 6 → M(2^((n-2)/2), H)
    ///   s = 3 → M(2^((n-1)/2), C)         s = 7 → M(2^((n-1)/2), C)
    /// ```
    ///
    /// Note the exponents differ per row: the quaternionic rows lose a factor of 2 (and the split
    /// quaternionic row two factors) because `H` is 4-dimensional over `R` while `C` is 2 and `R`
    /// is 1. Total real dimension is `2^n` in every row, which is what `realDimension` checks.
    let classify (p: int) (q: int) : Result<CliffordType, PeriodicityError> =
        if p < 0 || q < 0 then Error(NegativeSignature(p, q))
        else
            let n = p + q
            let s = signatureClass p q
            // Exponent of 2 in the matrix dimension, per row of the table above.
            let expo =
                match s with
                | 0 | 2 -> n / 2
                | 1 | 3 | 7 -> (n - 1) / 2
                | 4 | 6 -> (n - 2) / 2
                | _ -> (n - 3) / 2 // s = 5
            let ground =
                match s with
                | 0 | 1 | 2 -> Real
                | 3 | 7 -> Complex
                | _ -> Quaternionic
            Ok { Ground = ground
                 MatrixDim = pown 2 (max 0 expo)
                 IsSplit = (s = 1 || s = 5) }

    /// Real dimension of `Cl(p,q)`, which is `2^(p+q)` by construction (one basis element per
    /// subset of the `n` generators) and independent of the signature.
    ///
    /// This is the invariant that pins `classify`: reconstructing `dim_R` from the Morita type
    /// must return `2^(p+q)` for every signature, so the per-row exponents cannot be permuted
    /// without the check going red. A classification that cannot fail this way would be the
    /// vacuity class.
    let realDimension (p: int) (q: int) : int = pown 2 (p + q)

    /// Real dimension implied by a `CliffordType` — `n² · dim_R(K)`, doubled when split.
    let dimensionOfType (t: CliffordType) : int =
        let k =
            match t.Ground with
            | Real -> 1
            | Complex -> 2
            | Quaternionic -> 4
        let d = t.MatrixDim * t.MatrixDim * k
        if t.IsSplit then 2 * d else d

    /// Does the mod-8 clock permit a doubly-even self-dual binary code at this length?
    ///
    /// The `AdinkraCode.fs:66` condition, stated here against the clock it comes from rather
    /// than as a standalone fact. `length = 8` (the in-tree extended Hamming code) is the first
    /// positive length that passes.
    let admitsDoublyEvenSelfDualCode (length: int) : bool =
        length > 0 && length % 8 = 0

    /// Does the clock permit an even unimodular lattice in this dimension?
    ///
    /// Same residue, different category — the third of the three eights. Construction A carries
    /// a length-`n` doubly-even self-dual code to a dimension-`n` even unimodular lattice, which
    /// is why these two predicates agree on every input, and why the `[8,4]` code lands on E8.
    let admitsEvenUnimodularLattice (dimension: int) : bool =
        dimension > 0 && dimension % 8 = 0

    // ═══════════════════════════════════════════════════════════════════
    // THE TWO HALVES — and where the clock actually separates them.
    // ═══════════════════════════════════════════════════════════════════

    /// Clock position of the **even subalgebra** `Cl⁰(p,q)` — the grading-preserving half.
    ///
    /// `Cl⁰(p,q) ≅ Cl(p, q−1)`, so its class is `s + 1`: **the even half sits one tick forward
    /// on the clock.** This is the answer to "does the mod-8 clock separate the two halves?" —
    /// not at `s`, but at `s + 1`.
    ///
    /// Undefined for `q = 0` (there is no `q − 1`), which is a refusal rather than a wrap.
    let evenSubalgebraClass (p: int) (q: int) : Result<int, PeriodicityError> =
        if p < 0 || q < 1 then Error(NegativeSignature(p, q))
        else Ok(signatureClass p (q - 1))

    /// Do the two halves separate cleanly at this signature?
    ///
    /// The **odd** part swaps the halves (a supercharge `Q` carries bosons to fermions — it
    /// *acts*); the **even** part preserves them (`{Q,Q} = ∂_τ` stays inside a half — it
    /// *remains*). The even part separates into two independent pieces exactly when it lands on
    /// a **split** row, `s + 1 ∈ {1, 5}` — i.e. when `s ∈ {0, 4}`.
    ///
    /// So the clean two-half separation IS a mod-8 fact, one tick displaced. `N = 8` lands on
    /// `s = 0` and therefore separates; most signatures do not.
    ///
    /// NOTE this is a statement about the algebra's grading, NOT about the `IsSplit` field of
    /// `Cl(p,q)` itself. Those are different splits, and conflating them is the trap: `Cl(7,7)`
    /// is *not* split, yet its halves separate perfectly.
    let halvesSeparateCleanly (p: int) (q: int) : Result<bool, PeriodicityError> =
        evenSubalgebraClass p q
        |> Result.map (fun s -> s = 1 || s = 5)

    /// The signature the `N = 8` adinkra's garden algebra lives at: `Cl(0,8)`.
    ///
    /// `GR(d,N)` is generated by `L_I R_J + L_J R_I = 2δ_IJ`, a Clifford relation, so an
    /// `N`-colour adinkra sits at signature `(0,N)`. At `N = 8`: `s = 0`, so by
    /// `halvesSeparateCleanly` its halves DO separate — `Cl⁰(0,8) ≅ Cl(0,7) ≅ M₈(R) ⊕ M₈(R)`,
    /// two independent `8 × 8` blocks for the **8 bosons** and **8 fermions** of the 16-node
    /// adinkra of `AdinkraCode.fs`. The block sizes are not chosen; they fall out of the clock.
    let adinkraN8Signature = (0, 8)

    /// The signature Geometric Unity builds its spinor sector from: `(7,7)`.
    ///
    /// Recorded as a named datum because the ferry
    /// (`docs/research/ip-questionable/2026-08-18-geometric-unity-iceberg-*.md`) turns on it:
    /// `s = 0`, the split-real row, which is why the 128-dimensional real spinor module splits
    /// evenly rather than into an unbalanced pair. Naming it here does NOT endorse GU; it makes
    /// the arithmetic checkable independently of the theory that motivated looking.
    let geometricUnitySignature = (7, 7)
