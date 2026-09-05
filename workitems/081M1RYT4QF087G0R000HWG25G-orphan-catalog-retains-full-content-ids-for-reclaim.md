---
id: 081M1RYT4QF087G0R000HWG25G
type: task
state: backlog
priority: P2
slug: orphan-catalog-retains-full-content-ids-for-reclaim
title: "Orphan catalog retains full content ids for reclaim"
created: 2026-09-05T14:15:57.423Z
depends_on: []
composes_with: []
---

# Orphan catalog retains full content ids for reclaim

Volume `orphanObjects` keeps full `ContentHash256` for reclaim.
A objects-dir path scan cannot reconstruct ids (128-bit CAS path).
Still `toy`: not auto-ticked after freezeAsync.
