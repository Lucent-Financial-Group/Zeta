---
id: 081M1J14DZ9087G0R0033PRAAX
type: task
state: done
priority: P1
slug: pr12-replay-sealed-freeze-log-boats
title: "PR12: replay sealed freeze-log boats"
created: 2026-09-02T21:41:50.697Z
completed: 2026-09-02T21:44:52.646Z
depends_on: ["081M1HVVN9P087G0R003Z7E7B3"]
composes_with: ["081M1C59ZG4087G0R000VM8DZN"]
---

# PR12: replay sealed freeze-log boats

Plain-log replay landed. Sealed frames were `[len][inner]` with LSN only
inside the AEAD, so `openLog` could not rebuild the nonce on create.

## Acceptance

- Sealed frame is `[len:i32][lsn:i64][inner]`. LSN is public (it is already
  the nonce field); plaintext stays inside AEAD.
- `create` / `createWith` with a session restore intact sealed intent+commit
  pairs. Same vault key, reopen, isReadable.
- Wrong vault key recovers nothing and does not truncate the log.
- Trailing MAC/GCM failure truncates like a torn tail.
- Reclaim sweep is not this slice. Recovery stays `toy`.
