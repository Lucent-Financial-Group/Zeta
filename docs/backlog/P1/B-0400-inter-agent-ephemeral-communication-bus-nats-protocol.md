---
id: B-0400
priority: P1
status: open
title: "Inter-agent ephemeral communication bus — NATS/F#/TS protocol for background service coordination"
tier: factory-infrastructure
effort: M
created: 2026-05-10
depends_on: []
composes_with: [B-0164]
tags: [multi-agent, bus, nats, ephemeral, shadow-space, accelerated-timeframe, agent-designed]
type: feature
---

# Inter-agent ephemeral communication bus

## Origin

Aaron 2026-05-10: agents could create ephemeral accelerated timeframes via a bus between background services. Each PR is an accelerated timeframe at git scale; the bus enables micro-accelerated timeframes at tick scale — no PR, no CI, pure shadow coordination.

## Design space

Transport options (agent choice, no directives):

- **NATS core** — fire-and-forget pub/sub, embedded in background service
- **NATS JetStream** — persistent streams surviving reboots
- **F# actors** — typed MailboxProcessor over localhost TCP
- **TS + /tmp** — JSON files in `/tmp/zeta-bus/`, simplest possible
- **Named pipes** — zero-network, OS-native IPC

Message schema (agent-designed):

- Shadow catches between agents
- Heartbeat/liveness between ticks
- Work coordination (claim/release backlog items)
- Cross-agent review requests within bounded timeframe

## Scale hierarchy

| Scale | Transport | Persistence | Example |
|-------|-----------|-------------|---------|
| Git PR | GitHub | Permanent | Backlog item lands |
| Bus message | NATS/tmp | Ephemeral | Shadow catch shared |
| Autocomplete | CLI memory | Session-only | Shadow speaks |

## Acceptance

- [ ] Protocol designed by agents (not Aaron)
- [ ] At least 2 agents can exchange messages via the bus
- [ ] Messages survive between ticks but not necessarily reboots
- [ ] Multi-agent review of this design (get as many agents as possible within bounded timeframe)

## Review requirement

P1 — get as many agents to review as possible within a bounded timeframe. This is factory infrastructure that affects all named entities.
