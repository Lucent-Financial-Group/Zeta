---
id: 081M1KAFQJ5087G0R003A6HKEY
type: task
state: backlog
priority: P1
slug: sealed-freeze-log-replay-through-iblockio
title: "Sealed freeze log replay through IBlockIo"
created: 2026-09-03T09:45:00.000Z
depends_on: ["081M1K9D4Z0087G0R0002TFA8R"]
composes_with: ["081M1K9D4Z0087G0R0002TFA8R"]
---

# Sealed freeze log replay through IBlockIo

Plain journaled frames already replay from `IBlockIo`. Sealed frames
(`[len:i32][lsn:i64][inner]`) still opened a POSIX log file. Same dual-slot
superblock; `createManualWithSealedBlocks` takes a vault session.

Wrong-key MAC on the first frame recovers nothing and does **not**
truncate (same as the file-path sealed replay).

## Acceptance

- Sealed Journaled freeze, `CloneMedia`, reopen with the same session:
  `isReadable`. Log payload does not contain `freeze-intent/1` ASCII.
- Reopen with a different vault key: not readable, `LogicalBytes` unchanged.
- File-path sealed freeze unchanged. Native NVMe is not claimed. Recovery
  stays `toy`. Default freeze path is still files.
