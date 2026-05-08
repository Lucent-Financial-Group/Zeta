---
id: B-0273
priority: P1
status: open
title: "Atari 2600 ROM safe/unsafe folder split for license compliance"
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0083
depends_on: [B-0272]
classification: blocked-on-B-0272
decomposition: atomic
---

# B-0273 — ROM safe/unsafe split

After canonical naming, split ROMs into:

- safe/ (homebrew, public domain, explicitly licensed)
- unsafe/ (commercial, gitignored)

## Acceptance criteria

- safe/ folder not gitignored, checked in
- unsafe/ folder gitignored
- README documents which ROMs are safe to distribute
