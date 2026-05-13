---
id: B-0261
priority: P1
status: open
title: "MEMORY.md marker-vs-index - Q1 AutoDream/AutoMemory compatibility validation"
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0066
depends_on: [B-0260]
classification: blocked-on-cutover
decomposition: atomic
---

# B-0261 - Q1 AutoDream/AutoMemory compatibility validation

Validate post-cutover behavior for AutoDream/AutoMemory and
codify rollback/repair actions if contract mismatches appear.

## Work scope

- Run post-cutover compatibility checks.
- Validate writes/reads still land on expected surfaces.
- Document rollback/repair procedure.

## Acceptance criteria

- Compatibility result is recorded with pass/fail evidence.
- Any mismatch has explicit rollback or interception plan.
- B-0066 close recommendation is produced only after this row.
