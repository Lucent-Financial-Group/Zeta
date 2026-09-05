---
id: 081M1QF2Q7H087G0R0014FXKSJ
type: task
state: backlog
priority: P1
slug: remain-vs-act-on-iblockio-clonemedia-vs-recordedops
title: "μένω remain vs act on IBlockIo CloneMedia vs RecordedOps"
created: 2026-09-05T00:21:46.865Z
depends_on: []
composes_with: []
---

# μένω remain vs act on IBlockIo CloneMedia vs RecordedOps

Google absorb (research-grade): μένω (G3306) is remain/abide, not
medical meno- and not Plato's *Meno* unless named. Event stream is
what acts; durable state is what remains.

Promotion (this peel): `RecordedOps` is what acted; `CloneMedia`
copies durable media (μένω) and does **not** copy the act log.

## Acceptance

- Write+Flush, `RecordedOps.Length > 0`.
- `CloneMedia` reads the same durable bytes.
- `CloneMedia.RecordedOps` is empty.
