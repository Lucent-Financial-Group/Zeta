---
id: B-0282
priority: P0
status: open
title: "Autonomous pickup — integrate into background tick scripts"
created: 2026-05-08
parent: B-0249
depends_on: [B-0281]
classification: blocked-on-B-0281
decomposition: atomic
---

# B-0282 — Tick integration

Wire autonomous-pickup.ts into otto/vera/lior tick scripts.
On each tick: if no open PR to manage, pick a buildable-now
item and start work on it.

## Acceptance criteria

- Background tick calls autonomous-pickup.ts when idle
- Picks highest-priority buildable-now item
- Opens a PR with the work
- Test: tick with empty PR queue picks an item
