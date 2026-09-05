---
id: 081M1S1APGQ087G0R000F77JAH
type: task
state: backlog
priority: P2
slug: crash-leftover-cas-object-is-an-orphan-the-next-freeze-recla
title: "Crash leftover CAS object is an orphan the next freeze reclaims"
created: 2026-09-05T14:59:57.079Z
depends_on: []
composes_with: []
---

# Crash leftover CAS object is an orphan the next freeze reclaims

Crash-mid-write of a CAS object that left a prefix is catalogued
(full ContentHash256). The next successful freeze enqueues orphan
reclaim. PR12 slice; recovery still `toy` until the rest of the corpus.
