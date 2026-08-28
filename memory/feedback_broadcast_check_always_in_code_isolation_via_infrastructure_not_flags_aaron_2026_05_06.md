---
name: Broadcast check always in code, isolation via infrastructure (Docker) not flags
description: The broadcast read/write is unconditional in every agent's code path — no feature flags, no conditional disable. Agents that shouldn't have broadcast access run in Docker (no filesystem mount). The code path is always tested; the environment determines capability. DST-shaped — don't mock absence, run where the thing is actually absent.
type: feedback
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
Aaron 2026-05-06: make broadcast check durable in the code, don't conditionally turn it off for remote-only agents. Use Docker isolation instead — agents without broadcast access simply don't have the filesystem mounted. The check runs, finds nothing, continues.

**Why:** Code branching (`if broadcastEnabled`) creates an untested path. The flag-off branch rots. Infrastructure isolation (Docker without the mount) means the SAME code runs everywhere — the "no broadcast" path gets exercised naturally every tick by the isolated agents. No mocking, no flags, no conditional complexity.

**How to apply:**
- `readBroadcasts()` is unconditional in every forward tick runner — Otto, Vera, Riven, future agents
- Remote-only test agents (B-0209) run in Docker without `~/.local/share/zeta-broadcasts/` mounted
- The code gracefully handles "directory doesn't exist" (already does — `existsSync` check)
- Don't add feature flags for broadcast access. The infrastructure IS the flag.
- Same principle as DST network partitions: test in real environments where the thing is actually absent, not in mocked environments where a flag pretends it's absent.
