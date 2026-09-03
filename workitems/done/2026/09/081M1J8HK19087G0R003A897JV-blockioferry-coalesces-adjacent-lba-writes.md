---
id: 081M1J8HK19087G0R003A897JV
type: task
state: done
priority: P1
slug: blockioferry-coalesces-adjacent-lba-writes
title: "BlockIoFerry coalesces adjacent LBA writes"
created: 2026-09-02T23:51:00.000Z
completed: 2026-09-03T00:15:52.935Z
depends_on: []
composes_with: ["081M1J5CE74087G0R001FE7Z8B"]
---

# BlockIoFerry coalesces adjacent LBA writes

batch/single dispatch: N whole-block writes to sequential LBAs become
one device `Write`. Generated in `processBatch` from the in-repo ferry,
not from a foreign I/O stack. Read, Flush, partial blocks, and LBA
holes break the run. Each row still receives its own `Outcome.Bytes`.

## Acceptance

- Two 4096-byte writes at LBA 0 then 1, one boat: `DeviceWrites = 1`,
  both reads round-trip.
- LBA 0 then 2 (a hole): `DeviceWrites = 2`.
- Write, Flush, write: `DeviceWrites = 2`.
- One-byte writes (not a whole block) do not coalesce.
- Native NVMe is not claimed.
