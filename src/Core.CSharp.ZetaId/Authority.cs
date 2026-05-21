namespace Zeta.Core.CSharp.ZetaId;

/// <summary>
/// Authority discriminated union (sealed record hierarchy).
/// Matches the constitutional contract in registry/authority-cases.yaml
/// </summary>
public abstract record Authority
{
    public sealed record HumanVerified() : Authority;
    public sealed record TrustedAgent() : Authority;
    public sealed record Standard() : Authority;
    public sealed record BestEffort() : Authority;
    public sealed record Simulated() : Authority;
    public sealed record Raw(byte Value) : Authority;
}
