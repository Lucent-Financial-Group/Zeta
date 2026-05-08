---
id: B-0307
priority: P0
status: open
title: "Mechanical authorization check — source-filter + recency resolver"
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0160
depends_on: [B-0306]
classification: blocked
decomposition: atomic
owners: [architect]
type: friction-reducer
tags: [tool-build, mechanical-check, authorization-source, typescript]
---

# B-0307 — Source-filter + recency resolver

## What

The core algorithm: given the `PaceInstruction[]` from B-0306's
extractor, apply the two-stage mechanical filter (source-filter →
recency-filter) and return the single operative authorization.

Lands at `tools/authorization/resolve-authorization.ts` with
paired test at `tools/authorization/resolve-authorization.test.ts`.

## Acceptance criteria

1. **Source filter** — keeps only instructions where `source`
   matches the authorized source for the pace-instruction class
   (human maintainer only). Peer-AI, Claude.ai, Amara framings
   are discarded.
2. **Recency filter** — among source-authorized instructions,
   returns the most-recent-not-rescinded. An instruction is
   rescinded only if a later instruction from the same source
   explicitly revokes it (implicit displacement does NOT rescind).
3. **Output shape**: `{ operative: PaceInstruction | null;
   reason: string; allCandidates: PaceInstruction[];
   filteredOut: PaceInstruction[] }`.
4. **Test fixtures** (write first) cover:
   - Cross-instance absorption (Claude.ai "cooling-period"
     alongside maintainer "go-hard") → only maintainer surfaces
   - Most-recent rescinded → prior instruction wins
   - No maintainer instruction → `operative: null` with
     reason "no operative pace authorization found; default to
     never-idle floor per CLAUDE.md"
   - Multiple maintainer instructions → most recent wins
5. Composes: the resolver is a pure function over
   `PaceInstruction[]` — no file I/O.
6. TypeScript, runs under Bun (Rule 0).

## Composes with

- B-0160 (parent umbrella)
- B-0306 (extractor provides the input type)
- B-0308 (autonomous-loop wiring calls extractor → resolver)
