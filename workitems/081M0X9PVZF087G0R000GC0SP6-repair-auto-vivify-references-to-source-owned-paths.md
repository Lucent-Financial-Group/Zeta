---
id: 081M0X9PVZF087G0R000GC0SP6
type: bug
state: backlog
priority: P1
slug: repair-auto-vivify-references-to-source-owned-paths
title: "Repair auto-vivify references to source-owned paths"
created: 2026-08-25T20:27:40.399Z
depends_on: []
composes_with: []
---

# Repair auto-vivify references to source-owned paths

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0X9PVZF087G0R000GC0SP6-*.md` glob. -->

## Defect

`bun run preflight:quick` reports eleven dangling paths across four newly added
workitems. Each abbreviated path names a real file but omits its canonical source
root, so the auto-vivify gate resolves it under a nonexistent `db/` location.

## Acceptance

- All eleven references point at their tracked canonical paths.
- `bun src/Core.TypeScript/hygiene/auto-vivify.ts --check` passes.
- `bun run preflight:quick` passes without weakening the resolver.
