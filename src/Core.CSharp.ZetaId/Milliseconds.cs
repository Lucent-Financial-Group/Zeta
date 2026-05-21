using System;

namespace Zeta.Core.CSharp.ZetaId;

/// <summary>
/// Phantom type for milliseconds since Unix epoch (compile-time unit safety).
/// </summary>
public readonly record struct Milliseconds(long Value)
{
    public static implicit operator long(Milliseconds ms) => ms.Value;
    public static explicit operator Milliseconds(long value) => new(value);

    public static readonly Milliseconds Zero = new(0);
}
