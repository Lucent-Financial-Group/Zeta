---
id: 081M1HZPTX7087G0R0013PARBX
type: task
state: done
priority: P1
slug: pr12-reorder-next-two-matching-writes-on-ifilesystem
title: "PR12: reorder next two matching writes on IFileSystem"
created: 2026-09-02T21:16:56.615Z
completed: 2026-09-02T21:19:44.737Z
depends_on: ["081M1HY9K92087G0R002GN49HS"]
composes_with: ["081M1HR580V087G0R000NMY47N", "081M1C59ZG4087G0R000VM8DZN"]
---

# PR12: reorder next two matching writes on IFileSystem

D12 seed: crash-mid-write and corrupt-last-write landed. Reorder is the
remaining FoundationDB disk intercept on this door.

## Acceptance

- `ArmReorderNextTwo(pathContains)` holds the first matching Dispose so the
  file is not yet visible, then the second matching Dispose commits itself
  first and flushes the held write. `CommitOrder` is `[second; first]`.
- Contents of both paths are the bytes that were written, not swapped.
- Same arm replays the same order.
- Crash-mid-write and corrupt-last-write still win if they match first.
- Freeze still finishes object puts before the log boat, so this seed does
  not scramble freeze vs leaves. That stay is named, not hidden.
- Sealed-log replay and reclaim sweep are not this slice. Recovery stays `toy`.
