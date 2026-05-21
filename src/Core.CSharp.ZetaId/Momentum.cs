namespace Zeta.Core.CSharp.ZetaId;

public abstract record Momentum
{
    public sealed record Background() : Momentum;
    public sealed record Normal()     : Momentum;
    public sealed record Elevated()   : Momentum;
    public sealed record High()       : Momentum;
    public sealed record Critical()   : Momentum;
    public sealed record Raw(byte Value) : Momentum;

    internal static byte ToByte(Momentum momentum) => momentum switch
    {
        Raw r       => r.Value,
        Background  => (byte)MomentumValue.Background,
        Normal      => (byte)MomentumValue.Normal,
        Elevated    => (byte)MomentumValue.Elevated,
        High        => (byte)MomentumValue.High,
        Critical    => (byte)MomentumValue.Critical,
        _           => throw new InvalidOperationException(
            $"Unknown Momentum subtype '{momentum.GetType().FullName}'. " +
            "External subtyping of the public abstract Momentum record is not " +
            "supported by ZetaIdCodec; use Momentum.Raw(byte) for any value " +
            "outside the named set.")
    };

    internal static Momentum FromByte(byte value)
    {
        return value switch
        {
            (byte)MomentumValue.Background => new Background(),
            (byte)MomentumValue.Normal     => new Normal(),
            (byte)MomentumValue.Elevated   => new Elevated(),
            (byte)MomentumValue.High       => new High(),
            (byte)MomentumValue.Critical   => new Critical(),
            _                              => new Raw(value)
        };
    }
}
