---
id: 081M1MFNR5V087G0R0015V1T0S
type: task
state: done
priority: P1
slug: groupcommit-segment-append-through-filesystemblockio
title: "GroupCommit segment append through FileSystemBlockIo"
created: 2026-09-03T20:34:27.131Z
completed: 2026-09-03T20:40:14.257Z
depends_on: ["081M1MECKWB087G0R00053SEA6"]
composes_with: ["081M1MECKWB087G0R00053SEA6"]
---

# GroupCommit segment append through FileSystemBlockIo

Optional `useBlockIo` on `GroupCommitDiskDeltaLog`: segment records ride
`FileSystemBlockIo` + `BlockLog.append` + dual-slot `ZGL2` superblock.
Crash/corrupt/reorder tear the LBA, not the whole file. Scan reads the
superblock logical length, then the payload.

Default stays the stream path so existing whole-file Dispose crash tests
keep their door. DoP=1. `fsDoor` bound at construction.

Native NVMe is not claimed. Recovery stays `toy`.

## Acceptance

- `useBlockIo = true` round-trip: two appends, reopen, HighWater 2.
- Crash-mid-write of the second append throws; reopen HighWater 1.
- Corrupt-last-write of the second append acks; reopen keeps seq 1.
- Reorder of the second append completes; reopen keeps seq 1.
- Superblock magic is `ZGL2`, not `ZFL2`.
