---
id: 081M1SPNVHB087G0R003S79W9K
type: task
state: in-progress
priority: P2
slug: xor-of-blockcas-payload-stays-unread-after-clonemedia-reopen
title: "XOR of BlockCas payload stays unread after CloneMedia reopen"
created: 2026-09-05T21:13:00.000Z
depends_on: []
composes_with:
  - 081M1SND350087G0R000DMD2QS
  - 081M1SGZ2ND087G0R000R3YADM
---

# XOR of BlockCas payload stays unread after CloneMedia reopen

Durable garbage is not a power cut, and remain keeps it. XOR CAS
payloads, `CloneMedia` (write-through remain), reopen. `isReadable`
must still fail.

Falsifier: freeze A on `createManualWithBlockStore`; XOR; clone log
and CAS; reopen; A is not readable. Recovery stays `toy`.
