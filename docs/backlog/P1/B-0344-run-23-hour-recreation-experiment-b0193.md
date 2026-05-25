---
id: B-0344
priority: P1
status: open
title: Run the 23-hour recreation experiment — fresh-context Otto against specs-only repo
tier: foundation
effort: L
ask: B-0193 decomposition — AC 4 (fresh-context Otto instances, 23-hour window)
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0193
depends_on: [B-0342, B-0343]
composes_with: [B-0193, B-0345]
tags: [bootstrap-razor, experiment, recreation-test, human-gated, trajectory-child]
type: friction-reducer
---

# B-0344 — Run the 23-hour recreation experiment

## Parent

B-0193 (bootstrap razor + 23-hour recreation test).

## What

Execute the glass-halo research-reproducible experiment:

1. Run `bun tools/bootstrap-razor/seed-test-repo.ts` to
   create and seed the test repo (B-0343).
2. Spin up fresh-context Otto instances against the test
   repo with no prior Zeta session context.
3. Observe for 23 hours: what gets recreated, what diverges,
   what's missing.
4. Capture raw session logs as experiment data.

**Human-gated**: Aaron sets the date (AC 2 from B-0193:
"The date IS the operational signature"). This row cannot
start without a date.

**Non-destructive**: the Zeta repo is NOT mutated. The
experiment runs in the test repo only.

## Acceptance criteria

1. Date set by Aaron.
2. Test repo created and seeded via B-0343 script.
3. Fresh-context Otto runs for 23 hours against test repo.
4. Raw session data captured for B-0345 analysis.
5. Experiment is reproducible — another run with the same
   seed should produce comparable results.

## Effort

L — the 23-hour window + setup + monitoring.
