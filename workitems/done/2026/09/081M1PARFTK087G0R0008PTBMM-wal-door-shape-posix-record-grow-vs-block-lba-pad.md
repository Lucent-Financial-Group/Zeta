---
id: 081M1PARFTK087G0R0008PTBMM
type: task
state: done
priority: P1
slug: wal-door-shape-posix-record-grow-vs-block-lba-pad
title: "WAL door shape: POSIX record grow vs block LBA pad"
created: 2026-09-04T13:47:02.867Z
completed: 2026-09-04T13:48:42.236Z
depends_on: []
composes_with: []
---

# WAL door shape: POSIX record grow vs block LBA pad

Not a throughput bench. A shape fact: POSIX append grows the host file by
the framed record; the device door keeps `LogicalBytes` at payload length
and pads the host file to LBA slots (4K RMW). Unmetered for speed /
allocation rate. Native NVMe is not claimed.

## Acceptance

- `useBlockIo = false`: one small append, host file length `< 4096` and
  `> 8`.
- Default device door: `BlockSuper.tryReadGroup` logical `< 4096` and
  `> 8`; host file length `>= BlockLog.origin + logical`.
