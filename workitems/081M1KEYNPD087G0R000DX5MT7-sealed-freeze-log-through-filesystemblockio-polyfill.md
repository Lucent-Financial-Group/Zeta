---
id: 081M1KEYNPD087G0R000DX5MT7
type: task
state: backlog
priority: P1
slug: sealed-freeze-log-through-filesystemblockio-polyfill
title: "Sealed freeze log through FileSystemBlockIo polyfill"
created: 2026-09-03T11:03:00.000Z
depends_on: ["081M1KDRJAA087G0R003S519DD"]
composes_with: ["081M1KDRJAA087G0R003S519DD"]
---

# Sealed freeze log through FileSystemBlockIo polyfill

Unsigned journaled frames can ride `FileSystemBlockIo`. Sealed frames
still needed `SimulatedBlockIo`. Same polyfill, vault session,
wrong-key MAC recovers nothing and does not truncate.

`create` / `createManual` still speak a raw frame stream. Native NVMe
is not claimed. Recovery stays `toy`.

## Acceptance

- Sealed Journaled freeze through `createManualWithSealedFileLog`, reopen
  with the same session: `isReadable`. Log file has no `freeze-intent/1`
  ASCII.
- Reopen with a different vault key: not readable, `logLogicalBytes`
  unchanged.
- File-path sealed freeze unchanged.
