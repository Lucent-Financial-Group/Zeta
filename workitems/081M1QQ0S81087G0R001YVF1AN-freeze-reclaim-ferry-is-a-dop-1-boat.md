---
id: 081M1QQ0S81087G0R001YVF1AN
type: task
state: backlog
priority: P2
slug: freeze-reclaim-ferry-is-a-dop-1-boat
title: "Freeze reclaim ferry is a DoP=1 boat"
created: 2026-09-05T02:40:32.001Z
depends_on: []
composes_with: []
---

# Freeze reclaim ferry is a DoP=1 boat

DoP=1 `ReclaimFerry` on the freeze volume. Separate from the WAL
boat (deletes vs writes). `reclaimAsync` + `pumpReclaim`. Still `toy`:
not auto-ticked after freezeAsync.
