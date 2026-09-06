---
id: 081M1T9SMM9087G0R002FS29S4
type: task
state: backlog
priority: P2
slug: bloom-vs-anti-bloom-two-grow-only-filters-three-valued-membe
title: "Bloom vs anti-bloom: two grow-only filters, three-valued membership"
created: 2026-09-06T02:47:09.706Z
depends_on: []
composes_with: []
---

# Bloom vs anti-bloom: two grow-only filters, three-valued membership

ZetaDB / Core query membership (join-probe, negative lookup over
Z-set keys). Not ZetaFS: volume identity is ContentId, exact.

Two grow-only Bloom filters: Bloom(I) over ever-inserted keys,
Bloom(D) over ever-deleted keys. Verdict is present / absent /
UNKNOWN. Does not reopen WONT-DO deletable Bloom (Rothenberg 2010):
bits are never deleted; unknown is explicit.

Register: analysis, not a result. CountingBloom stays shipped.

Falsifiers to shed `toy`: measure `fp(I)×fp(D)` against counting
Bloom at equal guarantees; check the unknown region under sustained
retraction churn, including insert-delete-insert resurrection
(grow-only D cannot return `present` after a key has ever been
deleted).
