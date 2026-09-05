---
id: 081M1S06G1V087G0R0033NXEDZ
type: task
state: backlog
priority: P2
slug: auto-enqueue-orphan-reclaim-after-successful-freeze
title: "Auto-enqueue orphan reclaim after successful freeze"
created: 2026-09-05T14:40:10.811Z
depends_on: []
composes_with: []
---

# Auto-enqueue orphan reclaim after successful freeze

Successful freeze enqueues reclaim of nonempty `orphanObjects` on the
reclaim ferry. Empty catalog does not consume the freeze-byte meter.
Manual volumes still `pumpReclaim`.
