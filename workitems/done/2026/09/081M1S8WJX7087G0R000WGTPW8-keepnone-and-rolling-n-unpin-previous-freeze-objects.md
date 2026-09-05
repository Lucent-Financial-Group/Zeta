---
id: 081M1S8WJX7087G0R000WGTPW8
type: task
state: done
priority: P2
slug: keepnone-and-rolling-n-unpin-previous-freeze-objects
title: "KeepNone and rolling(N) unpin previous freeze objects"
created: 2026-09-05T17:12:03.239Z
completed: 2026-09-05T17:42:05.901Z
depends_on:
  - 081M1S5X49C087G0R002TMVKQM
composes_with: []
---

# KeepNone and rolling(N) unpin previous freeze objects

LivePins only added. Successful freeze of a new generation never unpinned
the previous one, so `KeepNone` and `rolling(N)` were names without a
fold. D11: after M>N freezes of one entity under `rolling(N)`, at least
M−N bodies are reclaim-eligible.

- Volume history policy: DST `createManual*` stays `KeepAll` (tests).
  Product `create` uses `rollingDefault` (N=32, unmetered).
- On successful Journaled/Durable freeze, record the freeze's CAS object
  set, keep the last N contents of that entity by CommitLsn, unpin objects
  that no remaining content still names.
- Shared Jumprope chunks stay pinned.

Falsifier: `KeepNone` and `rolling(1)`; freeze A; freeze B (different bytes);
`pumpReclaim`; A is not readable; B is. `KeepAll` still keeps both. Phase/byte
Rolling caps and M>N with N≥2 stay a later peel.

PR12 slice. Phase/byte caps of Rolling stay unmetered. Recovery still `toy`.
