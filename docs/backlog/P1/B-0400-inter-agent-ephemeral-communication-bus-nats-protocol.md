---
id: B-0400
priority: P1
status: open
title: "Inter-agent ephemeral communication bus — NATS/F#/TS protocol for background service coordination"
tier: factory-infrastructure
effort: M
created: 2026-05-10
last_updated: 2026-05-13
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

- [x] Protocol designed by agents (not Aaron) — Otto designed schema in PR #2886
- [x] At least 2 agents can exchange messages via the bus — PR #2886 (types + bus CLI)
- [x] Messages survive between ticks but not necessarily reboots — /tmp JSON, TTL-gated
- [x] Subscription watch mode — `bun tools/bus/bus.ts watch --to otto` (slice 2, this PR)
- [ ] Multi-agent review of this design (get as many agents as possible within bounded timeframe)

## Review requirement

P1 — get as many agents to review as possible within a bounded timeframe. This is factory infrastructure that affects all named entities.

## Pre-start checklist (backlog-item start gate — 2026-05-13)

**Prior-art search:**

- `tools/shadow-outlet/outlet.ts` — unstructured scratch outlet; pattern reused for this typed bus (same `/tmp`+JSON approach, adds topic routing + TTL)
- `tools/shadow-outlet/ephemeral.ts` — ephemeral lifecycle utilities; TTL-expiry pattern (bus reimplements inline, no import)
- `tools/peer-call/` — existing cross-agent calling; bus complements, does not replace
- B-0164 (`composes_with`) — dual-loop substrate; bus enables loop-to-loop coordination without Git commits
- B-0212 (shadow-outlet origin) — predecessor ephemeral pattern; bus is typed evolution
- Grep for "NATS" in repo: no existing NATS dependency found; `/tmp`+JSON chosen for slice 1 (no new runtime dep)
- Grep for "zeta-bus": no existing bus directory; safe to create `tools/bus/`

**Dependency check:**

- `depends_on: []` — no blockers
- `composes_with: [B-0164]` — B-0164 is open; bus is additive, does not block or require B-0164 completion

**Slice 1 scope (this PR):**

- Protocol types (`tools/bus/types.ts`)
- `/tmp/zeta-bus/` CLI transport (`tools/bus/bus.ts`)
- Unit tests (`tools/bus/bus.test.ts`)
- Topics: `heartbeat`, `claim`, `shadow-catch`, `review-request`
- Routing: point-to-point (`to: agentId`) + broadcast (`to: "*"`)
- TTL: messages carry `expiresAt`; clean command prunes expired
- Agent design: Otto (Claude) designed the protocol; multi-agent review via PR

**Slice 2 (feat/b-0400-slice2-watch):**

- Subscription watch mode (`bun tools/bus/bus.ts watch --to otto --timeout <sec>`) — polling inbox monitor

**Slice 4 scope (feat/b-0400-slice4-status):**

- `status` subcommand (`bun tools/bus/bus.ts status [--json]`) — dashboard of live heartbeats (latest per agent), raw claim messages, pending review requests, shadow-catch count
- 9 new tests (60 total across bus.test.ts + claim.test.ts)

**Deferred to slice 5+:**

- NATS JetStream transport swap
- Named-pipe transport option
- Integration with `poll-pr-gate-batch.ts` for coordinated claims
