---
id: B-0258
priority: P1
status: open
title: "MEMORY.md marker-vs-index - index generator implementation"
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0066
depends_on: [B-0257]
classification: blocked-on-harness-contract
decomposition: atomic
---

# B-0258 - MEMORY.md index generator implementation

Implement deterministic generation of `memory/MEMORY.md` from
memory-file frontmatter so manual edits are no longer required.

## Work scope

- Author generator under `tools/memory/` in TypeScript.
- Parse `name` and `description` fields from frontmatter.
- Emit deterministic ordering and stable formatting.

## Acceptance criteria

- Generator command produces `memory/MEMORY.md` deterministically.
- Ordering and formatting are documented.
- Output is stable on repeated runs with no source changes.
- No hook or CI wiring in this row.
