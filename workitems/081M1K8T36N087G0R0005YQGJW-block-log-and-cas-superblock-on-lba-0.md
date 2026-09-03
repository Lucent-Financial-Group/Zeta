---
id: 081M1K8T36N087G0R0005YQGJW
type: task
state: backlog
priority: P1
slug: block-log-and-cas-superblock-on-lba-0
title: "Block log and CAS superblock on LBA 0"
created: 2026-09-03T09:13:00.000Z
depends_on: []
composes_with: ["081M1K72ZNG087G0R001QR0ESZ"]
---

# Block log and CAS superblock on LBA 0

`LogicalBytes` and the `BlockCas` index lived only on the DST instance.
`CloneMedia` copies blocks without those fields; reopen must reload from
LBA 0. Log magic `ZFL1`, CAS magic `ZCA1`. Payload starts at LBA 1.
The CAS index must fit in one block.

## Acceptance

- Journaled freeze, `CloneMedia` of the log disk (LogicalBytes 0),
  `createManualWithBlocks`: `isReadable`.
- Journaled freeze on log+CAS, `CloneMedia` both disks, new `BlockCas`
  on the object clone: `isReadable`.
- File-path freeze unchanged. Native NVMe is not claimed. Recovery stays
  `toy`. Superblock write is not yet paired with the payload under one
  checksum.
