---
id: 081M1Q5JCND087G0R0031BGR0M
type: task
state: backlog
priority: P1
slug: replay-freeze-log-and-cas-onto-two-filesystemblockio-devices
title: "Replay freeze log and CAS onto two FileSystemBlockIo devices"
created: 2026-09-04T21:35:34.573Z
depends_on: []
composes_with: []
---

# Replay freeze log and CAS onto two FileSystemBlockIo devices

PR15 item 5: two devices for log vs CAS. A Journaled freeze records on
two `SimulatedBlockIo`; `ReplayTo` two `FileSystemBlockIo` polyfills;
reopen reads the freeze. Native NVMe is not claimed. Crash recovery
stays `toy`.

## Acceptance

- Freeze on separate log + CAS RAM devices.
- Replay each device's issued ops onto its own host-file polyfill.
- New `BlockCas` + `createManualWithBlockStore` on those polyfills
  can read the freeze.
