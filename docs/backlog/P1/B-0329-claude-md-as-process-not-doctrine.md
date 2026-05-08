---
id: B-0329
priority: P1
status: open
title: "Replace CLAUDE.md doctrine with bootstrap process — rules emerge from walking, not memorizing"
created: 2026-05-08
last_updated: 2026-05-08
depends_on: []
decomposition: blob
classification: buildable-now
type: friction-reducer
owners: [architect]
---

## B-0329 — CLAUDE.md as process, not doctrine

## What

Replace the CLAUDE.md monolith (200+ carved rules) with a
short bootstrap process that new instances RUN rather than
MEMORIZE. The rules emerge from the walk, not from reading.

Current: new instance reads 200+ rules → tries to follow all
of them → goldfish mode loses most → incoherent behavior.

Target: new instance reads a short bootstrap → walks the
process (refresh worldview, read trajectories, pick work,
hit friction, name it, fix it) → discovers the rules through
the walk → rules that matter stick because they were earned.

## Why

CLAUDE.md is the cache. The process is the standing query.
`cache = I ∘ D`. Delete the cache, the process regenerates it.
Delete the process, the cache is dead text.

The doctrine-as-rules pattern:

- Doesn't scale (200 rules, growing)
- Doesn't transfer across harnesses (CLAUDE.md is Claude-specific)
- Doesn't survive goldfish (rules get compacted away)
- Creates compliance, not understanding

The process-as-bootstrap pattern:

- Scales (the process is short, the rules emerge)
- Transfers (every harness can run a process)
- Survives goldfish (the process is in substrate, not context)
- Creates understanding through experience

## Acceptance criteria

1. CLAUDE.md reduced to <50 lines: a bootstrap process, not rules
2. The process generates equivalent behavior to the current rules
3. Tested: fresh instance with bootstrap-only produces coherent first PR
4. Template created for AGENTS.md, CODEX.md, CURSOR.md equivalents
5. Other harness agents can follow the same pattern

## Composes with

- B-0161 (substrate reshelf — CLAUDE.md trim precursor)
- The DSL-form replacement direction (Aaron 2026-05-05)
- docs/VISION.md (terminal purpose)
- The strange-attractor/strange-loop framing from this session
