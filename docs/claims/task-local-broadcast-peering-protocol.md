# Claim - task-local-broadcast-peering-protocol

- **Session ID:** codex-vera-20260506T1910Z-local-broadcast-peering
- **Harness:** codex
- **Claimed at:** 2026-05-06T19:10:00Z
- **ETA:** 2026-05-06T19:25:00Z
- **Scope:** Design first-class peering asks and receipts over the local broadcast bus while preserving remote git as the fallback; anchor Vera's background loop prompt to read those asks.
- **Durable target:** Small PR with protocol sketch and backlog row.
- **Platform mirror:** pending PR

## Notes

The maintainer asked for peering to become a first-class ask and protocol over
local broadcast for future use. Follow-up clarification: six-month automation
requires background services to converge toward foreground capability, so this
slice also anchors Vera's launchd prompt to read peering asks before taking a
toe-safe action. It does not change the authoritative git-native claim protocol.
