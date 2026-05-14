---
id: B-0488
priority: P1
status: in-progress
title: "B-0429.4 — KSK (Kinetic Safeguard Kernel) persona map"
type: planning
origin: B-0429 decomposition (Otto, 2026-05-14)
created: 2026-05-14
last_updated: 2026-05-14
parent: B-0429
depends_on:
  - B-0485
composes_with:
  - B-0429
  - B-0485
  - B-0492
  - B-0493
---

# B-0488 — KSK persona map

## Purpose

Produce the canonical persona map for **KSK (Kinetic Safeguard Kernel)** —
the security-focused substrate product (PR #2892). KSK's personas are
primarily security professionals; the refused-personas list is critical
given the product's attack-surface-adjacent nature.

## Pre-start checklist

Per `.claude/rules/backlog-item-start-gate.md`:

- [ ] Template from B-0485 is closed and available
- [ ] Read PR #2892 (KSK substrate) for product description and intended scope
- [ ] Read PR #2902 (Aaron's grey-hat security expert substrate) — Aaron's
      security persona is the seed for KSK primary persona
- [ ] Walk `composes_with:` chain
- [ ] HARD LIMITS check: KSK's security capabilities create meaningful
      refused-persona requirements (weapons-grade, nation-state APT use)

## Persona hypotheses

| Persona type | Candidate | Source hint |
|---|---|---|
| Primary | Grey-hat / ethical security researcher | PR #2902 + methodology-hard-limits |
| Primary | Security engineer building safeguard layers | PR #2892 product charter |
| Secondary | Enterprise security architect evaluating KSK | PR #2892 |
| Adjacent | Compliance auditor validating safeguard claims | governance substrate |
| Refused | Nation-state APT operator | methodology-hard-limits — HARD LIMIT |
| Refused | Weapons-grade exploit developer | methodology-hard-limits — HARD LIMIT |

## Output

Per-product persona map using template from B-0485:

```
docs/personas/ksk-personas.md
```

With:

- Primary / secondary / adjacent / refused entries (template schema)
- Refused-persona entries citing methodology-hard-limits HARD LIMITS clause
- Security-domain capability fields populated

## Definition of done

- [ ] Template from B-0485 applied
- [ ] Grey-hat / ethical researcher primary persona fully documented
- [ ] At least 2 refused personas with explicit HARD LIMITS rationale
- [ ] Output doc committed at canonical path
- [ ] B-0492 `composes_with:` pointer backfilled
- [ ] B-0488 status set to `closed` with PR link

## Why P1

KSK's dual-use security nature requires explicit refused-persona documentation
before any skill authoring — the HARD LIMITS discipline (`methodology-hard-limits.md`)
mandates this for security products. Unblocks secure skill authoring for KSK.
