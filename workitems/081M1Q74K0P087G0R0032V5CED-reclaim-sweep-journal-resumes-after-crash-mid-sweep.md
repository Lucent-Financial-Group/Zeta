---
id: 081M1Q74K0P087G0R0032V5CED
type: task
state: backlog
priority: P1
slug: reclaim-sweep-journal-resumes-after-crash-mid-sweep
title: "Reclaim sweep journal resumes after crash-mid-sweep"
created: 2026-09-04T22:02:59.478Z
depends_on: []
composes_with: []
---

# Reclaim sweep journal resumes after crash-mid-sweep

Reclaim `apply` is still a bare delete loop. This peel adds
`applyWithJournal`: remaining (hex, path) lines on `IFileSystem` before
each delete. Crash-mid-sweep (`ArmCrashOnDelete`) leaves the journal;
a second call with an empty path list finishes the rest.

Plain `apply` is unchanged. Reclaim stays `toy` — this is not wired into
the freeze reclaim ferry. Crash recovery of the volume stays `toy`.

## Acceptance

- Happy path: journal is gone after a complete sweep; live files stay.
- Crash on g2: journal remains; resume deletes g3; live stays.
