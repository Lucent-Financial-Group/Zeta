---
id: 081M172MZ50087G0R00184CKA3
type: task
state: backlog
priority: P1
slug: arrow-flight-in-process-doput-doget-doexchange-over-arrow-ip
title: "Arrow Flight in-process DoPut/DoGet/DoExchange over Arrow IPC"
created: 2026-08-29T15:36:42.400Z
depends_on: []
composes_with: []
---

# Arrow Flight in-process DoPut/DoGet/DoExchange over Arrow IPC

ROADMAP P1 after Arrow IPC + zstd: Flight verbs without pulling gRPC
into Core. `ArrowFlight.InProcessFlight` / `InProcessHub` over
`ISerializer` (zstd IPC frames). `DoPut` replaces, `DoGet` of a
missing path is empty, `DoExchange` is the Z-set `+` fold (CAS).
gRPC / network adapter is the remaining increment.

Beacon: Apache Arrow Flight RPC (Wester & Le Dem; Arrow format spec).
