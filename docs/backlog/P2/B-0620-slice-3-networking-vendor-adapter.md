---
id: B-0620-slice-3
status: open
priority: P2
created: 2026-05-20
type: feature
composes_with:
  - B-0620  # Parent multi-account multi-vendor framework
depends_on:
  - B-0620-slice-1  # Vendor-adapter interface
---

# B-0620 Slice 3: Networking vendor adapter (Ubiquiti)

## Context
Extracted from B-0620 (PR #4023).
The maintainer's off-Amazon spend most likely concentrates here per the $50-100K off-Amazon disclosure.

## Scope
Implement the vendor adapter for Ubiquiti using the shared vendor-adapter interface (`extract(year): InventoryRecord[]`).

## Constraints
1. Must comply with the B-0620 unified normalized record schema.
2. Must follow B-0582 destructive-verb-refusal-gate (human-driven read-only).
3. Output categorizes via `docs/governance/AI-TEAM-FINANCIAL-SUBSTRATE.md`.

## Acceptance
- [ ] Ubiquiti DOM/API adapter implemented and operational.
- [ ] Outputs unified `InventoryRecord` shape.
- [ ] Documented in `tools/inventory/README.md`.
