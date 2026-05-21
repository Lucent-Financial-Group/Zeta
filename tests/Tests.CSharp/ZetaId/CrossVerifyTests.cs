using System.Collections.ObjectModel;
using System.Globalization;
using System.IO;
using System.Text.Json;
using Xunit;
using YamlDotNet.Serialization;
using Zeta.Core.CSharp.ZetaId;

namespace Zeta.Tests.CSharp.ZetaId;

public class CrossVerifyTests
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = true };

    private static Authority ToAuthority(FlatVector v)
    {
        if (string.Equals(v.AuthorityType, "Raw", StringComparison.Ordinal))
            return new Authority.Raw((byte)v.AuthorityRaw!.Value);

        return v.AuthorityType switch
        {
            "HumanVerified" => new Authority.HumanVerified(),
            "TrustedAgent"  => new Authority.TrustedAgent(),
            "Standard"      => new Authority.Standard(),
            "BestEffort"    => new Authority.BestEffort(),
            "Simulated"     => new Authority.Simulated(),
            _ => throw new InvalidOperationException($"Unknown authority_type: {v.AuthorityType}")
        };
    }

    private static Momentum ToMomentum(FlatVector v)
    {
        if (string.Equals(v.MomentumType, "Raw", StringComparison.Ordinal))
            return new Momentum.Raw((byte)v.MomentumRaw!.Value);

        return v.MomentumType switch
        {
            "Background" => new Momentum.Background(),
            "Normal"     => new Momentum.Normal(),
            "Elevated"   => new Momentum.Elevated(),
            "High"       => new Momentum.High(),
            "Critical"   => new Momentum.Critical(),
            _ => throw new InvalidOperationException($"Unknown momentum_type: {v.MomentumType}")
        };
    }

    private static Zeta.Core.CSharp.ZetaId.ZetaObservation ToObservation(FlatVector v) =>
        new(
            Version:    (IdVersion)v.Version,
            Timestamp:  v.Timestamp,
            Chromosome: (Chromosome)v.Chromosome,
            Category:   (Category)v.Category,
            Firefly:    (Firefly)v.Firefly,
            Authority:  ToAuthority(v),
            Persona:    (Persona)v.Persona,
            Momentum:   ToMomentum(v),
            Location:   (Location)v.Location
        );

    private static string RepoRoot()
    {
        // Walk up from the test assembly looking for Zeta.sln (sentinel at repo root).
        // .git is unreliable as a marker because in a git worktree it's a file, not a directory.
        var dir = new DirectoryInfo(Path.GetDirectoryName(typeof(CrossVerifyTests).Assembly.Location)!);
        while (dir is not null && !File.Exists(Path.Join(dir.FullName, "Zeta.sln")))
            dir = dir.Parent;
        return dir?.FullName ?? throw new InvalidOperationException("Could not locate repo root (Zeta.sln) from test assembly location.");
    }

    [Fact]
    public void CrossVerifyTwelveVectorsMatchTsBootstrapHex()
    {
        var root = RepoRoot();
        // Path.Join builds the relative tail without any rooted-segment ambiguity,
        // then Path.Combine joins it to root. Avoids the multi-arg Path.Combine
        // silent-drop pattern CodeQL warns about.
        var yamlPath = Path.Combine(root, Path.Join("tests", "cross-verification", "zeta-id", "vectors.yaml"));
        var yamlText = File.ReadAllText(yamlPath);

        var deserializer = new DeserializerBuilder().Build();
        var envelope = deserializer.Deserialize<VectorEnvelope>(yamlText);

        var results = new Dictionary<string, object>(StringComparer.Ordinal);
        int hexMismatches = 0;
        int roundtripMismatches = 0;

        foreach (var v in envelope.Vectors)
        {
            var obs = ToObservation(v);
            var id = ZetaIdCodec.Pack(obs, DeterministicEnv.Instance);
            var hex = id.ToString("x32", CultureInfo.InvariantCulture);

            var unpacked = ZetaIdCodec.Unpack(id);
            var roundtripOk = unpacked == obs;
            var matchesExpected = string.Equals(hex, v.ExpectedHex, StringComparison.Ordinal);

            results[v.Id] = new { hex, roundtripOk, matchesExpected };

            if (!roundtripOk) roundtripMismatches++;
            if (!matchesExpected) hexMismatches++;
        }

        var outputPath = Path.Combine(root, Path.Join("tests", "cross-verification", "zeta-id", "cs-output.json"));
        var json = JsonSerializer.Serialize(results, JsonOptions);
        File.WriteAllText(outputPath, json);

        Assert.Equal(0, roundtripMismatches);
        Assert.Equal(0, hexMismatches);
    }
}
