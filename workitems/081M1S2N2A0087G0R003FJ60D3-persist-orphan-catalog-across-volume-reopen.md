---
id: 081M1S2N2A0087G0R003FJ60D3
type: task
state: backlog
priority: P2
slug: persist-orphan-catalog-across-volume-reopen
title: "Persist orphan catalog across volume reopen"
created: 2026-09-05T15:23:05.408Z
depends_on: []
composes_with: []
---

# Persist orphan catalog across volume reopen

`known.objects` persists Known + LivePins. Reopen after crash leftover
still sees orphans. Recovery still `toy` until the rest of PR12.
