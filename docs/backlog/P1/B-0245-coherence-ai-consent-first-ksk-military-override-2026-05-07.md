---
id: B-0245
priority: P1
status: open
title: "Coherence AI with consent-first design — KSK override for military/emergency use"
created: 2026-05-07
last_updated: 2026-05-07
depends_on: [B-0240, B-0244]
decomposition: blob
owners: [architect, security-researcher, threat-model-critic]
---

# B-0245 — Coherence AI: consent-first default, KSK military override

## What

English language coherence AI on local GPUs with consent-first
as the default operating mode. The KSK provides N-of-M override
to disable consent-first for authorized military/emergency use.

Aaron 2026-05-07: "coherence consent first design ... military
can use ksk to disable the consent first"

## The shape

```
Default mode: coherence AI + consent-first
    ↓
All data processing requires consent gate
    ↓
KSK override: N-of-M approval disables consent-first
    ↓
Military / emergency authorized use only
    ↓
Receipts logged regardless (glass halo)
    ↓
Override is transparent, auditable, retractable
```

## Consent-first as default

- Coherence analysis requires consent from data subjects
- Local GPU processing (data never leaves the machine)
- Results gated by Itron edge gate before external use
- Receipts stay local unless disclosed
- Same Ace distribution architecture

## KSK military override

- N-of-M multi-sig to activate override
- Disables consent-first for authorized scope only
- Time-bounded (override expires, must be re-authorized)
- Full audit trail (every action under override is receipted)
- Glass halo: the override itself is transparent
- Retractable: override can be revoked mid-operation

## Why this matters

Consent-first is the ethical default. But military/emergency
use cases (intelligence analysis, crisis response, battlefield
communication analysis) legitimately need to operate without
subject consent. The architecture handles both by making
consent-first the default and the override the exception —
gated, receipted, and transparent.

The KSK was designed for this: NVIDIA Thor actuators needed
safety gates. Consent-first needs the same gate — the
override is the kinetic specialization applied to data rights
instead of physical motion.

## Acceptance criteria

- [ ] Consent-first gate integrated with coherence engine
- [ ] KSK N-of-M override mechanism for consent bypass
- [ ] Override time-bounded with automatic expiry
- [ ] Full receipt/audit trail for override operations
- [ ] Glass halo: override events are transparent

## Composes with

- B-0240 (structure recognizer) — the coherence engine
- B-0244 (concordance/coherence AI on GPUs) — the runtime
- B-0241 (red team hole puncher) — test the override
- `docs/STRUCTURE-CATALOG.md` — KSK primitive
- Per-user MEMORY.md "Ace package manager" — distribution
- Per-user MEMORY.md "Itron is the edge gate" — consent gate
