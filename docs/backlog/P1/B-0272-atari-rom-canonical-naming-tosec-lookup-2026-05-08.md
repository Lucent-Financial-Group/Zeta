---
id: B-0272
priority: P1
status: open
title: "Atari 2600 ROM canonical naming via TOSEC/No-Intro hash lookup"
created: 2026-05-08
last_updated: 2026-05-09
parent: B-0083
depends_on: []
classification: buildable-now
decomposition: atomic
type: friction-reducer
---

# B-0272 — ROM canonical naming

Hash each ROM file, look up in TOSEC/No-Intro DAT files,
rename to canonical form. TS script at tools/roms/.

## Pre-start checklist

- [x] Prior-art search: checked `tools/roms/` (empty), grepped for
  TOSEC/No-Intro/canonicalize across repo (no existing TS tooling),
  read parent B-0083 algorithm section and tooling design.
- [x] Dependency walk: parent B-0083 (decomposed umbrella),
  sibling B-0273 (depends on this item), no other deps.
- [x] Datfile format: Logiqx XML used by both TOSEC and No-Intro;
  `<rom name="..." sha1="..." />` is the match surface.

## Acceptance criteria

- Script at tools/roms/canonicalize.ts
- Renames ROMs to TOSEC canonical names
- Reports unmatched hashes
