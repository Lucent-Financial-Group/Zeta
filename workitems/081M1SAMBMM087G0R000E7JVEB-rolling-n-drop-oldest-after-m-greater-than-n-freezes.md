---
id: 081M1SAMBMM087G0R000E7JVEB
type: task
state: in-progress
priority: P2
slug: rolling-n-drop-oldest-after-m-greater-than-n-freezes
title: "rolling N drop oldest after M greater than N freezes"
created: 2026-09-05T17:42:30.804Z
depends_on:
  - 081M1S8WJX7087G0R000WGTPW8
composes_with: []
---

# rolling N drop oldest after M greater than N freezes

D11: after M>N freezes of one entity under `rolling(N)`, at least M−N
bodies are reclaim-eligible. #16684 proved `KeepNone` / `rolling(1)` for
two freezes. A three-freeze `rolling(1)` run still left the first
generation readable — the window fold is not done.

Falsifier: truncate then freeze three distinct payloads under `rolling(2)`;
after reclaim, generation 1 is gone and 2 and 3 remain. Same for
`rolling(1)`: only generation 3 remains, and generation 1 stays gone after
the third freeze (must not come back).
