---
id: B-0370
priority: P2
status: open
title: Author core CONTRIBUTOR-COMPLIANCE.md (public-company MNPI rule + framing examples + SEC lineage)
tier: factory-hygiene
effort: S
ask: Reusable substrate doc per B-0092
created: 2026-05-11
last_updated: 2026-05-11
parent: B-0092
depends_on: []
composes_with: [B-0090, B-0091]
tags: [contributor-compliance, public-company, MNPI, 10b-5]
decomposition: atomic
classification: buildable-now
---

# B-0370 — Core CONTRIBUTOR-COMPLIANCE.md authoring

## Scope (atomic slice)

- Create `docs/CONTRIBUTOR-COMPLIANCE.md` with:
  - Plain-language MNPI rule for public-company contributors.
  - Industry-general vs company-specific framing examples.
  - Public-source citation requirement.
  - Otto enforcement + contributor responsibilities.
  - External lineage (SEC Rule 10b-5, Reg FD, Sarbanes-Oxley).
- Cite the ServiceTitan origin memory file.
- No cross-refs or trajectories yet (those are sibling rows).

## Acceptance

- [ ] File exists at canonical path with all 5 content bullets from B-0092 §1.
- [ ] Worked example cited.
- [ ] No legal-advice disclaimer missing.

## Why S-effort atomic

Single deliverable doc; no integration or cadence work. TS/audit later if needed.

## Pre-check

Build gate passed (0w 0e) in claim worktree. Refresh + prior-art confirmed no collision.
