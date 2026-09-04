---
id: 081M1P9BREN087G0R000K7D38C
type: task
state: done
priority: P1
slug: reclaim-crash-mid-sweep-keeps-a-committed-freeze-readable
title: "Reclaim crash-mid-sweep keeps a committed freeze readable"
created: 2026-09-04T13:22:37.141Z
completed: 2026-09-04T13:24:44.227Z
depends_on: ["081M1P61NWD087G0R003DN5XHY"]
composes_with: []
---

# Reclaim crash-mid-sweep keeps a committed freeze readable

Reclaim `apply` already deletes then throws (`ArmCrashOnDelete`): extra
garbage, not a missing live file. This peel composes that door with a
real Journaled freeze: crash while sweeping *other* objects must leave
the committed freeze readable.

Does not promote reclaim out of `toy` (no sweep journal, no crash during
a live-object delete that was wrongly queued). Native NVMe is not claimed.

## Acceptance

- `createManualStream`, Journaled freeze, extra garbage files, crash on
  the first garbage delete: freeze `isReadable`, live object files remain.
