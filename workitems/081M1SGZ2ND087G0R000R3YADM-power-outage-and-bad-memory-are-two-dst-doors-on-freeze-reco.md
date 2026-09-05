---
id: 081M1SGZ2ND087G0R000R3YADM
type: task
state: in-progress
priority: P2
slug: power-outage-and-bad-memory-are-two-dst-doors-on-freeze-reco
title: "Power outage and bad-memory are two DST doors on freeze recovery"
created: 2026-09-05T19:33:13.517Z
depends_on: []
composes_with:
  - 081M1SG0JFZ087G0R0002F1D0S
---

# Power outage and bad-memory are two DST doors on freeze recovery

A power cut is not a crash, and bad RAM is not a power cut.

- **Power outage:** `volatileUntilFlush` + `ArmPowerOutageOnFlush` /
  `CloneMedia`. Un-Flush'd cache is gone. Media holds only prior Flush.
  Throws `PowerOutageException`. No XOR garbage.
- **Bad memory:** `ArmBadMemoryOnWrite` XOR's the last byte of the RAM
  buffer, publishes that, then throws `BadMemoryException`. Media may
  contain garbage. Not a clean power cut.
- **Flush EIO** (`ISimulatedFs` / `FreezeError.Fsync`) is a third door:
  the process lived; the disk said no.

Falsifiers: freeze A; take each door on freeze B; reopen; A stays
readable. Recovery stays `toy` until the rest of the PR12 corpus is
green (`isReadable` is still existence, not a re-hash).
