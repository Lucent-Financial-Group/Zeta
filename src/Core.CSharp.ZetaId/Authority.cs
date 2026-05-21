namespace Zeta.Core.CSharp.ZetaId;

public abstract record Authority
{
    public sealed record HumanVerified() : Authority;
    public sealed record TrustedAgent()  : Authority;
    public sealed record Standard()      : Authority;
    public sealed record BestEffort()    : Authority;
    public sealed record Simulated()     : Authority;
    public sealed record Raw(byte Value) : Authority;

    internal static byte ToByte(Authority authority) => authority switch
    {
        Raw r           => r.Value,
        HumanVerified   => (byte)AuthorityValue.HumanVerified,
        TrustedAgent    => (byte)AuthorityValue.TrustedAgent,
        Standard        => (byte)AuthorityValue.Standard,
        BestEffort      => (byte)AuthorityValue.BestEffort,
        Simulated       => (byte)AuthorityValue.Simulated,
        _               => 0
    };

    internal static Authority FromByte(byte value)
    {
        return value switch
        {
            (byte)AuthorityValue.HumanVerified => new HumanVerified(),
            (byte)AuthorityValue.TrustedAgent  => new TrustedAgent(),
            (byte)AuthorityValue.Standard      => new Standard(),
            (byte)AuthorityValue.BestEffort    => new BestEffort(),
            (byte)AuthorityValue.Simulated     => new Simulated(),
            _                                  => new Raw(value)
        };
    }
}
