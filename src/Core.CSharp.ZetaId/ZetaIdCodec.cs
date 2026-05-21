namespace Zeta.Core.CSharp.ZetaId;

public static class ZetaIdCodec
{
    private static BitLayout Layout => BitLayout.Default;

    // Timestamp is packed into a 48-bit field; valid range [0, 2^48 - 1].
    private const long MaxTimestamp = (1L << 48) - 1;

    public static UInt128 Pack(ZetaObservation obs, ISimulationEnvironment env)
    {
        if (obs.Timestamp < 0 || obs.Timestamp > MaxTimestamp)
            throw new ArgumentOutOfRangeException(
                nameof(obs), obs.Timestamp,
                $"ZetaObservation.Timestamp must be 0..{MaxTimestamp} (48-bit field). Values outside this range would silently truncate and collide.");

        UInt128 id = 0;

        id = SetBits(id, Layout.Version,    (ulong)(byte)obs.Version);
        id = SetBits(id, Layout.Timestamp,  (ulong)obs.Timestamp);
        id = SetBits(id, Layout.Chromosome, (ulong)(byte)obs.Chromosome);
        id = SetBits(id, Layout.Category,   (ulong)(byte)obs.Category);
        id = SetBits(id, Layout.Firefly,    (ulong)(byte)obs.Firefly);
        id = SetBits(id, Layout.Authority,  Authority.ToByte(obs.Authority));
        id = SetBits(id, Layout.Persona,    (ulong)(byte)obs.Persona);
        id = SetBits(id, Layout.Momentum,   Momentum.ToByte(obs.Momentum));
        id = SetBits(id, Layout.Location,   (ulong)(byte)obs.Location);

        ulong rand32 = (ulong)env.NextInt64() & 0xFFFFFFFFUL;
        id = SetBits(id, Layout.Randomness, rand32);

        return id;
    }

    public static ZetaObservation Unpack(UInt128 id)
    {
        return new ZetaObservation(
            Version:    (IdVersion)GetBits(id, Layout.Version),
            Timestamp:  (long)GetBits(id, Layout.Timestamp),
            Chromosome: (Chromosome)GetBits(id, Layout.Chromosome),
            Category:   (Category)GetBits(id, Layout.Category),
            Firefly:    (Firefly)GetBits(id, Layout.Firefly),
            Authority:  Authority.FromByte((byte)GetBits(id, Layout.Authority)),
            Persona:    (Persona)GetBits(id, Layout.Persona),
            Momentum:   Momentum.FromByte((byte)GetBits(id, Layout.Momentum)),
            Location:   (Location)GetBits(id, Layout.Location)
        );
    }

    private static UInt128 SetBits(UInt128 value, (int Offset, int Width) field, ulong fieldValue)
    {
        int offset = field.Offset;
        int width = field.Width;

        UInt128 mask = (UInt128.One << width) - UInt128.One;
        return value | (((UInt128)fieldValue & mask) << offset);
    }

    private static ulong GetBits(UInt128 value, (int Offset, int Width) field)
    {
        int offset = field.Offset;
        int width = field.Width;

        UInt128 mask = (UInt128.One << width) - UInt128.One;
        return (ulong)((value >> offset) & mask);
    }
}
