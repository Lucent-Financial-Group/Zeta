---
id: 081M1M33G8C087G0R000VP1W1W
type: task
state: done
priority: P1
slug: polyfill-crash-mid-write-keeps-the-previous-freeze
title: "Polyfill crash-mid-write keeps the previous freeze"
created: 2026-09-03T16:55:00.000Z
completed: 2026-09-03T17:18:03.658Z
depends_on: ["081M1M1QSCH087G0R001K2V08R"]
composes_with: ["081M1M1QSCH087G0R001K2V08R"]
---

# Polyfill crash-mid-write keeps the previous freeze

`createManual` now uses `FileSystemBlockIo` plus `WriteAt`. A crash
during the second freeze's LBA write must not hide the first freeze
(superblock still names the previous generation).

Native NVMe is not claimed. Recovery stays `toy`.

## Acceptance

- First Journaled freeze, `ArmCrashMidWrite(log/freeze, 8)`, second
  freeze throws `CrashMidWriteException`. Reopen: first is readable.
