---
id: 081M1PXRRYE087G0R0039VEKC0
type: task
state: done
priority: P1
slug: iblockio-lbacount-geometry-name-native-nvme-gaps
title: "IBlockIo LbaCount geometry; name native NVMe gaps"
created: 2026-09-04T19:19:15.150Z
completed: 2026-09-04T19:21:30.794Z
depends_on: []
composes_with: []
---

# IBlockIo LbaCount geometry; name native NVMe gaps

Native NVMe is first-product **PR15**, not a polyfill flag. `IBlockIo` is
the device primitive (one LBA, one call). This peel adds Identify-shaped
`LbaCount`. Native remains unclaimed.

`LbaCount = 0` means unbounded (SimulatedBlockIo sparse DST). A host-file
polyfill reports ceil(fileLength / BlockSize).

## Acceptance

- Empty `FileSystemBlockIo`: `LbaCount = 0`.
- Write LBA 2: `LbaCount = 3` (span includes the hole).
- `SimulatedBlockIo.LbaCount = 0` (unbounded).

Native NVMe is not claimed. Crash recovery stays `toy`.
