---
id: 081M1629MBG087G0R003G70E30
type: task
state: backlog
priority: P1
slug: frontier-per-shard-watermarks-and-session-windows
title: "Frontier per-shard watermarks and session windows"
created: 2026-08-29T06:11:16.464Z
depends_on: []
composes_with: []
---

# Frontier per-shard watermarks and session windows

ROADMAP P1 pair that was named but not a type / operator:

- `Frontier` — set of per-shard event-time watermarks (Timely antichain specialised to `int64`).
- Session windows — `IndexedZSet` + watermark + coalesce when consecutive gap > T.

## What landed

- `src/Core/Frontier.fs` — `Advance` (monotone max), `Merge` (conservative min + union), `ClosedThrough` = min of reported shards.
- Empty frontier is **Akidau** (`Int64.MinValue`, matching `Watermark.combine []`), **not** Timely's empty antichain (`+∞`). The operations discriminate; the name does not.
- `src/Core/SessionWindow.fs` — `SessionWindows.assignIndexed` + `SessionWindow` circuit operator. Integrates membership, re-coalesces, emits the labeling delta. A bridging late event retracts split labels.
- `SessionWindows.isClosed` is the watermark close predicate. Eviction of dormant sessions is **not** this slice (BalancedSpine TTL P1).

## Anchors

- Murray, McSherry, Isaacs, Isard, Barham, Abadi, *Naiad: A Timely Dataflow System* (SOSP 2013)
- Akidau et al., *The Dataflow Model* (VLDB 2015)
- Akidau, Chernyak, Lax, *Streaming Systems* (2018) ch. 4 (session gap, merge)
- Apache Flink `EventTimeSessionWindows.withGap`

## Remaining

- Watermark-driven eviction of closed sessions (compose `isClosed` with BalancedSpine TTL).
- Multi-dimensional Timely timestamps (ROADMAP P3).
