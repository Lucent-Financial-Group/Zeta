---
id: B-0309
priority: P0
status: open
title: "Mechanical authorization check — CLAUDE.md discoverable-skill pointer"
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0160
depends_on: [B-0305]
classification: blocked
decomposition: atomic
owners: [architect]
type: friction-reducer
tags: [documentation, mechanical-check, claude-md]
---

# B-0309 — CLAUDE.md discoverable-skill pointer

## What

Add a CLAUDE.md bullet that makes the mechanical-authorization-
check skill discoverable at wake-time. Per the wake-time-substrate-
or-it-didn't-land rule, the skill exists but is invisible to cold-
start agents without a CLAUDE.md pointer or a transitive path
from CLAUDE.md.

## Acceptance criteria

1. CLAUDE.md gains a bullet under "Ground rules Claude Code
   honours here" that names the skill, its purpose (disposition-
   independent pace-authorization check at every wake), and the
   carved sentence.
2. The existing CLAUDE.md bullet about "Mechanical authorization
   check" (currently referencing the backlog item B-0160 for
   skill build) is updated to reference the landed skill instead.
3. Doc-only change — no code.
4. The pointer composes with the existing skill-router-as-
   substrate-inventory bullet (the skill is now in the router
   AND in the CLAUDE.md pointer tree).

## Composes with

- B-0160 (parent umbrella)
- B-0305 (skill body this pointer references)
- The wake-time-substrate-or-it-didn't-land CLAUDE.md bullet
- The skill-router-as-substrate-inventory CLAUDE.md bullet
