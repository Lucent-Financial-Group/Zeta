---
id: 081M1SG0JFZ087G0R0002F1D0S
type: task
state: in-progress
priority: P2
slug: isimulatedfs-flush-fail-hits-the-freeze-volume-iblockio-door
title: "ISimulatedFs flush-fail hits the freeze volume IBlockIo door"
created: 2026-09-05T19:16:33.920Z
depends_on: []
composes_with: []
---

# ISimulatedFs flush-fail hits the freeze volume IBlockIo door

`ISimulatedFs` is still flush-only (Buggify 5%). Crash-mid-write stays
on `InMemoryFileSystem.ArmCrashMidWrite`. The flush hook only fired from
DiskSpine, not from the freeze volume. Freeze's IBlockIo door now calls
`SimulatedFs.Flush` before `IBlockIo.Flush`. `FileSync.fsyncFile` /
`fsyncDir` call it first too. Freeze maps that failure to
`FreezeError.Fsync` and withholds the ack.

Falsifier: freeze A; register an `ISimulatedFs` that fails Flush; freeze B
returns `Fsync`; clear the hook; A stays readable. Recovery still `toy`.
