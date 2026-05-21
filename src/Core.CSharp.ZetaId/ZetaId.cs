using System;
using System.Collections.Generic;

namespace Zeta.Core.CSharp.ZetaId;

/// <summary>
/// ZetaId v1 — 128-bit canonical observation identifier.
/// Pure functions. Execution-model neutral.
/// Empirically verified to produce identical hex to the TypeScript implementation
/// across all 12 canonical vectors in tests/cross-verification/zeta-id/vectors.yaml.
/// </summary>
public static class ZetaId
{
    private static UInt128 SetBits(UInt128 value, int offset, int width, ulong fieldValue)
    {
        UInt128 mask = ((UInt128)1 << width) - 1;
        return value | (((UInt128)fieldValue & mask) << offset);
    }

    private static ulong GetBits(UInt128 value, int offset, int width)
    {
        UInt128 mask = ((UInt128)1 << width) - 1;
        return (ulong)((value >> offset) & mask);
    }

    private static byte AuthorityToByte(Authority a) => a switch
    {
        Authority.Raw r => r.Value,
        Authority.HumanVerified => 31,
        Authority.TrustedAgent => 20,
        Authority.Standard => 15,
        Authority.BestEffort => 8,
        Authority.Simulated => 3,
        _ => 0,
    };

    private static byte MomentumToByte(Momentum m) => m switch
    {
        Momentum.Raw r => r.Value,
        Momentum.Background => 32,
        Momentum.Normal => 96,
        Momentum.Elevated => 160,
        Momentum.High => 224,
        Momentum.Critical => 248,
        _ => 0,
    };

    private static Authority AuthorityFromByte(byte b) => b switch
    {
        31 => new Authority.HumanVerified(),
        20 => new Authority.TrustedAgent(),
        15 => new Authority.Standard(),
        8 => new Authority.BestEffort(),
        3 => new Authority.Simulated(),
        _ => new Authority.Raw(b),
    };

    private static Momentum MomentumFromByte(byte b) => b switch
    {
        32 => new Momentum.Background(),
        96 => new Momentum.Normal(),
        160 => new Momentum.Elevated(),
        224 => new Momentum.High(),
        248 => new Momentum.Critical(),
        _ => new Momentum.Raw(b),
    };

    /// <summary>
    /// Pack a ZetaObservation into a 128-bit canonical identifier.
    /// Randomness is forced to 0 for cross-verification bootstrap (matches TS default when no env passed).
    /// </summary>
    public static UInt128 Pack(ZetaObservation obs)
    {
        UInt128 id = 0;
        id = SetBits(id, 123, 5, (ulong)obs.Version);
        id = SetBits(id, 75, 48, (ulong)obs.Timestamp.Value);
        id = SetBits(id, 70, 5, (ulong)(int)obs.Chromosome);
        id = SetBits(id, 65, 4, (ulong)(int)obs.Category);
        id = SetBits(id, 64, 1, (ulong)(int)obs.Firefly);
        id = SetBits(id, 59, 5, AuthorityToByte(obs.Authority));
        id = SetBits(id, 51, 8, (ulong)(int)obs.Persona);
        id = SetBits(id, 43, 8, MomentumToByte(obs.Momentum));
        id = SetBits(id, 35, 8, (ulong)(int)obs.Location);
        return id;
    }

    /// <summary>
    /// Unpack a 128-bit ZetaId back into a ZetaObservation. Inverse of Pack.
    /// </summary>
    public static ZetaObservation Unpack(UInt128 id) => new(
        Version: (IdVersion)GetBits(id, 123, 5),
        Timestamp: new Milliseconds((long)GetBits(id, 75, 48)),
        Chromosome: (Chromosome)(int)GetBits(id, 70, 5),
        Category: (Category)(int)GetBits(id, 65, 4),
        Firefly: (Firefly)(int)GetBits(id, 64, 1),
        Authority: AuthorityFromByte((byte)GetBits(id, 59, 5)),
        Persona: (Persona)(int)GetBits(id, 51, 8),
        Momentum: MomentumFromByte((byte)GetBits(id, 43, 8)),
        Location: (Location)(int)GetBits(id, 35, 8));
}
