---
id: 081M17100DC087G0R003D07BJQ
type: task
state: backlog
priority: P1
slug: balancedspine-state-ttl-retract-on-expiry
title: "BalancedSpine state TTL retract-on-expiry"
created: 2026-08-29T08:15:00.000Z
depends_on: []
composes_with: ["081M1629MBG087G0R003G70E30"]
---

# BalancedSpine state TTL retract-on-expiry

ROADMAP P1: retract-on-expiry via `-Δ`. Session-window membership is unbounded
until the spine can evict closed sessions.

## What landed

- `BalancedSpine.Expire(now, ttl, timeOf)` — injected `now` (watermark
  `ClosedThrough` or phase tick, never wall-clock). Expired iff
  `timeOf(k) + ttl <= now`. Returns `-Δ`; spine keeps live keys.
- Session-window eviction composition: `Expire(frontier.ClosedThrough, gap, timeOf)`.

## Anchors

- Flink state TTL (event-time + interval → retract)
- Akidau et al., *The Dataflow Model* (VLDB 2015) — watermarks close windows
- TtlCache (`now` injected, manifesto §13)
