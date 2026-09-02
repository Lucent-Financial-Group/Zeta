---
id: 081M1J5CE6A087G0R000RVJC9H
type: task
state: backlog
priority: P1
slug: pr12-freeze-intent-then-leaves-then-commit
title: "PR12 freeze intent then leaves then commit"
created: 2026-09-02T22:56:07.370Z
depends_on: []
composes_with: ["081M1C59ZG4087G0R000VM8DZN", "081M1HNCGN8087G0R000ZK7ZGX"]
---

# PR12: freeze intent then leaves then commit

Named seed `intent-before-leaf-flush` / subset leaves. Journaled and
Durable boats used to `putObject` every CAS blob **before** the log
boat, so a crash during a leaf could not leave a trailing intent.

## Acceptance

- Journaled/Durable `processBatch` writes the intent frame, `Flush`es
  (visible, no crash arm), puts CAS objects, then writes the commit.
- `SimulatedFileStream.Flush` publishes without firing crash / corrupt /
  reorder arms. Dispose still `commitWrite`.
- Crash-mid-write on `objects` after intent Flush: freeze does not ack,
  log has a trailing intent, reopen drops it (`isReadable` false). Extra
  garbage is allowed; a live committed object is not missing.
- Buffered still puts objects and skips the log.
- Recovery stays `toy` for the volume as a whole. Native device I/O is
  not this slice.
