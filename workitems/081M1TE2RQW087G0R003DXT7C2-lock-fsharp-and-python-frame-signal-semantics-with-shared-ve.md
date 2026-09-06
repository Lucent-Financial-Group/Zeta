---
id: 081M1TE2RQW087G0R003DXT7C2
type: task
state: in-progress
priority: P2
slug: lock-fsharp-and-python-frame-signal-semantics-with-shared-ve
title: "Lock FSharp and Python frame signal semantics with shared vectors"
created: 2026-09-06T04:02:03.132Z
depends_on: []
composes_with: []
---

# Lock FSharp and Python frame signal semantics with shared vectors

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1TE2RQW087G0R003DXT7C2-*.md` glob. -->

## Scope

Define a small source-owned JSON treaty for rendered-frame observations and
temporal deltas, replayed independently by the F# cross-emulator reducer and
the Python ARC scene-prior implementation.

## Acceptance

- Palette identity means background plus foreground color set; it does not
  change merely because an object moves or changes shape.
- Occupancy, edge density, normalized shape, and placement remain separate
  measurable signals.
- Dominant-color ties resolve identically and deterministically in both
  languages.
- Shared vectors cover translation, direct recoloring, shape growth, multiple
  components, all-background input, and a background tie.
- Focused F# and Python tests pass, followed by the repository gate.

## Non-goals

The vectors do not establish benchmark gain or learned transfer. They lock the
meaning of deterministic inputs to later inference and evaluation.
