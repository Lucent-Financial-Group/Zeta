---
id: 081M1J9YFJB087G0R002JFZAG3
type: task
state: done
priority: P1
slug: simulatedblockio-dst-door-is-lba-not-posix
title: "SimulatedBlockIo DST door is LBA not POSIX"
created: 2026-09-03T00:16:00.000Z
completed: 2026-09-03T00:37:29.802Z
depends_on: []
composes_with: ["081M1J8HK19087G0R003A897JV"]
---

# SimulatedBlockIo DST door is LBA not POSIX

`FileSystemBlockIo` still maps LBAs through a host file. DST for a
device must not go through POSIX. `SimulatedBlockIo` is a sparse
in-memory LBA map with a one-shot crash-mid-write arm. It is not NVMe.

## Acceptance

- Write then Read round-trips through `IBlockIo` with no `IFileSystem`.
- `ArmCrashMidWrite(afterBytes)` commits a prefix then throws
  `CrashMidWriteException`; a later write is whole.
- `BlockIoFerry` coalesces two adjacent whole-block writes into one
  `SimulatedBlockIo` Write.
- Freeze/CAS still speak files. Recovery stays `toy`. Native NVMe is
  not claimed.
