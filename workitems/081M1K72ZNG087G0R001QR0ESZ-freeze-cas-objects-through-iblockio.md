---
id: 081M1K72ZNG087G0R001QR0ESZ
type: task
state: backlog
priority: P1
slug: freeze-cas-objects-through-iblockio
title: "Freeze CAS objects through IBlockIo"
created: 2026-09-03T00:00:00.000Z
depends_on: []
composes_with: ["081M1JCJ6K9087G0R002XVEG0Q"]
---

# Freeze CAS objects through IBlockIo

Journaled freeze still wrote CAS blobs through `IFileSystem` even when
the log used `IBlockIo`. Objects now have a second simulated disk
(`BlockCas`) so a crash arm on leaves cannot tear the log.

The index is DST instance state (same peel as freeze-log
`LogicalBytes`). A real volume needs a superblock. Native NVMe is not
claimed.

## Acceptance

- `createManualWithBlockStore` + Journaled freeze + pump + reopen on
  the same log disk and `BlockCas`: `isReadable`, and no CAS files under
  `objects/`.
- Crash-mid-write on the object disk after intent Flush: freeze does
  not ack; log trailing intent is dropped on reopen; `BlockCas.Count`
  stays 0. Extra garbage on the object disk is allowed.
- File-path freeze and log-only `createManualWithBlocks` stay as they
  are. Recovery stays `toy`.
