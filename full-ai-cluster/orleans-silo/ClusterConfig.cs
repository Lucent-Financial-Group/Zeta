using System.Text.Json;
using System.Text.Json.Serialization;

namespace Zeta.Orleans.Silo;

/// <summary>
/// The shape of <c>/etc/orleans/cluster.json</c>, which is mounted from the
/// <c>orleans-config</c> ConfigMap in
/// <c>full-ai-cluster/k8s/applications/orleans/configmap.yaml</c>.
///
/// THIS TYPE IS ONE HALF OF A CONTRACT and the ConfigMap is the other. They are
/// checked against each other by
/// <c>src/Core.TypeScript/cluster/orleans-silo-contract.test.ts</c> — the failure
/// this guards is not a bug in either file, it is the two of them drifting apart
/// while each stays internally consistent.
/// </summary>
public sealed record ClusterConfig
{
    [JsonPropertyName("serviceId")]
    public string ServiceId { get; init; } = "zeta";

    [JsonPropertyName("clusterId")]
    public string ClusterId { get; init; } = "zeta-prod";

    [JsonPropertyName("silo")]
    public SiloPorts Silo { get; init; } = new();

    [JsonPropertyName("clustering")]
    public ClusteringConfig Clustering { get; init; } = new();

    [JsonPropertyName("telemetry")]
    public TelemetryConfig Telemetry { get; init; } = new();

    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
    };

    /// <summary>
    /// Parse the mounted cluster config. A MISSING file is fatal and a MALFORMED
    /// file is fatal, and neither falls back to a default.
    ///
    /// The tempting alternative — "no config, use sensible defaults" — would let a
    /// silo whose ConfigMap failed to mount join the cluster under whatever
    /// clusterId the defaults name. That is worse than not starting: a silo in the
    /// wrong cluster is a silent membership split, and the pod would report Ready.
    /// </summary>
    public static ClusterConfig Load(string path)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);

        if (!File.Exists(path))
        {
            throw new FileNotFoundException(
                $"Orleans cluster config not found at '{path}'. This file is mounted from the " +
                "`orleans-config` ConfigMap; a silo MUST NOT start without it, because defaulting " +
                "the clusterId would join the wrong cluster while reporting healthy.",
                path);
        }

        var json = File.ReadAllText(path);
        var parsed = JsonSerializer.Deserialize<ClusterConfig>(json, Options)
            ?? throw new InvalidDataException($"Orleans cluster config at '{path}' parsed to null.");

        parsed.Validate(path);
        return parsed;
    }

    /// <summary>Env wins over the file, because the StatefulSet sets it per-pod.</summary>
    public ClusterConfig WithEnvironmentOverrides(IReadOnlyDictionary<string, string?> env)
    {
        ArgumentNullException.ThrowIfNull(env);
        var serviceId = env.TryGetValue("ORLEANS_SERVICE_ID", out var s) && !string.IsNullOrWhiteSpace(s) ? s : ServiceId;
        var clusterId = env.TryGetValue("ORLEANS_CLUSTER_ID", out var c) && !string.IsNullOrWhiteSpace(c) ? c : ClusterId;
        return this with { ServiceId = serviceId, ClusterId = clusterId };
    }

    private void Validate(string path)
    {
        if (string.IsNullOrWhiteSpace(ServiceId))
            throw new InvalidDataException($"{path}: serviceId is empty.");
        if (string.IsNullOrWhiteSpace(ClusterId))
            throw new InvalidDataException($"{path}: clusterId is empty.");
        if (Silo.SiloPort <= 0 || Silo.GatewayPort <= 0)
            throw new InvalidDataException($"{path}: silo.siloPort and silo.gatewayPort must both be positive.");
        if (Silo.SiloPort == Silo.GatewayPort)
            throw new InvalidDataException($"{path}: silo.siloPort and silo.gatewayPort must differ.");

        // A provider this binary does not implement must FAIL rather than fall
        // through to a default — see the Load() note. `kubernetes` is named here
        // because the ConfigMap carried it until 2026-09-01 and a stale mount
        // could still present it.
        if (!string.Equals(Clustering.Provider, "redis", StringComparison.Ordinal))
        {
            throw new InvalidDataException(
                $"{path}: clustering.provider is '{Clustering.Provider}', and this silo implements " +
                "only 'redis'. It is refused rather than defaulted: a silo that cannot form the " +
                "membership its cluster uses would otherwise start alone and report healthy.");
        }
        if (string.IsNullOrWhiteSpace(Clustering.Endpoint))
            throw new InvalidDataException($"{path}: clustering.endpoint is required for the redis provider.");
    }
}

public sealed record SiloPorts
{
    [JsonPropertyName("siloPort")]
    public int SiloPort { get; init; } = 11111;

    [JsonPropertyName("gatewayPort")]
    public int GatewayPort { get; init; } = 30000;
}

public sealed record ClusteringConfig
{
    [JsonPropertyName("provider")]
    public string Provider { get; init; } = "redis";

    [JsonPropertyName("endpoint")]
    public string Endpoint { get; init; } = "";

    [JsonPropertyName("passwordSecret")]
    public PasswordSecretRef? PasswordSecret { get; init; }
}

public sealed record PasswordSecretRef
{
    [JsonPropertyName("name")]
    public string Name { get; init; } = "";

    [JsonPropertyName("key")]
    public string Key { get; init; } = "";
}

public sealed record TelemetryConfig
{
    [JsonPropertyName("dashboard")]
    public DashboardConfig Dashboard { get; init; } = new();
}

public sealed record DashboardConfig
{
    [JsonPropertyName("enabled")]
    public bool Enabled { get; init; }

    [JsonPropertyName("port")]
    public int Port { get; init; } = 8080;
}
