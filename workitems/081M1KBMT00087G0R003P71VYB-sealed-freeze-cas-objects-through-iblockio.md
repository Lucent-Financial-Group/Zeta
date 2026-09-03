---
id: 081M1KBMT00087G0R003P71VYB
type: task
state: backlog
priority: P1
slug: sealed-freeze-cas-objects-through-iblockio
title: "Sealed freeze CAS objects through IBlockIo"
created: 2026-09-03T10:05:00.000Z
depends_on: ["081M1KAFQJ5087G0R003A6HKEY"]
composes_with: ["081M1KAFQJ5087G0R003A6HKEY"]
---

# Sealed freeze CAS objects through IBlockIo

Sealed frames can replay from the log disk. Objects still spoke files
unless the unsigned `createManualWithBlockStore` path was used. Wire the
vault session to the two-disk store.

## Acceptance

- `createManualWithSealedBlockStore`: log disk + object disk, `CloneMedia`
  both, new `BlockCas` on the object clone, same session: `isReadable`.
- No POSIX files under `objects/`. Log payload does not contain
  `freeze-intent/1` ASCII.
- File-path sealed freeze unchanged. Native NVMe is not claimed. Recovery
  stays `toy`. Default freeze path is still files.
