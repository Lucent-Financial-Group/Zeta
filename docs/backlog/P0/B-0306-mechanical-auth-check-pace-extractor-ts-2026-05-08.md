---
id: B-0306
priority: P0
status: open
title: "Mechanical authorization check — pace-instruction extractor + test fixtures"
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0160
depends_on: []
classification: buildable-now
decomposition: atomic
owners: [architect]
type: friction-reducer
tags: [tool-build, mechanical-check, authorization-source, typescript]
---

# B-0306 — Pace-instruction extractor + test fixtures

## What

TDD-first: write the test fixtures that define the contract, then
the TS implementation that satisfies them. The extractor reads
substrate surfaces (CLAUDE.md, `memory/feedback_*.md` files,
`CURRENT-aaron.md`) and returns a typed list of pace-instruction
records with source, timestamp, and raw text.

Lands at `tools/authorization/pace-extractor.ts` with paired
test at `tools/authorization/pace-extractor.test.ts`.

## Acceptance criteria

1. **Test fixtures** (write first) cover the five cases from B-0160:
   - Single pace instruction → extracted correctly
   - Two instructions, both from maintainer → both returned in
     chronological order
   - Peer-AI framing (Claude.ai, Amara, Codex) → filtered out
     by source-filter (not returned)
   - No pace instruction in substrate → empty array
   - Instruction with explicit rescind marker → tagged as rescinded
2. **Implementation** reads from:
   - `CLAUDE.md` pace bullets (grep for pace-relevant patterns)
   - `memory/feedback_*.md` files (parse frontmatter + body for
     maintainer pace-instructions)
   - `memory/CURRENT-aaron.md` (if exists — distilled projection)
3. Returns typed `PaceInstruction[]` with fields:
   `{ source: string; timestamp: string | null; raw: string;
     file: string; rescinded: boolean }`.
4. Pure function on file content (no side effects) — accepts a
   root-path argument for testability.
5. TypeScript, runs under Bun (Rule 0).

## Composes with

- B-0160 (parent umbrella)
- B-0305 (skill body defines the contract this tool implements)
- B-0307 (resolver consumes this extractor's output)
