---
id: B-0331
priority: P1
status: open
title: Memory ontology/classification audit — reclassify mistyped feedback/project/user/reference files
tier: foundation
effort: M
ask: B-0190 Step 3 decomposition
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0190
depends_on: [B-0330]
composes_with: [B-0190, B-0330, B-0332]
tags: [memory, ontology, classification, audit, trajectory-child]
type: friction-reducer
---

# B-0331 — Memory ontology/classification audit

## Parent

B-0190 Step 3 (memory ontology / classification).

## What

Audit the ~936 memory files against the four-type taxonomy
(`user` / `feedback` / `project` / `reference`) defined in
`memory/README.md` and standardized by B-0330. Many `feedback_*`
files contain content that is actually `project_*` or `user_*`.

1. Build an inventory: count files by prefix vs actual
   content-type.
2. Identify misclassified files (prefix does not match content).
3. Propose renames (batch rename PR, not one-at-a-time).
4. Update MEMORY.md index entries for renamed files.

## Why depends on B-0330

The format standard defines what distinguishes a feedback file
from a project file. Without the standard, reclassification is
subjective.

## Acceptance criteria

1. Inventory report committed (can be a TS tool output or a
   docs/research file).
2. At least the top-20 misclassified files renamed.
3. MEMORY.md index updated for all renames.
4. No broken cross-references after renames (verified by
   `bun tools/hygiene/audit-memory-references.ts --enforce`).

## Why M effort

~936 files to audit; batch tooling needed; MEMORY.md index
updates cascade.

## Prior art

- `memory/README.md` — taxonomy definition.
- `tools/hygiene/audit-memory-references.ts` — reference
  integrity checker (exists).
- `tools/hygiene/audit-memory-index-duplicates.ts` — duplicate
  detector (exists).
