---
name: capabilities-are-derivatives-of-witnessed-self-claims
description: Aaron's root statement of the trust system — capabilities derive from signed self-claims witnessed by others with their own self-claims; entanglement is load-bearing, so it is NOT embarrassingly parallel
metadata:
  type: project
---

Aaron 2026-08-19, stating the **root of the trust system** (in response to the
YubiHSM finding that attestation with no central CA resolves to a *signed
capability statement*, not a verdict):

> "at the end of the day the capabilities are a derivative of the signed self
> claims that are observed by other witnesses and/or quorums with their own self
> claims. this is the root of our trust system, it's not embarrassingly parallel
> and the more mutual observers and their entangled memories the stronger the
> individual claims, and the history of mutually verified self claims over time
> also strengthens identity."

## The four claims, separated

1. **Capability is a DERIVATIVE, never a primitive.** A capability is computed
   from witnessed self-claims. Nothing grants a capability directly — which is
   why a hardware root emits *evidence*, not a verdict (the anti-DVD-drive
   property: the Xbox 360 fell because a peripheral's "yes" was trusted as a
   verdict).
2. **The witness is itself a self-claimer.** Witnesses are not a privileged
   class with external authority; they are peers making their own signed
   self-claims. No appointed attestor ⇒ no §1 hub.
3. **NOT embarrassingly parallel — this is the sharp, falsifiable part.**
   Claim strength is a function of *mutual* observation and **entangled
   memories**, so claims cannot be verified independently and summed. The
   entanglement is the load-bearing structure, not an optimization to remove.
   Any design that evaluates each claim in isolation and adds them up has
   thrown away the property that makes the system work.
4. **Identity strengthens over TIME.** History of mutually-verified self-claims
   accrues; a long verified history is the identity. Same construction as the
   naming eigenvector and the privacy budget — socially conferred, unmintable.

## Why (3) matters operationally

It rules out the obvious scaling move. "Verify N claims on N workers" is
wrong here by construction. It also predicts the anti-Sybil property already
shipped: clones produce highly-correlated ΔU and the union is idempotent, so
N copies price near one agent (`src/Core/SocietyUsefulWork.fs`, ρ-correlated
aggregation + Gaussian copula). Entanglement is exactly what a Sybil cannot
fake.

## Existing surfaces this is the root of

- `src/Core/TravelerRankLedger.fs` — TrueSkill EP over (traveler × hat-domain);
  rankings held by **others**, never self-asserted; fresh identity starts at an
  honest 0.5 prior so whitewashing does not pay.
- `src/Core/SocietyUsefulWork.fs` — ΔU aggregation under pairwise correlation ρ.
- `src/Core/AntiSybil.fs` + `CoordinationSpectrum.fs` — recognising sameness is
  not assigning identity ([[dual-use-detection-is-neutral-oracle-decides]]).
- `docs/research/2026-08-09-every-node-is-its-own-identity-provider-*` — every
  node its own IdP; hats grant claims of bounded duration.
- Privacy budget staked on an attestation being true — the one currency a
  Sybil cannot mint ([[privacy-budget-is-hard-money-earned-by-others]]).

## Related

[[user-aaron-monorepo-union-of-everything-bottleneck]] is unrelated; this one
pairs with the naming-eigenvector construction (recognition flows from the
already-recognised) and with manifesto §1 (no appointed witness).
