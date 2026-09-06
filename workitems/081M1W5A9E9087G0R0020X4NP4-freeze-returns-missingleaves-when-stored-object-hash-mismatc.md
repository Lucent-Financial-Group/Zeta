---
id: 081M1W5A9E9087G0R0020X4NP4
type: task
state: backlog
priority: P2
slug: freeze-returns-missingleaves-when-stored-object-hash-mismatc
title: "Freeze returns MissingLeaves when stored object hash mismatches"
created: 2026-09-06T20:07:21.289Z
depends_on: []
composes_with: []
---

# Freeze returns MissingLeaves when stored object hash mismatches

`FreezeError.MissingLeaves` was unused. POSIX putLeaves skips an existing
object path, so garbage at that path could still get a freeze-commit.
Hash-verify stored bytes after put, before persist/commit. Falsifier:
plant wrong bytes at the next freeze's object path; freeze returns
MissingLeaves; prior freeze stays readable. Recovery stays `toy`.

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1W5A9E9087G0R0020X4NP4-*.md` glob. -->
