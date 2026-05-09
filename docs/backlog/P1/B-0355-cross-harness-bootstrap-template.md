---
id: B-0355
priority: P1
status: open
title: "Cross-harness bootstrap template (AGENTS.md, CODEX.md, CURSOR.md)"
created: 2026-05-09
last_updated: 2026-05-09
depends_on:
  - B-0354
decomposition: atomic
classification: blocked
type: friction-reducer
owners: [architect]
parent: B-0329
---

# B-0355 — Cross-harness bootstrap template

## What

Create a bootstrap-process template that other AI harnesses
can follow. The pattern from B-0353 (CLAUDE.md as process)
generalizes to:

- **AGENTS.md** — universal onboarding (already exists,
  may need process-ification)
- **CODEX.md** — OpenAI Codex / GPT harness bootstrap
- **CURSOR.md** — Cursor IDE harness bootstrap
- **KIRO.md** — Amazon Kiro harness bootstrap (per B-0325)

Each harness file follows the same orient → refresh → pick →
build → ship process but with harness-specific tooling
references (e.g., Cursor uses different skill-loading
mechanisms than Claude Code).

## Why

The process-as-bootstrap pattern transfers across harnesses.
A Codex instance and a Claude instance running the same process
produce equivalent behavior — the rules emerge from the walk,
not from memorizing harness-specific doctrine.

## Acceptance criteria

1. Template document created at `docs/BOOTSTRAP-TEMPLATE.md`
   (or equivalent location).
2. At least one non-CLAUDE harness file updated or created following
   the template — use `.codex/AGENTS.md` for the Codex harness (the
   active Codex bootstrap location per `AGENTS.md`), `CURSOR.md` for
   Cursor, etc.
3. Template documents which steps are universal vs
   harness-specific.
4. Build gate passes.

## Effort

S — template + one instance, ~2 hours.
