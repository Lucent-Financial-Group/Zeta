using System.Net;
using Orleans.Configuration;
using Zeta.Orleans.Silo;

// Zeta Orleans silo.
//
// WHY THIS EXISTS: full-ai-cluster/k8s/applications/orleans/statefulset.yaml has
// pinned ghcr.io/lucent-financial-group/zeta-orleans-silo since it was written --
// as have two manifests in the legacy tree -- and NOTHING BUILT IT
// (081M0QB1Q6Z087G0R00091JH3Q). The manifests were honest about it (`replicas: 0`,
// with a comment saying to bump it once a real image exists), so nothing was
// broken in a running cluster; what was missing was the artifact.

var configPath = Environment.GetEnvironmentVariable("ORLEANS_CONFIG_PATH") ?? "/etc/orleans/cluster.json";

// --check-config: parse the mounted ConfigMap and exit. This is what makes the
// contract testable from outside the image without standing up a cluster, and it
// is the mode k8s-orleans-silo-contract runs in CI.
var checkOnly = args.Contains("--check-config", StringComparer.Ordinal);

ClusterConfig config;
try
{
    config = ClusterConfig
        .Load(configPath)
        .WithEnvironmentOverrides(new Dictionary<string, string?>(StringComparer.Ordinal)
        {
            ["ORLEANS_SERVICE_ID"] = Environment.GetEnvironmentVariable("ORLEANS_SERVICE_ID"),
            ["ORLEANS_CLUSTER_ID"] = Environment.GetEnvironmentVariable("ORLEANS_CLUSTER_ID"),
        });
}
catch (Exception ex) when (ex is FileNotFoundException or InvalidDataException or System.Text.Json.JsonException)
{
    await Console.Error.WriteLineAsync($"orleans-silo: refusing to start -- {ex.Message}").ConfigureAwait(false);
    return 2;
}

if (checkOnly)
{
    Console.WriteLine(
        $"ok serviceId={config.ServiceId} clusterId={config.ClusterId} " +
        $"provider={config.Clustering.Provider} endpoint={config.Clustering.Endpoint} " +
        $"siloPort={config.Silo.SiloPort} gatewayPort={config.Silo.GatewayPort} " +
        $"dashboard={(config.Telemetry.Dashboard.Enabled ? config.Telemetry.Dashboard.Port : 0)}");
    return 0;
}

// The Redis credential is NOT in the ConfigMap -- the ConfigMap only NAMES the
// secret it lives in (`clustering.passwordSecret`). The StatefulSet projects that
// secret into REDIS_PASSWORD. An empty password is passed through as empty rather
// than as "no auth", so a misconfigured secret fails to connect loudly instead of
// silently connecting to an unauthenticated Redis.
var redisPassword = Environment.GetEnvironmentVariable("REDIS_PASSWORD");
var redisConnection = string.IsNullOrEmpty(redisPassword)
    ? config.Clustering.Endpoint
    : $"{config.Clustering.Endpoint},password={redisPassword}";

var builder = Host.CreateApplicationBuilder(args);

builder.UseOrleans(silo =>
{
    silo.Configure<ClusterOptions>(options =>
    {
        options.ServiceId = config.ServiceId;
        options.ClusterId = config.ClusterId;
    });

    silo.UseRedisClustering(options => options.ConfigurationOptions =
        StackExchange.Redis.ConfigurationOptions.Parse(redisConnection));

    // POD_IP is the address other silos dial. Without it Orleans picks an
    // interface heuristically, which inside a pod can select one peers cannot
    // reach -- the silo then forms a cluster of itself and reports healthy.
    var podIp = Environment.GetEnvironmentVariable("POD_IP");
    if (!string.IsNullOrWhiteSpace(podIp) && IPAddress.TryParse(podIp, out var advertised))
    {
        silo.ConfigureEndpoints(advertised, config.Silo.SiloPort, config.Silo.GatewayPort);
    }
    else
    {
        silo.ConfigureEndpoints(config.Silo.SiloPort, config.Silo.GatewayPort);
    }
});

var host = builder.Build();
await host.RunAsync().ConfigureAwait(false);
return 0;
