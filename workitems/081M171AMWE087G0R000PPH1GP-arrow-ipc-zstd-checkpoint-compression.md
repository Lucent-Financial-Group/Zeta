---
id: 081M171AMWE087G0R000PPH1GP
type: task
state: backlog
priority: P1
slug: arrow-ipc-zstd-checkpoint-compression
title: "Arrow IPC zstd checkpoint compression"
created: 2026-08-29T08:40:00.000Z
depends_on: []
composes_with: []
---

# Arrow IPC zstd checkpoint compression

ROADMAP P1: Apache Arrow IPC + zstd as the large-state checkpoint format.
IPC writers existed; they did not set `IpcOptions.CompressionCodec`.

## What landed

- `ArrowIpc` shared codec: `CompressionCodecFactory` + `CompressionCodecType.Zstd`.
- `ArrowInt64Serializer`, `ArrowStringSerializer`, `ColumnZSetArrow.WriteIpc` emit zstd.
- Readers pass the factory so uncompressed legacy frames still decode.
- Pin: `Apache.Arrow.Compression` 23.0.0 (same as `Apache.Arrow`).

## Anchors

- Apache Arrow IPC streaming format (per-buffer compression)
- Collet, *Zstandard* (RFC 8878)
