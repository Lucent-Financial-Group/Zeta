---
id: 081M1THBWTW087G0R002VNCXBX
type: task
state: backlog
priority: P2
slug: isimulatedfs-write-fail-on-object-put-keeps-the-prior-freeze
title: "ISimulatedFs write-fail on object put keeps the prior freeze"
created: 2026-09-06T04:59:27.964Z
depends_on: []
composes_with: []
---

# ISimulatedFs write-fail on object put keeps the prior freeze

`ISimulatedFs` was flush-only. Write-fail (Buggify / test stub) on a POSIX
object put maps to `FreezeError.Fsync`. Prior freeze stays readable.
Crash-mid-write remains `InMemoryFileSystem.ArmCrashMidWrite`. Recovery stays
`toy`.

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1THBWTW087G0R002VNCXBX-*.md` glob. -->
