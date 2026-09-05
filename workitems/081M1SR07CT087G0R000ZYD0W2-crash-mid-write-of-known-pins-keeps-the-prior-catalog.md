---
id: 081M1SR07CT087G0R000ZYD0W2
type: task
state: in-progress
priority: P2
slug: crash-mid-write-of-known-pins-keeps-the-prior-catalog
title: "Crash mid-write of known.pins keeps the prior catalog"
created: 2026-09-05T21:34:00.000Z
depends_on: []
composes_with: []
---

# Crash mid-write of known.pins keeps the prior catalog

`known.pins` is tmp+rename. A crash-mid-write of the tmp must not
replace the live catalog. Freeze A; arm `known.pins`; freeze B throws;
reopen; A stays readable.

Not dual-slot yet. Recovery stays `toy`.
