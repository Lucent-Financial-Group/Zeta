---
id: 081M1T9YHR2087G0R002ZX9T36
type: task
state: in-progress
priority: P2
slug: reopen-freeze-byte-meter-still-paces-reclaimtickmetered
title: "Reopen freeze-byte meter still paces reclaimTickMetered"
created: 2026-09-06T02:48:00.000Z
depends_on: []
composes_with:
  - 081M1STGF9Y087G0R000FTWG8W
---

# Reopen freeze-byte meter still paces reclaimTickMetered

Persisting the number is not enough. After reopen, `reclaimTickMetered`
must still delete using that budget. pacer(0) would delete nothing.

Falsifier: freeze A; reopen; meter equals span; tick deletes planted
garbage; meter is 0. Recovery stays `toy`.
