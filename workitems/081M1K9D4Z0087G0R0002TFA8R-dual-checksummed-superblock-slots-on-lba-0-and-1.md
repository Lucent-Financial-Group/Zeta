---
id: 081M1K9D4Z0087G0R0002TFA8R
type: task
state: backlog
priority: P1
slug: dual-checksummed-superblock-slots-on-lba-0-and-1
title: "Dual checksummed superblock slots on LBA 0 and 1"
created: 2026-09-03T09:25:39.424Z
depends_on: ["081M1K8T36N087G0R0005YQGJW"]
composes_with: ["081M1K8T36N087G0R0005YQGJW"]
---

# Dual checksummed superblock slots on LBA 0 and 1

A crash during the superblock Write can tear LBA 0 and lose every freeze,
not only the last one. Two slots (LBA 0 and LBA 1), generation + CRC,
inactive slot is the next write. Payload starts at LBA 2. Magic bump
`ZFL2` / `ZCA2` (layout changed; DST-only, no migration).

CRC is IEEE-802 over bytes after offset 8 (`System.IO.Hashing.Crc32`).
It checksums the superblock record, not the payload. Per-frame CRC on
the freeze log is unchanged. A crash during the new slot can still drop
the last uncommitted freeze; the previous generation stays readable.

## Acceptance

- After `writeLog(100)`, crash-mid-write of `writeLog(200)`, `CloneMedia`:
  `tryReadLog` is `Some 100`.
- After `writeLog(100)`, corrupt-last-write of `writeLog(200)`:
  `tryReadLog` is `Some 100`.
- Crash on the first slot: `tryReadLog` is `None`.
- Same shape for `writeCas` / `tryReadCas`.
- File-path freeze unchanged. Native NVMe is not claimed. Recovery stays
  `toy`. Default freeze path is still files.
