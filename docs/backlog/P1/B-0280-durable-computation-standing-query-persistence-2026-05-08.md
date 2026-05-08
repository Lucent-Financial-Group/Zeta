---
id: B-0280
priority: P1
status: open
title: "Durable computation — standing query persistence via checkpoint"
created: 2026-05-08
parent: B-0251
depends_on: [B-0279]
classification: blocked-on-B-0279
decomposition: atomic
---

# B-0280 — Standing query persistence

Wire checkpoint StableStorage to standing Rx queries
so queries survive process restart.

## Acceptance criteria

- Standing query can checkpoint its state
- On restart, query resumes from checkpoint
- Test demonstrating crash + resume
