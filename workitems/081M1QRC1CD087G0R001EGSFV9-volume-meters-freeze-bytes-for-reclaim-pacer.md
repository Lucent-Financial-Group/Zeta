---
id: 081M1QRC1CD087G0R001EGSFV9
type: task
state: backlog
priority: P2
slug: volume-meters-freeze-bytes-for-reclaim-pacer
title: "Volume meters freeze bytes for reclaim pacer"
created: 2026-09-05T03:04:09.357Z
depends_on: []
composes_with: []
---

# Volume meters freeze bytes for reclaim pacer

Volume meters freeze `Span` since the last reclaim tick. `reclaimTickMetered`
paces from that meter, not a caller-invented budget and not wall-clock.
Still `toy`: not auto-ticked after freezeAsync.
