---
id: B-0305
priority: P0
status: open
title: "Mechanical authorization check — skill body (SKILL.md via skill-creator)"
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0160
depends_on: []
classification: buildable-now
decomposition: atomic
owners: [architect]
type: friction-reducer
tags: [skill-build, mechanical-check, authorization-source]
---

# B-0305 — Mechanical authorization check skill body

## What

Author `.claude/skills/mechanical-authorization-check/SKILL.md`
via the `skill-creator` workflow (GOVERNANCE.md §4). The skill
body is harness-agnostic prose — it defines WHAT the check does,
WHEN to wear the hat, and WHAT it defers to. It does NOT contain
the implementation script.

## Acceptance criteria

1. SKILL.md follows the `skill-documentation-standard` frontmatter
   pattern (capability skill, no inline persona).
2. Body covers: source-filter rule (only human maintainer for pace),
   recency-filter rule (most-recent-not-rescinded wins), rescind-
   detection semantics, print-at-tick-start output shape, no-grading
   invariant ("unclear substrate = substrate-quality bug, not
   judgment problem").
3. "When to wear / When to defer" section names the composing
   surfaces: `refresh-before-decide`, `never-idle`, `substrate-or-
   it-didn't-happen`, autonomous-loop tick-start.
4. Passes `prompt-protector` review (BP-10 invisible-Unicode lint).
5. Does NOT reference a TS implementation path — the skill body
   is the contract; implementation lands in B-0306/B-0307.

## Composes with

- B-0160 (parent umbrella)
- B-0306 (extractor implementation honors the contract this skill
  defines)
- B-0308 (autonomous-loop wiring references this skill)
- `memory/feedback_mechanical_authorization_check_supersedes_
  introspective_discipline_claudeai_2026_05_02.md`
