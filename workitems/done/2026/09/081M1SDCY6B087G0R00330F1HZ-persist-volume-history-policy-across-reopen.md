---
id: 081M1SDCY6B087G0R00330F1HZ
type: task
state: done
priority: P2
slug: persist-volume-history-policy-across-reopen
title: "Persist volume history policy across reopen"
created: 2026-09-05T18:30:53.387Z
completed: 2026-09-05T18:54:51.424Z
depends_on:
  - 081M1SC3ADK087G0R001M8YKBS
composes_with: []
---

# Persist volume history policy across reopen

`History` was process RAM. `createManual` reopen reset to `KeepAll`, so
a KeepNone volume would stop forgetting after a crash. `known.pins` first
line is `history keep-none` / `keep-all` / `rolling N`. Object rows stay
`hash size pin`. Product `create` still applies `rollingDefault`.

Falsifier: KeepNone; freeze A; dispose; reopen `createManual` without
setting History; freeze B; pumpReclaim; A is gone, B stays.
