namespace Zeta.Orleans.Silo.Grains;

/// <summary>
/// The smallest grain that makes this a REAL silo rather than a process that
/// starts Orleans and hosts nothing.
///
/// It exists so the silo can be proven to do the one thing a silo is for:
/// activate a grain, keep its state across calls, and place it somewhere in the
/// cluster. A silo with no grain type registered starts, reports healthy, and
/// cannot demonstrate any of that — which is the vacuity class wearing a
/// StatefulSet.
/// </summary>
public interface IHeartbeatGrain : IGrainWithStringKey
{
    /// <summary>Record a beat and return how many this activation has seen.</summary>
    public Task<long> BeatAsync();

    /// <summary>Which silo is hosting this activation. Placement, made observable.</summary>
    public Task<string> WhereAmIAsync();
}
