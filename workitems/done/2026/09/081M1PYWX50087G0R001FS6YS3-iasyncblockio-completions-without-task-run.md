---
id: 081M1PYWX50087G0R001FS6YS3
type: task
state: done
priority: P1
slug: iasyncblockio-completions-without-task-run
title: "IAsyncBlockIo completions without Task.Run"
created: 2026-09-04T19:38:59.104Z
completed: 2026-09-04T19:41:12.595Z
depends_on: []
composes_with: []
---

# IAsyncBlockIo completions without Task.Run

Synchronous `IBlockIo` stays the DST DoP=1 primitive. Native NVMe needs
a yielding completion door. This peel adds `IAsyncBlockIo` with
`CancellationToken`. Polyfill and `SimulatedBlockIo` complete
synchronously (`IsCompletedSuccessfully`) — that is legal. They do
**not** wrap the sync methods in `Task.Run`.

Native remains unclaimed (no io_uring / SPDK). Crash recovery stays
`toy`.

## Acceptance

- WriteAsync/ReadAsync/FlushAsync on SimulatedBlockIo and
  FileSystemBlockIo: `IsCompletedSuccessfully`, round-trip.
- Cancel before: canceled ValueTask, no write.
