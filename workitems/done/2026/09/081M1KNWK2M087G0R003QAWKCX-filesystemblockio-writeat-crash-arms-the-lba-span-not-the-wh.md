---
id: 081M1KNWK2M087G0R003QAWKCX
type: task
state: done
priority: P1
slug: filesystemblockio-writeat-crash-arms-the-lba-span-not-the-whole-file
title: "FileSystemBlockIo WriteAt crash-arms the LBA span not the whole file"
created: 2026-09-03T13:00:00.000Z
completed: 2026-09-03T15:02:51.320Z
depends_on: ["081M1KHJB60087G0R0016G69KV"]
composes_with: ["081M1KHJB60087G0R0016G69KV"]
---

# FileSystemBlockIo WriteAt crash-arms the LBA span not the whole file

`FileSystemBlockIo.Write` opened the host file as a stream. Dispose
commits the whole buffer, so `ArmCrashMidWrite(8)` on a 4096-byte LBA
write tore the start of the file (superblock), not the LBA being
written. That is why `create` / `createManual` cannot move onto the
polyfill yet.

`IFileSystem.WriteAt` overlays `src` at `offset`. Crash/corrupt/reorder
arms apply to `src`, not to a whole-file Dispose. Earlier LBAs stay.

`create` / `createManual` still speak a raw frame stream. Native NVMe
is not claimed. Recovery stays `toy`.

## Acceptance

- Write LBA 0, `ArmCrashMidWrite(path, 8)`, write LBA 1 throws:
  LBA 0 round-trips; LBA 1 has an 8-byte prefix.
- Write LBA 0, `ArmCorruptLastWrite(path, 8)`, write LBA 1 acks:
  LBA 0 round-trips; LBA 1 last 8 bytes are XOR 0xA5.
- File-path `createManual` crash tests unchanged.
