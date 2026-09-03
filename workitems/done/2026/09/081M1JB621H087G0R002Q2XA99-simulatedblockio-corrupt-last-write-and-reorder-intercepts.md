---
id: 081M1JB621H087G0R002Q2XA99
type: task
state: done
priority: P1
slug: simulatedblockio-corrupt-last-write-and-reorder-intercepts
title: "SimulatedBlockIo corrupt-last-write and reorder intercepts"
created: 2026-09-03T00:37:00.000Z
completed: 2026-09-03T01:01:36.259Z
depends_on: []
composes_with: ["081M1J9YFJB087G0R002JFZAG3"]
---

# SimulatedBlockIo corrupt-last-write and reorder intercepts

The LBA door had crash-mid-write. The file door also has corrupt-last-write
and reorder. Same intercepts, no POSIX path.

## Acceptance

- `ArmCorruptLastWrite(n)` XORs the last n bytes with 0xA5, commits, acks.
- `ArmReorderNextTwo` holds the first Write (Read sees zeros); the second
  Write commits itself then the held write. `CommitOrder` is `[second; first]`.
- Crash-mid-write still wins if both arms match.
- Not NVMe. Freeze/CAS still speak files. Recovery stays `toy`.
