---
id: 081M1SMAEA2087G0R000T57AKG
type: task
state: in-progress
priority: P2
slug: reopen-replay-fills-objectsets-so-isreadable-still-hash-veri
title: "Reopen replay fills ObjectSets so isReadable still hash-verifies"
created: 2026-09-05T20:31:00.000Z
depends_on: []
composes_with:
  - 081M1SK0NXF087G0R002N0DCM0
---

# Reopen replay fills ObjectSets so isReadable still hash-verifies

Live `isReadable` used `ObjectSets` (trunk + leaves). Replay only restored
`Leaves`, so reopen skipped the trunk hash. Commit replay now records
`content` plus intent leaves into `ObjectSets`.

Falsifier: freeze A; reopen; XOR an object file; A is not readable.
Recovery stays `toy`.
