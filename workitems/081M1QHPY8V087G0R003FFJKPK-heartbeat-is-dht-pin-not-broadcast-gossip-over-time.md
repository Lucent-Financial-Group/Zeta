---
id: 081M1QHPY8V087G0R003FFJKPK
type: task
state: backlog
priority: P1
slug: heartbeat-is-dht-pin-not-broadcast-gossip-over-time
title: "Heartbeat is DHT pin not broadcast; gossip over time"
created: 2026-09-05T01:07:46.587Z
depends_on: []
composes_with: []
---

# Heartbeat is DHT pin not broadcast; gossip over time

Google absorb (research-grade): remain spreads by DHT/gossip/Tor-like
routing over time, not a central broadcast. Heartbeat is the
keep-alive pin so rarely-accessed remain does not fade.

Promotion: heartbeat filename is a 32-hex ZetaId magnet, not a
host:port. No appointed hub. No Kademlia impl claimed.

## Acceptance

- `zetaIdToHex` is 32 hex chars with no `.` or `:`.
- Heartbeat repo path is `docs/agent-heartbeats/.../<id>.md`, not a URL.
