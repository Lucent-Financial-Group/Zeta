---
id: 081M175WGC8087G0R001SVTDK8
type: task
state: backlog
priority: P1
slug: arrow-flight-stream-duplex-over-iarrowflight-without-grpc
title: "Arrow Flight Stream duplex over IArrowFlight without gRPC"
created: 2026-08-29T16:33:15.144Z
depends_on: []
composes_with: []
---

# Arrow Flight Stream duplex over IArrowFlight without gRPC

`StreamClient` / `StreamServer` run the Flight verbs over a
request/response pair of `Stream`s. gRPC stays out of Core.
`NetworkStream` and pipe streams are the intended adapters.

Beacon: Apache Arrow Flight RPC (Wester & Le Dem); transport is
hexagonal.
