---
id: 081M1SND350087G0R000DMD2QS
type: task
state: in-progress
priority: P2
slug: xor-of-blockcas-payload-is-not-readable
title: "XOR of BlockCas payload is not readable"
created: 2026-09-05T20:50:00.000Z
depends_on: []
composes_with:
  - 081M1SK0NXF087G0R002N0DCM0
---

# XOR of BlockCas payload is not readable

POSIX XOR of object files is landed. Default freeze stores CAS on
`BlockCas`. DST `XorLastPayloadByteAll` flips the last byte of every
published payload in place. `isReadable` must fail.

Falsifier: freeze A on `createManualWithBlockStore`; XOR CAS payloads;
A is not readable. Recovery stays `toy`.
