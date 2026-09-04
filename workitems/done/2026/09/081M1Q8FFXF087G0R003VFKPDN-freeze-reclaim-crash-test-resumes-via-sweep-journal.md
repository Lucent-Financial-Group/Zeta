---
id: 081M1Q8FFXF087G0R003VFKPDN
type: task
state: done
priority: P1
slug: freeze-reclaim-crash-test-resumes-via-sweep-journal
title: "Freeze reclaim crash test resumes via sweep journal"
created: 2026-09-04T22:26:25.327Z
completed: 2026-09-04T22:45:11.280Z
depends_on: []
composes_with: []
---

# Freeze reclaim crash test resumes via sweep journal

The freeze composition test still called bare `apply`. Switch it to
`applyWithJournal` and resume after `ArmCrashOnDelete`. The committed
freeze stays readable across crash and resume. Reclaim ferry is still
not production-wired. Crash recovery stays `toy`.

## Acceptance

- Crash on g1 leaves g2 and the journal; freeze objects stay.
- Resume with empty paths deletes g2, drops the journal, freeze still readable.
