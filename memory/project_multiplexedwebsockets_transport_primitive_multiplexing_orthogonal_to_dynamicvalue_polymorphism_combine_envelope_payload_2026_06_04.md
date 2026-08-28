---
name: multiplexedwebsockets-transport-primitive-multiplexing-orthogonal-to-dynamicvalue-2026-06-04
description: "Aaron's MultiplexedWebSockets = binary transport/envelope giving MULTIPLEXING (correlation-Guid demux), orthogonal to DynamicValue's POLYMORPHISM; combine as envelope⊥payload (the traveler-bus transport carrying DynamicValue); concept needing 4-lang+math+4-wire-test rigor"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron: "look at MultiplexedWebSockets — my version of a binary
DynamicValue that's not as expressive; mine supports multiplexing but not
necessarily polymorphism. You can do one or the other or both." + "mine might have
bugs, not fully tested by math, just the idea/concept — 4 lang + math + 4 wire
tests will tell if multiplexing holds." (github.com/AceHack/MultiplexedWebSockets)

**What it is (read 2026-06-04):** a binary transport/framing + multiplexing
protocol.
- **Wire frame:** 32-byte header `[version:1 | correlation-Guid:16 |
  length:int16:2 | MessageType:1 (None/Request/Response)]` + opaque payload.
- **Multiplexing mechanism:** the correlation **Guid** + a
  `ConcurrentDictionary<Guid, TaskCompletionSource>` of in-flight requests →
  many request/response pairs demuxed over ONE socket, correlated by id.
- Zero-copy: Pipes + `ReadOnlySequence` + `LinkedSegment` + `MemoryPool`;
  ActionBlock send / Pipe receive loop. ~16× throughput vs HttpClient (115k vs 7k/s).
- It provides **MULTIPLEXING / routing** (correlation-id demux), NOT polymorphism
  (payload is opaque bytes).

**The combination (orthogonal axes):**
- **MultiplexedWebSockets = the ENVELOPE/transport** (multiplexing) — and the
  correlation-Guid IS a routing/address facet = literally the **traveler-bus
  transport** ([[project_clock_is_injectable_family...]] bus / Reticulum routing).
- **DynamicValue = the PAYLOAD** (polymorphism / self-describing value tree).
- Combine as **envelope ⊥ payload**: the MWS header wraps a DynamicValue payload.
  Three modes: opaque-bytes-multiplexed (MWS only) · DynamicValue-unmultiplexed
  (value only) · **multiplexed DynamicValue (both)**. Same separation as
  bus-address ≠ identity / routing ≠ value: multiplexing = bus axis, polymorphism
  = value axis. (μF/DynamicValue is the payload; MWS is the carrier.)

**To become a proven primitive (the MULTIPLEXING / TRANSPORT primitive):** same
rigor as the serializers — **4-lang + math + 4 wire tests**. Wire-test targets
("will tell if multiplexing holds"): frame header round-trips byte-exact;
correlation demux is a BIJECTION (req↔resp never crosses); interleaving/ordering
under concurrency; length-prefix framing handles partial reads/backpressure. It's
a CONCEPT today (Aaron's prototype, may have bugs) — clean-room re-derive to the
proven bar.

Prior-art (concept-not-code): AceHack/Bond fork (Microsoft Bond — schematized
cross-lang de/ser). Composes the serializer doctrine (transport sibling to value)
+ traveler-bus/Reticulum + envelope-vs-payload. Sits BELOW the value layer as the
carrier. Not built here yet — analysis + combination captured per Aaron's "look at it."
