---
id: 081M1JCJ6K9087G0R002XVEG0Q
type: task
state: done
priority: P1
slug: freezelog-journaled-boats-can-write-through-iblockio
title: "FreezeLog Journaled boats can write through IBlockIo"
created: 2026-09-03T01:02:00.000Z
completed: 2026-09-03T08:45:09.192Z
depends_on: []
composes_with: ["081M1JB621H087G0R002Q2XA99"]
---

# FreezeLog Journaled boats can write through IBlockIo

Journaled freeze frames can append through `IBlockIo` with tail-block
RMW. Objects still speak files. Logical length lives on the
`SimulatedBlockIo` instance (no superblock yet).

## Acceptance

- `createManualWithBlocks` + Journaled freeze + pump + reopen on the
  same device: `isReadable`.
- Crash-mid-write on the first log Write: freeze does not ack; reopen
  on the same device is not readable (torn intent dropped).
- File-path freeze tests stay on `IFileSystem`.
- Native NVMe is not claimed. Recovery stays `toy`.
