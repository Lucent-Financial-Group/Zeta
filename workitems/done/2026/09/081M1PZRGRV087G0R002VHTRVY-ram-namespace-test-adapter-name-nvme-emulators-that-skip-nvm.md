---
id: 081M1PZRGRV087G0R002VHTRVY
type: task
state: done
priority: P1
slug: ram-namespace-test-adapter-name-nvme-emulators-that-skip-nvm
title: "RAM namespace test adapter; name NVMe emulators that skip nvme format"
created: 2026-09-04T19:54:03.931Z
completed: 2026-09-04T19:56:47.388Z
depends_on: []
composes_with: []
---

# RAM namespace test adapter; name NVMe emulators that skip nvme format

CI never `nvme format`s a physical drive. DST uses `SimulatedBlockIo`
(RAM LBAs). Optional `lbaCount` is Identify-shaped capacity: writes past
it fail. Default 0 stays unbounded.

Integration emulators that still need no physical format: QEMU
`-device nvme` on a file image; Linux nvme-loop/nvmet over a file;
SPDK malloc bdev; NVMeVirt/FEMU RAM backends. Those are later
integration lanes, not this unit-test adapter.

Native remains unclaimed. Crash recovery stays `toy`.

## Acceptance

- `SimulatedBlockIo(4096, lbaCount = 4UL)`: `LbaCount = 4`; write LBA 3
  ok; write LBA 4 throws `IOException`.
- Default constructor still unbounded (`LbaCount = 0`).
