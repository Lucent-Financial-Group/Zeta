---
id: 081M1Q2NJ4P087G0R003DWXC37
type: task
state: backlog
priority: P1
slug: simulatedblockio-dst-record-replay-of-issued-device-ops
title: "SimulatedBlockIo DST record/replay of issued device ops"
created: 2026-09-04T20:44:52.758Z
depends_on: []
composes_with: []
---

# SimulatedBlockIo DST record/replay of issued device ops

PR15 item 6: DST record/replay of every device op. `SimulatedBlockIo` is
the stand-in; a later native path injects the same events.

Record **issued** completed `Write` / `Flush` in call order. Chaos arms
(crash/corrupt/torn/reorder) stay intercepts — they are not native
commands. Crash-mid-write does not complete, so it is not recorded.
`CloneMedia` does not copy the trace.

Native NVMe is not claimed. Crash recovery stays `toy`.

## Acceptance

- Write then Flush appear in `RecordedOps` as `BlockIoOp.Write` then `BlockIoOp.Flush`.
- `BlockIoReplay.replay` onto a fresh `SimulatedBlockIo` round-trips the bytes.
- Crash-mid-write is absent from the trace.
