---
id: B-0348
priority: P1
status: open
title: "Classify all CLAUDE.md bullets into extraction tiers"
created: 2026-05-09
last_updated: 2026-05-09
depends_on: []
decomposition: atomic
classification: buildable-now
type: friction-reducer
owners: [architect]
parent: B-0329
---

# B-0348 — Classify all CLAUDE.md bullets into extraction tiers

## What

Audit every bullet in CLAUDE.md's "Ground rules Claude Code
honours here" section (currently 51 bold-bullet rules across
~900 lines) and classify each into exactly one extraction tier:

| Tier | Meaning | Destination |
|------|---------|-------------|
| `stay` | Essential at wake — part of the bootstrap process | Stays in CLAUDE.md (condensed to 1-2 lines) |
| `extract` | Behavioral rule — auto-loads from `.claude/rules/` | New `.claude/rules/<name>.md` file; CLAUDE.md bullet becomes pointer |
| `already` | Already extracted to `.claude/rules/` | CLAUDE.md bullet stays as pointer (no work needed) |
| `redundant` | Already covered by AGENTS.md / GOVERNANCE.md / docs/ | Remove from CLAUDE.md |

## Why

Every subsequent B-0329 child depends on this classification
to know which bullets to touch. Without it, extraction batches
risk moving the wrong content or duplicating what's already
covered elsewhere.

## Acceptance criteria

1. Classification table added to this row (or a linked doc)
   listing all 51 bullets with their tier assignment.
2. Each `extract` bullet assigned to exactly one of the four
   extraction batches (B-0349..B-0352) by functional group.
3. Each `redundant` bullet paired with the existing doc that
   already covers it.
4. No code/substrate changes — analysis only.

## Effort

S — 1-2 hours of careful reading.
