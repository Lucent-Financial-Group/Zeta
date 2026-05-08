---
id: B-0343
priority: P1
status: open
title: Test-repo seeding script (TS) — create + seed the recreation experiment repo
tier: foundation
effort: M
ask: B-0193 decomposition — AC 1 (test repo created and seeded)
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0193
depends_on: [B-0341]
composes_with: [B-0193, B-0344]
tags: [bootstrap-razor, tooling, typescript, seeding, trajectory-child]
type: friction-reducer
---

# B-0343 — Test-repo seeding script (TS)

## Parent

B-0193 (bootstrap razor + 23-hour recreation test).

## What

Build a TypeScript script (Rule 0 — no .sh) that:

1. Creates a new repo in LFG or AceHack org via `gh api`.
2. Seeds it with exactly the files listed in the seed
   manifest (B-0341's `SEED-MANIFEST.md`).
3. Commits the seed with a clear provenance message
   linking back to B-0193.
4. Outputs the repo URL for the experiment runner.

**Authorization scope**: LFG or AceHack org only. NOT
ServiceTitan (per Aaron 2026-05-05 explicit).

## Acceptance criteria

1. Script at `tools/bootstrap-razor/seed-test-repo.ts`.
2. Reads seed manifest from
   `docs/bootstrap-razor/SEED-MANIFEST.md`.
3. Idempotent — re-running against an existing repo
   reports status, does not duplicate.
4. Includes `--dry-run` flag that shows what would be
   seeded without creating.

## Effort

M — GitHub API integration + file copying logic.
