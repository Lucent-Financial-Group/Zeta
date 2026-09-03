---
id: 081M1KHJB60087G0R0016G69KV
type: task
state: backlog
priority: P1
slug: sealed-freeze-cas-through-filesystemblockio-polyfill
title: "Sealed freeze CAS through FileSystemBlockIo polyfill"
created: 2026-09-03T11:48:00.000Z
depends_on: ["081M1KG7P68087G0R001MFQXZP"]
composes_with: ["081M1KG7P68087G0R001MFQXZP"]
---

# Sealed freeze CAS through FileSystemBlockIo polyfill

Unsigned journaled CAS already rides two host-file polyfills. Sealed
frames plus CAS still needed `SimulatedBlockIo`. Vault session on both
host files.

`create` / `createManual` still speak a raw frame stream and POSIX
objects. Native NVMe is not claimed. Recovery stays `toy`.

## Acceptance

- `createManualWithSealedFileBlockStore`: same-session reopen is
  readable. `cas` file exists. No POSIX files under `objects/`. Log
  file has no `freeze-intent/1` ASCII.
- File-path sealed freeze unchanged.
