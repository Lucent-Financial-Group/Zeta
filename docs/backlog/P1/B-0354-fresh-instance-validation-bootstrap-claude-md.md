---
id: B-0354
priority: P1
status: open
title: "Fresh-instance validation test for bootstrap CLAUDE.md"
created: 2026-05-09
last_updated: 2026-05-09
depends_on:
  - B-0353
decomposition: multi-child (re-decomp pass 1, smallest safe slice)
classification: buildable-now
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

## Pre-start checklist (backlog-item start gate)

**Prior-art search (2026-05-11 Riven):** Searched `docs/backlog/**/B-03*.md`, `docs/BACKLOG.md`, `docs/trajectories/*/RESUME.md` for "bootstrap CLAUDE", "fresh-instance", "B-0329", "B-0353". Found related in B-0329 (parent), B-0353 (closed predecessor), B-0348 (extraction classify), B-0315 (trim context). No duplicate test harness exists. Surfaces: BACKLOG.md lines 187-188, B-0329 decomposition tree.

**Dependency-restructure:** B-0353 closed (2026-05-10). No broken pointers. Added reciprocal note to B-0329. Supersession via decision-archaeology on B-0329/B-0353 lineage complete (no B-0169 gaps).

## Re-decomposition (smallest safe slice, one bounded step)

Re-decomp assumes prior "atomic" classification was mistaken (test protocol is inherently multi-phase). Split into 3 atomic children (TS-first where possible, per Rule 0):

- B-0354.1: TS harness skeleton for fresh-instance bootstrap validator (script that checks CLAUDE.md length <50, .claude/rules/ presence, 6-step process)
- B-0354.2: Execute minimal validation in isolated TS context + focused check (no real Claude spawn)
- B-0354.3: Document findings + file any gap children; update parent B-0329

Each child: one PR, run `bun` checks + build gate, no broad test execution yet.
