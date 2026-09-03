---
id: 081M1MECKWB087G0R00053SEA6
type: task
state: done
priority: P1
slug: polyfill-freeze-corrupt-last-write-and-reorder-keep-the-firs
title: "Polyfill freeze corrupt-last-write and reorder keep the first freeze"
created: 2026-09-03T20:11:59.243Z
completed: 2026-09-03T20:31:35.137Z
depends_on: ["081M1M33G8C087G0R000VP1W1W"]
composes_with: ["081M1M33G8C087G0R000VP1W1W"]
---

# Polyfill freeze corrupt-last-write and reorder keep the first freeze

`createManual` rides `FileSystemBlockIo` plus `WriteAt`. Corrupt-last-write
and reorder of the second freeze must not hide the first (superblock still
names the previous generation).

A small freeze's first WriteAt is often a 4096-byte RMW whose last 8 bytes
are padding, so the corrupt test requires: second freeze **acks**, reopen
**first is readable**. It does not claim the second freeze is unreadable.

Reorder holds the next matching WriteAt; the following superblock WriteAt
publishes both. Reopen: first is readable.

Native NVMe is not claimed. Recovery stays `toy`.

## Acceptance

- First Journaled freeze, `ArmCorruptLastWrite(log/freeze, 8)`, second freeze
  acks. Reopen: first is readable.
- First Journaled freeze, `ArmReorderNextTwo(log/freeze)`, second freeze
  completes. Reopen: first is readable.
