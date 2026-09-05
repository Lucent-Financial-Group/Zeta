---
id: 081M1MFGNNC087G0R003SNN549
type: bug
state: done
priority: P2
slug: repair-newly-landed-auto-vivify-references-to-canonical-sour
title: "Repair newly landed auto-vivify references to canonical source paths"
created: 2026-09-03T20:31:40.716Z
completed: 2026-09-03T20:36:22Z
depends_on: []
composes_with: []
---

# Repair newly landed auto-vivify references to canonical source paths

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1MFGNNC087G0R003SNN549-*.md` glob. -->

## Defect

Current `origin/main` fails `auto-vivify --check` on 24 references introduced by
recent workitems. Existing source files are named with abbreviated paths that
omit their canonical source root. Three other references name proposed or
runtime-generated files as though they were tracked source pointers.

## Acceptance

- Existing-file references use tracked canonical paths.
- Proposed and runtime-generated paths remain readable without masquerading as
  live source pointers.
- The auto-vivify resolver remains strict and unchanged.
- `bun src/Core.TypeScript/backlog/auto-vivify.ts --check` and
  `bun run preflight:quick` pass.

## Resolution

Existing TypeScript references now use their tracked paths under
`src/Core.TypeScript/` or `agentic-organization/`. Proposed source files are
described as deliverables rather than live pointers, and the runtime promotion
window is identified as generated data. The resolver remains unchanged.

## Verification

- `bun src/Core.TypeScript/backlog/auto-vivify.ts --check` - 774 files scanned,
  zero dangling references.
- `bun run preflight:quick` - all 16 executed checks passed.
