---
id: 081M1HVVN9P087G0R003Z7E7B3
type: task
state: done
priority: P1
slug: pr12-replay-intact-freeze-log-boats-drop-torn-tail
title: "PR12: replay intact freeze-log boats; drop torn tail"
created: 2026-09-02T20:09:40.407Z
completed: 2026-09-02T20:14:45.053Z
depends_on: ["081M1HR580V087G0R000NMY47N"]
composes_with: ["081M1C59ZG4087G0R000VM8DZN"]
---

# PR12: replay intact freeze-log boats; drop torn tail

After #16370 the intercept can tear the freeze log. GroupCommit already
truncates a torn tail on a fresh instance. Freeze still kept Commits only
in memory, so a restart lost every freeze.

## Acceptance

- `create` / `createManual` scan the freeze log and restore Commits/Leaves
  for every intact intent+commit pair.
- Trailing torn frame or intent-without-commit is truncated, not recovered.
- Same seed: crash after first freeze, tear the second, reopen → first is
  readable, second is not.
- Sealed logs are not this slice (FORMAT enc=off is the default profile).
- Span/Generation are not in the v1 frame; replayed results use 0. isReadable
  does not need them.
- Recovery of the whole volume (reorder, corrupt-last-write, reclaim sweep)
  stays `toy`.
