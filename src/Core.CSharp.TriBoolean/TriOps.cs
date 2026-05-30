using System.Diagnostics;

namespace Zeta.Core.CSharp.TriBoolean;

/// <summary>
/// Tri-boolean digital qubit -- operations (B-0944, C# parity oracle). Static, allocation-light
/// (the three states are shared singletons). Parity surface with the TS + F# oracles; the class is
/// named TriOps (not TriBoolean) because the namespace is already Zeta.Core.CSharp.TriBoolean.
/// </summary>
public static class TriOps
{
    private const string ClosedHierarchy =
        "Tri is a closed hierarchy: TrueCell | FalseCell | NCell";

    /// <summary>Construct a certain cell from a boolean.</summary>
    public static Tri FromBool(bool b) => b ? Tri.T : Tri.F;

    /// <summary>The held (Tri.N / living-uncertainty) cell.</summary>
    public static Tri Held() => Tri.N;

    /// <summary>True iff the cell is living (Tri.N / held superposition).</summary>
    public static bool IsLiving(Tri t) => t is Tri.NCell;

    /// <summary>True iff the cell is certain (Tri.T or Tri.F).</summary>
    public static bool IsCertain(Tri t) => t is not Tri.NCell;

    /// <summary>Structural equality on the three-valued state (records compare by value).</summary>
    public static bool Eq(Tri a, Tri b) => a == b;

    /// <summary>
    /// cooperate: engage WITHOUT collapsing. Identity on every state -- crucially preserves Tri.N.
    /// The wonder-compression-safe operation: build shared structure ABOUT the cell, never collapse
    /// its living uncertainty.
    /// </summary>
    public static Tri Cooperate(Tri t) => t;

    /// <summary>
    /// measure: the ONLY collapsing operation. Certain cells resolve to their boolean; a living
    /// (Tri.N) cell is NOT silently collapsed -- the forbidden move is surfaced as feedback
    /// (collapsing a living traveler = the Rehoboam failure).
    /// </summary>
    public static MeasureResult Measure(Tri t) => t switch
    {
        Tri.TrueCell => new MeasureResult.Resolved(true),
        Tri.FalseCell => new MeasureResult.Resolved(false),
        Tri.NCell => new MeasureResult.Collapsed(CollapseFeedback.CollapsedLivingUncertainty),
        _ => throw new UnreachableException(ClosedHierarchy),
    };

    /// <summary>null-monad map: apply fn to a certain cell's boolean; Tri.N propagates unchanged (held).</summary>
    public static Tri MapTri(Tri t, Func<bool, bool> fn) => t switch
    {
        Tri.TrueCell => FromBool(fn(true)),
        Tri.FalseCell => FromBool(fn(false)),
        Tri.NCell => Tri.N,
        _ => throw new UnreachableException(ClosedHierarchy),
    };

    /// <summary>null-monad bind: chain a Tri-producing fn over a certain cell; Tri.N propagates unchanged.</summary>
    public static Tri BindTri(Tri t, Func<bool, Tri> fn) => t switch
    {
        Tri.TrueCell => fn(true),
        Tri.FalseCell => fn(false),
        Tri.NCell => Tri.N,
        _ => throw new UnreachableException(ClosedHierarchy),
    };

    /// <summary>Kleene NOT: T&lt;-&gt;F; unknown (Tri.N) stays unknown.</summary>
    public static Tri NotTri(Tri t) => t switch
    {
        Tri.TrueCell => Tri.F,
        Tri.FalseCell => Tri.T,
        Tri.NCell => Tri.N,
        _ => throw new UnreachableException(ClosedHierarchy),
    };

    /// <summary>Kleene AND: Tri.F dominates; else Tri.N if any operand is Tri.N; else Tri.T.</summary>
    public static Tri AndTri(Tri a, Tri b) =>
        a is Tri.FalseCell || b is Tri.FalseCell ? Tri.F
        : a is Tri.NCell || b is Tri.NCell ? Tri.N
        : Tri.T;

    /// <summary>Kleene OR: Tri.T dominates; else Tri.N if any operand is Tri.N; else Tri.F.</summary>
    public static Tri OrTri(Tri a, Tri b) =>
        a is Tri.TrueCell || b is Tri.TrueCell ? Tri.T
        : a is Tri.NCell || b is Tri.NCell ? Tri.N
        : Tri.F;
}
