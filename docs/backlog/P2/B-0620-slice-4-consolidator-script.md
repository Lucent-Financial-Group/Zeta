---
id: B-0620.4
status: open
priority: P2
created: 2026-05-20
type: feature
depends_on:
  - B-0620.1  # vendor adapter interface
---

# B-0620 Slice 4: Consolidator Script

## Scope

Implement the consolidator script (`tools/inventory/consolidate.ts`) which merges N-adapter outputs and handles dedupe across vendors (same product bought from two vendors).

## Acceptance
- [ ] Script successfully loads output from multiple adapters.
- [ ] Implements deduplication logic to avoid duplicate hardware entries.
- [ ] Emits a single normalized inventory file.
