---
id: 081M00TDNYA087G0R003AGFC7J
type: task
state: backlog
priority: P2
slug: route-every-zetaid-sort-through-a-declared-sort-field-time-v
title: "Route every ZetaId sort through a declared sort field (time vs identity)"
created: 2026-08-14T19:01:46.570Z
depends_on: []
composes_with: []
---

# Route every ZetaId sort through a declared sort field (time vs identity)

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M00TDNYA087G0R003AGFC7J-*.md` glob. -->

`src/Core.TypeScript/zeta-id/sort-key.ts` now exists: `timeSortKey` / `identitySortKey` /
`compareByField`, where the time key **refuses** any id whose layout has no Timestamp field at
bits [75,123) — an unknown version, or any category >= 9 (`packGeneric` layout). Two sort sites
declare their field in prose (`inventory/generate-items-json.ts`, `backlog/generate-index.ts`).

Remaining, all LOW urgency — the survey in
`docs/research/2026-08-14-zetaid-universal-pointer-derived-vs-minted-declared-sort-fields-and-why-v3-is-not-needed.md`
§4c found that **every** code sort in the tree is identity-order or orders by an ISO timestamp
carried in the record, never by the id-as-clock:

- [ ] Route the remaining sort sites in §4c through the named comparators, so the declaration is a
      symbol rather than a comment.
- [ ] Fix `inventory/new-item.ts`: it packs a ms timestamp into a `packGeneric` payload at an offset
      that does NOT line up with the observation Timestamp field, so its ids read as the year 9200
      and sort after every observation id. Either move `InventoryAsset` under category < 9 so the
      documented time-sortability is true, or drop the claim.
- [ ] Name the MINTED vs DERIVED split per category in `registry/categories.yaml` (§6a): a derived
      category takes its identity bits from the subject, never from an ambient clock or CSPRNG.
      `pr-manifest-shards.ts` and `tick-shards.ts` are the two worked examples already in tree.
