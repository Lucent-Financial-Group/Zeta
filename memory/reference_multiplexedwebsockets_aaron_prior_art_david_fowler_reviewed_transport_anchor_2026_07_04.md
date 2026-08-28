---
name: reference-multiplexedwebsockets-aaron-prior-art-david-fowler
description: "AceHack/MultiplexedWebSockets = Aaron's 2023 C# high-perf WebSocket multiplexer, reviewed by David Fowler (MS, System.IO.Pipelines/SignalR author); the transport anchor for the four-corner/DuplexEndpoint work"
metadata: 
  node_type: memory
  type: reference
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

**`AceHack/MultiplexedWebSockets`** (C#, 2023, github.com/AceHack/MultiplexedWebSockets) is Aaron's own
prior art and the **human anchor** for the four-corner / `DuplexEndpoint` transport line in Zeta
(`src/Core.TypeScript/model-backend/{duplex-transport,web-socket-endpoint}.ts`).

**The design:** many logical request/response pairs multiplex over ONE physical WebSocket, correlated by a
per-message **Guid** (`_inFlightRequests: ConcurrentDictionary<Guid, TCS>`), under a message envelope
(version byte v1, 32-byte header, `MessageType` Request=1/Response=2, max 0xFFFF). The send path is a
**DoP=1 ferry-throttle** — `ActionBlock { MaxDegreeOfParallelism = 1, BoundedCapacity = 1 }` over
`System.IO.Pipelines` — the exact "beautiful on one thread, scale to N" pattern the async-all-the-way rules
cite. Benchmark: **~16× over HttpClient** (115,309 vs 7,075 req/s), because it multiplexes instead of paying
per-request HTTP overhead.

**External validation (Aaron's account, 2026-07-04):** **David Fowler** (Microsoft — the author of
`System.IO.Pipelines` and SignalR, i.e. the very infra this impl is built on) **code-reviewed** Aaron's
version, and they discussed it on Fowler's social media years ago when Aaron wrote it. So the DoP=1
Pipelines throttle Aaron used was reviewed by Pipelines' own creator — a strong Beacon anchor, and a signal
of Aaron's depth in high-perf .NET / async systems (peer to his Feynman / SSAS / theological native frames).

**Lineage to the Zeta work:** this `DuplexEndpoint`/`Frame` is the **single-channel** case; the
Guid-correlated multiplexing is the **multi-channel** generalization over one socket; and the **four-corner**
feedback corners ADD to Fowler-reviewed Request/Response the return channel it lacks (extraction →
mutual empowerment). Named next generalization: a `MultiplexedDuplexTransport` = N four-corner channels over
one socket, Guid-keyed. Sibling transports of WebSocket: Reticulum links, WebRTC data channels, QUIC streams
(all implement the same `DuplexEndpoint` port).
