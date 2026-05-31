using System.Numerics;

namespace Zeta.Core.CSharp.Observe;

/// <summary>
/// The observe event log as a <em>monoid</em>, made machine-recognized via
/// <c>System.Numerics</c> generic-math additive interfaces (B-0867.28 — the
/// interface-gate before building on top of the algebra). It wraps the
/// append-only list of <see cref="NextAction"/> events.
///
/// <para><b>Why additive-monoid (not <c>INumber&lt;T&gt;</c>)</b>: the event log is
/// the <em>free monoid</em> — identity = the empty log, operation = associative
/// append — and nothing more. It is not a field-like number (no multiplication,
/// no ordering, no negatives), so it implements only
/// <see cref="IAdditiveIdentity{TSelf, TResult}"/> +
/// <see cref="IAdditionOperators{TSelf, TOther, TResult}"/>, the exact algebraic
/// structure it has. (Decision: additive-monoidal only — operator 2026-05-31.)</para>
///
/// <para><b>The load-bearing law</b> is the homomorphism
/// <see cref="FoldOnto"/>: folding a concatenated log equals folding the second
/// onto the result of folding the first —
/// <c>(a + b).FoldOnto(w0) == b.FoldOnto(a.FoldOnto(w0))</c>. That is exactly the
/// append-only-replay-soundness / DST-replay property: re-folding a joined log
/// reproduces the same state as incremental folding. <c>Fold</c> is the monoid
/// action of (<see cref="EventLog"/>, +, empty) on <see cref="World"/>.</para>
///
/// <para>NOTE (consistent with <see cref="World"/>): the record's generated
/// equality compares <see cref="Events"/> by reference, not element-wise — value
/// comparison of two logs must compare <see cref="Events"/> with
/// <c>SequenceEqual</c>. UoM (<c>[&lt;Measure&gt;]</c>) is intentionally absent:
/// the observe <see cref="World"/> carries no measurable numeric quantity to
/// protect (only ids, flags, and a mode), so units here would be ceremony, not
/// safety; UoM lives where measurable quantities do (TriFloat values, the
/// attention/tick/dora domain).</para>
/// </summary>
/// <param name="Events">The append-only event log (MSB-of-history first).</param>
public sealed record EventLog(IReadOnlyList<NextAction> Events)
    : IAdditiveIdentity<EventLog, EventLog>,
      IAdditionOperators<EventLog, EventLog, EventLog>
{
    /// <summary>The empty log — the monoid identity. <c>empty + x == x == x + empty</c>.</summary>
    public static EventLog AdditiveIdentity { get; } = new(Array.Empty<NextAction>());

    /// <summary>Associative append — the free-monoid operation.</summary>
    public static EventLog operator +(EventLog left, EventLog right) =>
        new(left.Events.Concat(right.Events).ToList());

    /// <summary>Project this log onto an initial world: the monoid action /
    /// homomorphism to <see cref="World"/>. Equivalent to
    /// <c>Algebra.Fold(initial, Events)</c>; satisfies
    /// <c>(a + b).FoldOnto(w0) == b.FoldOnto(a.FoldOnto(w0))</c>.</summary>
    public World FoldOnto(World initial) => Algebra.Fold(initial, Events);
}
