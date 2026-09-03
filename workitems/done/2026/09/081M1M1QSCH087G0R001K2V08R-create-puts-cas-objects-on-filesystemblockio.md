---
id: 081M1M1QSCH087G0R001K2V08R
type: task
state: done
priority: P1
slug: create-puts-cas-objects-on-filesystemblockio
title: "create puts CAS objects on FileSystemBlockIo"
created: 2026-09-03T16:31:00.000Z
completed: 2026-09-03T16:54:46.265Z
depends_on: ["081M1M0AC9D087G0R003X7STF4"]
composes_with: ["081M1M0AC9D087G0R003X7STF4"]
---

# create puts CAS objects on FileSystemBlockIo

`create` / `createManual` already ride `FileSystemBlockIo` for the
journaled log. Objects still spoke POSIX files. Two host files: log
and `cas`, same door as `createManualWithFileBlockStore`.

`createManualWithFileLog` stays log-only (POSIX objects) for tests that
want that split. `createManualStream` stays a raw frame stream.
Native NVMe is not claimed. Recovery stays `toy`.

## Acceptance

- `create`: `cas` exists, no POSIX files under `objects/`, freeze is
  readable.
- Existing freeze tests stay green.
