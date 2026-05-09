---
id: B-0364
priority: P1
status: open
title: "Policy relocation semantic preservation — FsCheck property for mobile DBSP query boundaries"
effort: M
created: 2026-05-09
last_updated: 2026-05-09
depends_on: []
classification: buildable-now
decomposition: atomic
owners: [architect]
type: feature
tags: [dbsp, caspaxos, policy, relocation, fscheck, formal-verification]
---

# B-0364 — Policy relocation semantic preservation

## What

Write one FsCheck property that demonstrates policy relocation:
a reactive query (DBSP circuit) that runs locally, gets moved
to central execution, and produces the same delta output via
DBSP reintegration.

This is the concrete proof that the mobile policy boundary
preserves semantics — the claim that distinguishes Zeta's
design from classical BFT (which assumes fixed agreement
protocols).

## The claim being proven

> Our policy boundaries are DBSP reactive queries that can be
> relocated between local and central execution, with changes
> reintegrated via the retraction-native delta algebra.

The FsCheck property: for any input delta stream S, running
query Q locally on S produces the same output as running Q
centrally on S, up to reintegration via the DBSP algebra.

## Decomposition (Confucius-unroll)

One primitive: policy-as-DBSP-query.
One formal shape: circuit equivalence under relocation.
One falsifiable property: local(Q, S) = central(Q, S) after
reintegration.

## Acceptance criteria

- [ ] FsCheck property in tests/Tests.FSharp/Properties/
- [ ] Property covers at least one non-trivial query (join or
      aggregate, not just map)
- [ ] Property passes with 1000+ generated inputs
- [ ] Adversarial review (shadow catch #30 protocol): is the
      property trivially true by definition?

## Composes with

- B-0357 (Z3 proof replacement — same proof-quality axis)
- B-0360 (DBSP identity continuity)
- B-0361 (anchor to human lineage — CSP trace equivalence)
- Confucius-unroll discipline (one primitive, one shape, one property)
- Framing discipline (different capability, not "ahead of")
