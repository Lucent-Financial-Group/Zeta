namespace Zeta.Core.CSharp.ZetaId;

public enum Category : byte
{
    Observation = 0,
    Emission = 1,
    Workflow = 2,
    Heartbeat = 3,
    // 4 proposed for Batch (B-0890 memo); 5 reserved for FrictionTelemetry (ADR 2026-05-29)
    Bus = 6,        // cross-machine agent comms (git-native bus spec, #6219)
    Spawn = 7,      // agent-spawning (backend-portable: GH Actions / Argo / GitLab)
    WorkItem = 8,   // planning umbrella (tasks + bugs; B-xxxxx -> ZetaId migration)
}
