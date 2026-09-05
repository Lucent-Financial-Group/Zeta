---
id: 081M1S5JW4E087G0R00373QGC6
type: bug
state: done
priority: P2
slug: freeze-result-waits-for-orphan-catalog-persistence
title: "Freeze result waits for orphan catalog persistence"
created: 2026-09-05T16:14:19.278Z
depends_on: []
composes_with: []
---

# Freeze result waits for orphan catalog persistence

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1S5JW4E087G0R00373QGC6-*.md` glob. -->

`FreezeLog.processBatch` completes each caller reply before writing
`known.pins`. A caller can therefore observe success, dispose the volume, and
remove the store while the batch is still creating the catalog. The macOS gate
witnessed this as `Directory not empty` in the durable real-directory test.

Acceptance:

- successful replies are not observable before catalog persistence finishes;
- catalog persistence failure faults unresolved replies;
- the focused durable-freeze test passes repeatedly on macOS;
- the repository gate remains green apart from declared nonblocking drift.

Completion evidence:

- catalog persistence now precedes every result completion in the batch;
- an injected `known.pins` crash faults the unresolved caller;
- the durable real-directory test passed 50 consecutive macOS repetitions;
- the focused pair of ordering and persistence-failure tests passed;
- F# style and analyzer checks passed;
- `bun run preflight` passed all 18 checks.
