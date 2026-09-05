---
id: 081M1M0AC9D087G0R003X7STF4
type: task
state: done
priority: P1
slug: create-rides-filesystemblockio
title: "create rides FileSystemBlockIo"
created: 2026-09-03T16:06:00.000Z
completed: 2026-09-03T16:30:53.789Z
depends_on: ["081M1KWPJPD087G0R001BPBZ3W"]
composes_with: ["081M1KWPJPD087G0R001BPBZ3W"]
---

# create rides FileSystemBlockIo

DST `createManual` already uses the host-file polyfill. `create` /
`createWith` (background ferry) still spoke a raw frame stream. Same
`FileSystemBlockIo` door, `manual=false`.

Objects still speak files unless a BlockStore helper is used. Native
NVMe is not claimed. Recovery stays `toy`.

## Acceptance

- Existing `create` / `createWith` tests stay green (ContentId snapshot,
  Buffered, Durable fsync, observer, sealed ASCII).
- `createManualStream` still exists for byte-stream crash/CRC tests.
