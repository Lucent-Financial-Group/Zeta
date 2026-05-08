---
id: B-0257
priority: P1
status: open
title: "MEMORY.md marker-vs-index - harness contract verification and evidence"
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0066
depends_on: []
classification: buildable-now
decomposition: atomic
---

# B-0257 - MEMORY.md harness contract verification

Verify how the harness and Q1 AutoDream/AutoMemory actually
consume `memory/MEMORY.md` before any cutover.

## Work scope

- Inspect harness behavior against short marker-only versus
  pre-rendered index content.
- Validate whether write-back behaviors assume specific
  formatting.
- Produce a research note documenting observed behavior,
  assumptions, and explicit constraints for later rows.

## Acceptance criteria

- A research note exists under `docs/research/` with a
  reproducible verification procedure.
- The note states whether marker-only is contract-safe.
- The note states compatibility constraints for Q1 AutoDream/
  AutoMemory.
- No changes to `memory/MEMORY.md` in this row.
