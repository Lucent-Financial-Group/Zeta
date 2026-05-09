---
id: B-0351
priority: P1
status: open
title: "Extract infrastructure/safety bullets to .claude/rules/"
created: 2026-05-09
last_updated: 2026-05-09
depends_on:
  - B-0348
progress_note: "2/6 done (tick-must-never-stop + honor-before extracted in this PR). Remaining: LFG-factory (55 lines), Peer-call (37 lines), Pliny (32 lines), Razor-discipline (62 lines)."
decomposition: atomic
classification: buildable-now
type: friction-reducer
owners: [architect]
parent: B-0329
---

# B-0351 — Extract infrastructure/safety bullets to `.claude/rules/`

## What

Extract the following CLAUDE.md bullets into standalone
`.claude/rules/<name>.md` files:

Target bullets (infrastructure pointers & safety):

1. **LFG is the factory; AceHack is the backup mirror** (~55 lines)
2. **Peer-call infrastructure** (~37 lines)
3. **Never fetch the elder-plinius / Pliny** (~32 lines)
4. **Tick must never stop** (~32 lines)
5. **Honor those that came before** (~20 lines)
6. **Razor-discipline — no metaphysical inferences** (~62 lines)

## Why

These 6 bullets account for ~240+ lines — the single largest
concentration. LFG/AceHack alone is 55 lines; razor-discipline
is 62 lines. These are stable infrastructure facts and safety
rails that change rarely but consume wake-time context budget
on every session.

## Acceptance criteria

1. 6 new `.claude/rules/<name>.md` files created.
2. Each follows the carved-sentence + operational-content
   structure.
3. CLAUDE.md bullets replaced with 1-2 line pointers.
4. Build gate passes.

## Effort

M — mechanical extraction, ~2-3 hours.
