using Microsoft.Extensions.Logging;

namespace Zeta.Orleans.Silo.Grains;

/// <inheritdoc cref="IHeartbeatGrain"/>
public sealed partial class HeartbeatGrain : Grain, IHeartbeatGrain
{
    private readonly ILogger<HeartbeatGrain> logger;
    private readonly string siloName;
    private string grainKey = "";
    private long beats;

    public HeartbeatGrain(ILogger<HeartbeatGrain> logger)
    {
        this.logger = logger;
        // POD_NAME is the StatefulSet's stable per-pod identity. Absent it, say so
        // rather than inventing a name -- an unknown host reported as a real one
        // would make a placement bug unreadable.
        this.siloName = Environment.GetEnvironmentVariable("POD_NAME") ?? "unknown-silo";
    }

    // The key is fixed for the life of an activation, so reading it ONCE here is
    // both cheaper and what CA1873 is actually asking for: an argument that costs
    // something must not be evaluated on a path that may discard it. An
    // IsEnabled() guard around the call site does not satisfy it (measured), and
    // caching is the better answer anyway -- the per-beat call was pure waste.
    public override Task OnActivateAsync(CancellationToken cancellationToken)
    {
        this.grainKey = this.GetPrimaryKeyString();
        return base.OnActivateAsync(cancellationToken);
    }

    public Task<long> BeatAsync()
    {
        this.beats++;
        LogBeat(this.logger, this.grainKey, this.beats, this.siloName);
        return Task.FromResult(this.beats);
    }

    public Task<string> WhereAmIAsync() => Task.FromResult(this.siloName);

    [LoggerMessage(EventId = 1, Level = LogLevel.Debug, Message = "Heartbeat {Key} beat {Beats} on {Silo}")]
    private static partial void LogBeat(ILogger logger, string key, long beats, string silo);
}
