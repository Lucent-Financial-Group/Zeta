---
id: 081M1KWPJPD087G0R001BPBZ3W
type: task
state: done
priority: P1
slug: dst-createmanual-rides-filesystemblockio
title: "DST createManual rides FileSystemBlockIo"
created: 2026-09-03T13:24:00.000Z
completed: 2026-09-03T16:06:05.849Z
depends_on: ["081M1KNWK2M087G0R003QAWKCX"]
composes_with: ["081M1KNWK2M087G0R003QAWKCX"]
---

# DST createManual rides FileSystemBlockIo

`WriteAt` crash-arms the LBA span. DST `createManual` / `createManualWith`
now use the host-file polyfill. Tests that poke log bytes or arm
whole-file Dispose use `createManualStream` / `createManualWithStream`.

`create` (background ferry) still speaks a raw frame stream. Objects
still speak files unless a BlockStore helper is used. Native NVMe is
not claimed. Recovery stays `toy`.

## Acceptance

- `createManual` reopen is readable (same door as `createManualWithFileLog`).
- Stream crash/CRC tests still pass via `createManualStream`.
- `create` unchanged.
