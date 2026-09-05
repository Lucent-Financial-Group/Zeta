---
id: 081M1SK0NXF087G0R002N0DCM0
type: task
state: in-progress
priority: P2
slug: isreadable-re-hashes-stored-leaf-bytes-against-contentid
title: "isReadable re-hashes stored leaf bytes against ContentId"
created: 2026-09-05T20:09:03.151Z
depends_on: []
composes_with:
  - 081M1SGZ2ND087G0R000R3YADM
---

# isReadable re-hashes stored leaf bytes against ContentId

Bad memory can publish garbage under a live key. Existence is not
readable. `isReadable` now reads the stored leaf (POSIX file or
`BlockCas.TryGet`) and checks `ContentHash256.ofBytes` against the id.

Falsifier: freeze A then B; XOR a B-only object file; B is not readable;
A still is. Volume crash recovery stays `toy`.
