---
id: B-0276
priority: P1
status: open
title: "Structure recognizer — fingerprint library for codebase shapes"
created: 2026-05-08
last_updated: 2026-05-08
parent: B-0240
depends_on: []
classification: buildable-now
decomposition: atomic
owners: [architect, formal-verification-expert]
---

# B-0276 — Fingerprint library

Define structure fingerprints for common codebase shapes
(operator algebra, state machine, pipeline, pub/sub).
F# types + pattern-matching functions.

## Acceptance criteria

- Types at src/Core/StructureFingerprint.fs
- At least 5 fingerprint patterns defined
- Tests verifying pattern recognition
