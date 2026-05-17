---
id: B-0620.3
status: open
priority: P2
created: 2026-05-17
type: feature
composes_with:
  - B-0620.1  # vendor-adapter interface
---

# B-0620 Slice 3: Networking vendor adapter

## Scope
Implement the networking vendor adapter (e.g. Ubiquiti). This adapter consolidates off-Amazon network spending into the inventory substrate.

## Acceptance
- [ ] Implement `extract(year): InventoryRecord[]` for networking vendor (Ubiquiti).
- [ ] Verify output matches the unified normalized record schema.
- [ ] Confirm human-driven execution model only.
