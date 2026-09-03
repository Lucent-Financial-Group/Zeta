---
id: 081M1KG7P68087G0R001MFQXZP
type: task
state: backlog
priority: P1
slug: freeze-cas-objects-through-filesystemblockio-polyfill
title: "Freeze CAS objects through FileSystemBlockIo polyfill"
created: 2026-09-03T11:25:00.000Z
depends_on: ["081M1KEYNPD087G0R000DX5MT7"]
composes_with: ["081M1KEYNPD087G0R000DX5MT7"]
---

# Freeze CAS objects through FileSystemBlockIo polyfill

The freeze log can ride `FileSystemBlockIo`. Objects still spoke POSIX
files unless `SimulatedBlockIo` + `BlockCas` was used. Two host files:
log and CAS, so a crash arm on objects cannot tear the log.

`create` / `createManual` still speak a raw frame stream and POSIX
objects. Native NVMe is not claimed. Recovery stays `toy`.

## Acceptance

- `createManualWithFileBlockStore`: reopen on the same host files is
  readable. `cas` file exists. No POSIX files under `objects/`.
- File-path freeze unchanged.
