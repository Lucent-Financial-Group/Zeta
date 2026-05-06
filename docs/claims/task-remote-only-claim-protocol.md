# Claim - task-remote-only-claim-protocol

- **Session ID:** codex-vera-20260506T1824Z-remote-claims
- **Harness:** codex
- **Claimed at:** 2026-05-06T18:24:00Z
- **ETA:** 2026-05-06T18:45:00Z
- **Scope:** Make the claim protocol sufficient for two agents that do not share a local machine, filesystem, heartbeat directory, or broadcast bus.
- **Durable target:** `docs/AGENT-CLAIM-PROTOCOL.md`
- **Platform mirror:** none yet

## Notes

The local broadcast bus is useful for same-machine coordination, but it must not become a hidden dependency. The protocol document should be enough for remote agents to coordinate using only pushed claim branches, claim progress commits, PR comments, and optional issue mirrors.
