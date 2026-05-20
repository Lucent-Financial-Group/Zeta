---
id: B-0620.4
status: open
priority: P2
title: B-0620 Slice 4 — consolidator script
created: 2026-05-20
type: feature
composes_with:
  - B-0620.1  # vendor-adapter interface
---

# B-0620 Slice 4: Consolidator script

## Scope

Implement the central consolidator script (`tools/inventory/consolidate.ts`) that merges outputs from N different vendor adapters into a single unified inventory file.

## Acceptance

- [ ] Implement a script that reads from all active vendor adapters.
- [ ] Handle deduplication across vendors (e.g., identical product purchased from two vendors).
- [ ] Output a single committable hardware-filter substrate matching the three-category structure from `AI-TEAM-FINANCIAL-SUBSTRATE.md`.
