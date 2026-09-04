---
id: 081M1P61NWD087G0R003DN5XHY
type: task
state: done
priority: P1
slug: posix-freeze-objects-skip-existing-contentid
title: "POSIX freeze objects skip existing ContentId"
created: 2026-09-04T12:24:41.101Z
completed: 2026-09-04T12:27:37.566Z
depends_on: ["081M1P5DB07087G0R000GCAKH8"]
composes_with: ["081M1P5DB07087G0R000GCAKH8"]
---

# POSIX freeze objects skip existing ContentId

`BlockCas.Put` already skips an existing key. The POSIX object door
(`createManualStream`) still temp+renames every freeze of the same
ContentId. Content-addressed: same hex is the same bits — do not rewrite.

Durable freeze of an existing object fsyncs the file, it does not copy.

Does not promote crash recovery out of `toy`. Native NVMe is not claimed.

## Acceptance

- Two Journaled freezes of the same mutbuf snapshot through
  `createManualStream`: object paths are not written again on the second
  freeze (`CommitOrder` for `objects` stays the same length).
- Both freezes remain readable.
