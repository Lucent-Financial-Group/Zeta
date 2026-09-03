---
id: 081M1HY9K92087G0R002GN49HS
type: task
state: done
priority: P1
slug: pr12-corrupt-last-write-intercept-on-ifilesystem
title: "PR12: corrupt-last-write intercept on IFileSystem"
created: 2026-09-02T20:52:14.243Z
completed: 2026-09-02T20:55:09.114Z
depends_on: ["081M1HR580V087G0R000NMY47N"]
composes_with: ["081M1HVVN9P087G0R003Z7E7B3", "081M1C59ZG4087G0R000VM8DZN"]
---

# PR12: corrupt-last-write intercept on IFileSystem

D12 seed next to crash-mid-write. The write acks; the last bytes on the
door are flipped. Recovery must not treat that as a durable freeze.

## Acceptance

- `ArmCorruptLastWrite(pathContains, lastBytes)` is one-shot: matching
  write Dispose XORs the last `lastBytes` with `0xA5` and commits. No throw.
- Same arm, same bytes → same corrupted suffix.
- Crash-mid-write wins if both are armed (prefix then throw).
- Journaled freeze acks; a fresh volume does not find it readable (trailing
  CRC fails, replay truncates).
- GroupCommit append acks; a fresh instance HighWater skips the corrupt tail.
- Reorder and reclaim sweep are not this slice. Recovery stays `toy`.
