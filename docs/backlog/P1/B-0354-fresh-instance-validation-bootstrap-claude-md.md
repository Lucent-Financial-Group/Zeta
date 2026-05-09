---
id: B-0354
priority: P1
status: open
title: "Fresh-instance validation test for bootstrap CLAUDE.md"
created: 2026-05-09
last_updated: 2026-05-09
depends_on:
  - B-0353
decomposition: atomic
classification: blocked
type: friction-reducer
owners: [architect]
parent: B-0329
---

# B-0354 — Fresh-instance validation test

## What

Run a fresh Claude Code session with the bootstrap-only
CLAUDE.md and verify it produces coherent first-PR behavior
equivalent to the current doctrine-based CLAUDE.md.

## Test protocol

1. Start fresh Claude Code session in the repo.
2. Give it a representative task (e.g., "pick and complete
   the next open backlog item").
3. Observe whether it:
   - Reads the bootstrap process and follows the steps
   - Discovers rules through `.claude/rules/` auto-load
   - Produces a coherent PR with correct build gate
   - Handles edge cases (stuck, need escalation, etc.)
4. Document findings: what worked, what was missed, what
   rules failed to surface.

## Acceptance criteria

1. Fresh instance completes a representative task
   successfully.
2. No critical rules lost in the extraction (all behavioral
   rules accessible via `.claude/rules/` auto-load).
3. Findings documented as a test report on this row.
4. If gaps found: file follow-up items for each gap.

## Effort

S — 1-2 hours of testing + documentation.
