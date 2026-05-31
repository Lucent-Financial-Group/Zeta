namespace Zeta.Core.CSharp.ZetaId;

public enum Category : byte
{
    Observation = 0,
    Emission = 1,
    Workflow = 2,
    Heartbeat = 3,
    Bus = 4,        // cross-machine agent comms (git-native bus spec, #6219)
    Spawn = 5,      // agent-spawning (backend-portable: GH Actions / Argo / GitLab)
    WorkItem = 6,   // planning umbrella (tasks + bugs; B-xxxxx -> ZetaId migration)
}
