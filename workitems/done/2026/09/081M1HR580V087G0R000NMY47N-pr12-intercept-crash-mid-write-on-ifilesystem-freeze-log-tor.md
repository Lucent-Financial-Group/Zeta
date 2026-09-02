---
id: 081M1HR580V087G0R000NMY47N
type: task
state: done
priority: P1
slug: pr12-intercept-crash-mid-write-on-ifilesystem-freeze-log-tor
title: "PR12 intercept: crash-mid-write on IFileSystem (freeze log torn tail)"
created: 2026-09-02T19:05:00.187Z
completed: 2026-09-02T19:22:22.700Z
depends_on: []
composes_with: ["081M1C59ZG4087G0R000VM8DZN", "081M1HNCGN8087G0R000ZK7ZGX"]
---

# PR12 intercept: crash-mid-write on IFileSystem (freeze log torn tail)

Slice of first-product PR12 / ZetaDB D12. Not the promotion out of `toy`.

## Why

`InMemoryFileSystem` committed the whole `MemoryStream` on Dispose, so
crash-mid-write was unrepresentable. FreezeLog replied Ok *before* Dispose,
so a torn log could still ack. GroupCommit already truncated a physical
torn tail; the same door did not exist on the mock.

## Acceptance

- `ArmCrashMidWrite(pathContains, afterBytes)` is one-shot: matching write
  Dispose commits the prefix then throws `CrashMidWriteException`.
- Same arm, same bytes → same committed length.
- FreezeLog disposes the stream before Reply. Journaled freeze with the
  arm faults; log length is the prefix; `finish` does not run.
- GroupCommit second append through the same door tears the tail; a fresh
  instance truncates and keeps HighWater of the intact prefix.
- Docs still say recovery is `toy`. Reorder / corrupt-last-write /
  freeze-log replay / reclaim sweep are not this slice.

## Honesty

`ISimulatedFs` stays flush-fail 5%. `IBlockIo` stays the FileSystemBlockIo
sketch. Do not claim crash-safe.
