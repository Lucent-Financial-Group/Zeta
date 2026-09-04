---
id: 081M1Q43PND087G0R001YK5DB3
type: task
state: backlog
priority: P1
slug: replay-recorded-blockio-ops-onto-filesystemblockio-polyfill
title: "Replay recorded BlockIo ops onto FileSystemBlockIo polyfill"
created: 2026-09-04T21:10:04.717Z
depends_on: []
composes_with: []
---

# Replay recorded BlockIo ops onto FileSystemBlockIo polyfill

PR15 item 6 said replay onto any `IBlockIo`. #16603 only falsified
sim → sim. This peel replays the same issued log onto the host-file
polyfill so the log is door-shaped, not sim-shaped.

Native NVMe inject is still not claimed. Crash recovery stays `toy`.

## Acceptance

- Record Write+Flush on `SimulatedBlockIo`.
- `ReplayTo` a `FileSystemBlockIo` on `InMemoryFileSystem`.
- Read back the same bytes from the polyfill.
