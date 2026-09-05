---
id: 081M1KDRJAA087G0R003S519DD
type: task
state: done
priority: P1
slug: journaled-freeze-log-through-filesystemblockio-polyfill
title: "Journaled freeze log through FileSystemBlockIo polyfill"
created: 2026-09-03T10:40:00.000Z
completed: 2026-09-03T11:02:36.470Z
depends_on: ["081M1KBMT00087G0R003P71VYB"]
composes_with: ["081M1KBMT00087G0R003P71VYB"]
---

# Journaled freeze log through FileSystemBlockIo polyfill

`FileSystemBlockIo` already maps LBAs through a host file. Freeze still
had a raw frame-stream path (`create` / `createManual`) and a
`SimulatedBlockIo` path. This slice lets journaled freeze ride the
polyfill (`createManualWithFileLog`) with the same dual-slot superblock.

`create` / `createManual` still speak a raw frame stream. Objects still
speak files. Native NVMe is not claimed. Recovery stays `toy`.

## Acceptance

- Journaled freeze through `createManualWithFileLog`, reopen on the same
  host file: `isReadable`. The freeze log path exists on `IFileSystem`.
- File-path `createManual` tests unchanged.
