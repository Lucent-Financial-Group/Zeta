namespace Zeta.Core

open System.Runtime.CompilerServices

/// Semiring interface for first-class uncertainty in DBSP weights.
/// Enables ZSet<'K,'W> parameterization over integer, probabilistic,
/// Gaussian, provenance, tropical, etc. semirings.
///
/// Axioms (all implementations must satisfy):
///   (S, Add, Zero) forms a commutative monoid
///   (S, Mul, One)  forms a monoid
///   Mul distributes over Add
///   Mul _ Zero = Zero (annihilator)
///
/// Note: semirings do NOT require an additive inverse. Semirings that also
/// support negation implement IRing<'W> instead.
type ISemiring<'W> =
    abstract member Zero : 'W                   // additive identity
    abstract member One  : 'W                   // multiplicative identity
    abstract member Add  : 'W -> 'W -> 'W       // ⊕
    abstract member Mul  : 'W -> 'W -> 'W       // ⊗

/// Ring interface — extends ISemiring<'W> with an additive inverse.
/// Retraction (negative weights in DBSP) requires a ring. Pure semirings
/// (tropical, boolean, probabilistic) deliberately do not implement this.
///
/// Additional axiom: Negate a `Add` a = Zero
type IRing<'W> =
    inherit ISemiring<'W>
    abstract member Negate : 'W -> 'W             // additive inverse


// ═══════════════════════════════════════════════════════════════════
// INTEGER RING  (ℤ, +, ×)  — the default DBSP weight semiring
// ═══════════════════════════════════════════════════════════════════

/// The integer ring (ℤ, +, ×). Additive inverse exists (full ring),
/// so negative weights encode retractions — this is exactly the
/// multiplicity ring used by the current `ZSet<'K>`.
[<Sealed>]
type IntegerRing() =
    interface IRing<int64> with
        member _.Zero     = 0L
        member _.One      = 1L
        member _.Add  a b = Checked.(+) a b
        member _.Mul  a b = Checked.(*) a b
        member _.Negate a = Checked.(~-) a

[<RequireQualifiedAccess>]
module IntegerRing =
    /// Singleton instance — reuse rather than allocate.
    let Instance : IRing<int64> = IntegerRing()


// ═══════════════════════════════════════════════════════════════════
// INTERVAL WEIGHT  [lo, hi] ⊂ ℝ  — bounded-uncertainty ring
// ═══════════════════════════════════════════════════════════════════

/// Real interval weight `[Lo, Hi]` for bounded-uncertainty arithmetic.
/// Represents "the true value lies somewhere in this range."
///
/// Arithmetic follows standard interval arithmetic:
///   Add:    [a,b] + [c,d] = [a+c, b+d]
///   Mul:    [a,b] * [c,d] = hull of corner products (Kaucher)
///   Negate: -[a,b]        = [-b, -a]
///
/// Uncertainty interpretation: the width (Hi - Lo) is the epistemic
/// uncertainty. A point interval [v, v] is certain. This generalises
/// Spanner's TrueTime [earliest, latest] commit-wait interval to a
/// first-class DBSP weight — same circuit topology, different semiring.
///
/// Ring note: standard interval arithmetic has an additive inverse
/// (-[a,b] = [-b,-a]) but does NOT satisfy the ring axiom for non-point
/// proper intervals: [a,b] + (-[a,b]) = [a-b, b-a] ≠ [0,0] when a≠b.
/// This is the interval dependency problem. Point intervals [v,v] do
/// form a proper ring (isomorphic to ℝ). IntervalRing implements IRing
/// for the Negate operation while callers should be aware that the ring
/// axiom holds exactly only for point intervals.
///
/// Improper intervals (Lo > Hi) are allowed and are used in Kaucher
/// arithmetic as the formal additive inverses.
[<Struct; IsReadOnly; CustomEquality; NoComparison>]
type IntervalWeight =
    val Lo : float
    val Hi : float
    new(lo: float, hi: float) = { Lo = lo; Hi = hi }

    /// Point interval — certain value.
    static member Point(v: float) = IntervalWeight(v, v)
    /// Additive identity: [0, 0].
    static member Zero = IntervalWeight(0.0, 0.0)
    /// Multiplicative identity: [1, 1].
    static member One  = IntervalWeight(1.0, 1.0)
    /// Width = epistemic uncertainty.
    member this.Width  = this.Hi - this.Lo
    member this.IsCertain = this.Lo = this.Hi

    override this.Equals(other) =
        match other with
        | :? IntervalWeight as w -> this.Lo = w.Lo && this.Hi = w.Hi
        | _ -> false
    override this.GetHashCode() =
        let h = System.HashCode()
        h.Add this.Lo; h.Add this.Hi; h.ToHashCode()
    override this.ToString() = sprintf "[%g, %g]" this.Lo this.Hi

[<Sealed>]
type IntervalRing() =
    interface IRing<IntervalWeight> with
        member _.Zero = IntervalWeight.Zero
        member _.One  = IntervalWeight.One

        member _.Add a b =
            IntervalWeight(a.Lo + b.Lo, a.Hi + b.Hi)

        // Kaucher multiplication: take hull of all corner products.
        member _.Mul a b =
            let p1 = a.Lo * b.Lo
            let p2 = a.Lo * b.Hi
            let p3 = a.Hi * b.Lo
            let p4 = a.Hi * b.Hi
            IntervalWeight(
                min (min p1 p2) (min p3 p4),
                max (max p1 p2) (max p3 p4))

        // -[a,b] = [-b,-a]; ring axiom holds for point intervals only.
        member _.Negate a = IntervalWeight(-a.Hi, -a.Lo)

[<RequireQualifiedAccess>]
module IntervalRing =
    /// Singleton instance — reuse rather than allocate.
    let Instance : IRing<IntervalWeight> = IntervalRing()
