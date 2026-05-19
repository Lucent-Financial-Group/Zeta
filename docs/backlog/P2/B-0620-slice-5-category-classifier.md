---
id: B-0620.5
status: open
priority: P2
created: 2026-05-19
type: feature
composes_with:
  - B-0620  # multi-account + multi-vendor inventory consolidation
  - B-0610  # amazon-orders-extract v3 design pass
depends_on:
  - B-0620.4 # Consolidator script
---

# B-0620.5: Category-classifier for multi-vendor inventory

## Context
This is Slice 5 peeled from the B-0620 blob.
It operationalizes the category classification for the consolidated inventory records.

## Scope
Category-classifier (initial heuristic, refined over time) that maps each record to:
- `revenue-generating` (Otto-team capex)
- `rnd` (Maintainer-gift R&D)
- `pending`

per the `AI-TEAM-FINANCIAL-SUBSTRATE` structure.

## Acceptance
- [ ] Classifier module implemented with mapping logic based on product keywords and categories.
- [ ] Integrates with the consolidator script (B-0620.4).
- [ ] Committable hardware-filter substrate output correctly categorizes products.