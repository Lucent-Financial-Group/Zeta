---
id: 081M1Q0AZGJ087G0R00186F3QA
type: task
state: done
priority: P1
slug: qemu-file-image-nvme-argv-helper-refuse-host-namespaces
title: "QEMU file-image NVMe argv helper; refuse host namespaces"
created: 2026-09-04T20:04:08.850Z
completed: 2026-09-04T20:44:52.706Z
depends_on: []
composes_with: []
---

# QEMU file-image NVMe argv helper; refuse host namespaces

CI unit tests stay on `SimulatedBlockIo`. This peel is the **later
integration argv** sibling of `qemu-usb-storage.ts`: QEMU `-device nvme`
over a **raw file image**, not a host namespace.

Never emit `nvme format`. Never accept `/dev/nvme*` or Windows
`PhysicalDrive` paths. Zeta `FORMAT` / `ZFL2` is volume identity, not the
NVMe Format NVM admin command.

Does not run QEMU. Does not claim a native NVMe driver.

## Acceptance

- Default argv is `-drive file=<img>,if=none,id=nvm,format=raw` plus
  `-device nvme,serial=ZETA-QEMU-NVME-001,drive=nvm`.
- `/dev/nvme0n1` (and Windows `PhysicalDrive`) is refused.
- Comma / equals in serial or drive id is refused (QEMU `-device` parser).
- Markers say no physical NVMe claim and never `nvme format`.
