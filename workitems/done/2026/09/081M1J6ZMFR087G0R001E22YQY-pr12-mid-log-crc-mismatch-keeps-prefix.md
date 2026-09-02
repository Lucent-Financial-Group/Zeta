---
id: 081M1J6ZMFR087G0R001E22YQY
type: task
state: done
priority: P1
slug: pr12-mid-log-crc-mismatch-keeps-prefix
title: "PR12 mid-log CRC mismatch keeps prefix"
created: 2026-09-02T23:23:00.000Z
completed: 2026-09-02T23:51:21.924Z
depends_on: []
composes_with: ["081M1J5CE6A087G0R000RVJC9H"]
---

# PR12: mid-log CRC mismatch keeps prefix

Named seed `mid CRC`. A checksum fail on a frame that is **not** the
tail used to `invalidOp` and refuse the volume, which drops intact
prefix freezes. Truncate from the bad frame; keep what already
verified.

## Acceptance

- Two Journaled freezes, flip a CRC byte of the second intent (commit
  still follows, so it is not a tail). Reopen: first is readable,
  second is not, log truncated to the first freeze.
- Sealed: flip a byte of the second intent inner. Same prefix keep.
  Wrong-key on the first frame still recovers nothing and does not
  truncate.
- Recovery stays `toy` for the volume as a whole.
