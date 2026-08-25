---
id: 081M0XA4S79087G0R0021TYKPM
type: bug
state: done
priority: P1
slug: restore-typescript-gate-after-scaled-model-benchmark-merge
title: "Restore TypeScript gate after scaled model benchmark merge"
created: 2026-08-25T20:35:16.329Z
completed: 2026-08-25T20:41:22.167Z
depends_on: []
composes_with: []
---

# Restore TypeScript gate after scaled model benchmark merge

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0XA4S79087G0R0021TYKPM-*.md` glob. -->

## Defect

PR #15429 added `model-benchmark-scale.ts` with two unused local declarations.
The repository treats TS6133 as an error, so current `origin/main` cannot pass
the TypeScript portion of `bun run preflight:quick`.

## Acceptance

- The dead `n` alias is removed.
- The relative best-model energy value is used by the existing report instead
  of being duplicated as a literal.
- TypeScript lint and quick preflight pass without suppressions.

## Resolution

The unused trial alias was removed. The existing `bestEnergy` value now drives
the best-model report, preserving the relative-energy output without a duplicate
literal or a diagnostic suppression.

## Verification

- `bunx tsc --noEmit` - pass.
- `bun run preflight:quick` - all 13 executed checks passed.
