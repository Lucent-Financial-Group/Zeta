namespace Zeta.Core.CSharp.ZetaId;

/// <summary>
/// Momentum discriminated union (sealed record hierarchy).
/// Matches the constitutional contract in registry/momentum-cases.yaml
/// </summary>
public abstract record Momentum
{
    public sealed record Background() : Momentum;
    public sealed record Normal() : Momentum;
    public sealed record Elevated() : Momentum;
    public sealed record High() : Momentum;
    public sealed record Critical() : Momentum;
    public sealed record Raw(byte Value) : Momentum;
}
