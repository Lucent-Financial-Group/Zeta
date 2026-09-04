---
id: 081M1Q0N6SP087G0R0032HSAE7
type: task
state: done
priority: P1
slug: simulatedblockio-volatileuntilflush-dst-for-nvme-flush-fua
title: "SimulatedBlockIo volatileUntilFlush DST for NVMe Flush/FUA"
created: 2026-09-04T20:09:43.990Z
completed: 2026-09-04T20:44:52.733Z
depends_on: []
composes_with: []
---

# SimulatedBlockIo volatileUntilFlush DST for NVMe Flush/FUA

PR15 item 4: Flush = NVMe Flush / FUA, not POSIX `fsync`. This peel is
the **DST**, not a native NVMe command.

Default `SimulatedBlockIo` stays write-durable immediately (POSIX-like
RAM; freeze tests do not need Flush). `volatileUntilFlush = true` makes
Write visible on this instance and **not** durable across `CloneMedia`
until `Flush` / `FlushAsync`.

Native NVMe remains unclaimed. Crash recovery stays `toy`.

## Acceptance

- Default: Write without Flush, `CloneMedia` still reads the bytes.
- Volatile: Write without Flush is visible on the same device; `CloneMedia` reads zeros.
- Volatile: Write then Flush, `CloneMedia` reads the bytes.
- `FlushAsync` calls the sync Flush (so the async door is not a no-op).
