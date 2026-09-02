---
id: 081M1J2JYJ7087G0R000JSCD3K
type: task
state: done
priority: P1
slug: pr12-crash-mid-sweep-on-reclaim-apply-leaves-extra-garbage-n
title: "PR12: crash-mid-sweep on reclaim apply leaves extra garbage not missing live"
created: 2026-09-02T22:07:15.015Z
completed: 2026-09-02T22:09:27.050Z
depends_on: []
composes_with: ["081M1C59ZG4087G0R000VM8DZN"]
---

# PR12: crash-mid-sweep on reclaim apply

The reclaim comment said a partial tick leaves extra garbage, not a
missing live object. That was untested: `apply` deleted in a loop with
no crash door on `Delete`.

## Acceptance

- `ArmCrashOnDelete(pathContains)` is one-shot: matching `Delete` removes
  the file then throws `CrashMidSweepException`.
- Apply of [garbage1, garbage2, garbage3] armed on garbage2: garbage1 gone,
  garbage2 gone, garbage3 remains, live file remains, apply throws.
- Same arm replays.
- Native `IBlockIo` is not this slice. Recovery stays `toy` for the volume
  as a whole; this seed is the sweep invariant.
