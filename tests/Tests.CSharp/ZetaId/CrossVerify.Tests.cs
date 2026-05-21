using System.Text.Json;
using YamlDotNet.Serialization;
using Zeta.Core.CSharp.ZetaId;

namespace Zeta.Core.CSharp.ZetaId.Tests;

public class FlatVector
{
    public string id { get; set; } = "";
    public int version { get; set; }
    public long timestamp { get; set; }
    public int chromosome { get; set; }
    public int category { get; set; }
    public int firefly { get; set; }
    public string authority_type { get; set; } = "";
    public int? authority_raw { get; set; }
    public int persona { get; set; }
    public string momentum_type { get; set; } = "";
    public int? momentum_raw { get; set; }
    public int location { get; set; }
    public string expected_hex { get; set; } = "";
}

public class VectorEnvelope
{
    public int version { get; set; }
    public string description { get; set; } = "";
    public List<FlatVector> vectors { get; set; } = new();
}

public class CrossVerifyTests
{
    private static Authority ToAuthority(FlatVector v) => v.authority_type switch
    {
        "Raw" => new Authority.Raw((byte)v.authority_raw!.Value),
        "HumanVerified" => new Authority.HumanVerified(),
        "TrustedAgent" => new Authority.TrustedAgent(),
        "Standard" => new Authority.Standard(),
        "BestEffort" => new Authority.BestEffort(),
        "Simulated" => new Authority.Simulated(),
        _ => throw new Exception($"Unknown authority_type: {v.authority_type}"),
    };

    private static Momentum ToMomentum(FlatVector v) => v.momentum_type switch
    {
        "Raw" => new Momentum.Raw((byte)v.momentum_raw!.Value),
        "Background" => new Momentum.Background(),
        "Normal" => new Momentum.Normal(),
        "Elevated" => new Momentum.Elevated(),
        "High" => new Momentum.High(),
        "Critical" => new Momentum.Critical(),
        _ => throw new Exception($"Unknown momentum_type: {v.momentum_type}"),
    };

    private static ZetaObservation ToObservation(FlatVector v) => new(
        Version: (IdVersion)v.version,
        Timestamp: new Milliseconds(v.timestamp),
        Chromosome: (Chromosome)v.chromosome,
        Category: (Category)v.category,
        Firefly: (Firefly)v.firefly,
        Authority: ToAuthority(v),
        Persona: (Persona)v.persona,
        Momentum: ToMomentum(v),
        Location: (Location)v.location);

    [Fact]
    public void Cross_verify_12_vectors_match_canonical_hex()
    {
        var yamlPath = Path.Combine("..", "..", "..", "..", "..", "tests", "cross-verification", "zeta-id", "vectors.yaml");
        var yamlText = File.ReadAllText(yamlPath);
        var deserializer = new DeserializerBuilder().Build();
        var envelope = deserializer.Deserialize<VectorEnvelope>(yamlText);

        var results = new Dictionary<string, (string hex, bool roundtripOk, bool matchesExpected)>();
        int hexMismatches = 0, roundtripMismatches = 0;

        foreach (var v in envelope.vectors)
        {
            var obs = ToObservation(v);
            var id = ZetaId.Pack(obs);
            var hex = id.ToString("x32");
            var unpacked = ZetaId.Unpack(id);
            var roundtripOk = unpacked == obs;
            var matchesExpected = hex == v.expected_hex;
            results[v.id] = (hex, roundtripOk, matchesExpected);
            if (!roundtripOk) roundtripMismatches++;
            if (!matchesExpected) hexMismatches++;
        }

        var outputPath = Path.Combine("..", "..", "..", "..", "..", "tests", "cross-verification", "zeta-id", "cs-output.json");
        File.WriteAllText(outputPath, JsonSerializer.Serialize(results, new JsonSerializerOptions { WriteIndented = true }));

        Assert.Equal(0, roundtripMismatches);
        Assert.Equal(0, hexMismatches);
    }
}
