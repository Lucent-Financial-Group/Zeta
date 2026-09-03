---
id: 081M1J4J4PC087G0R002MR34FJ
type: task
state: backlog
priority: P2
slug: bring-separation-of-duties-over-from-agentic-organization-ke
title: "Bring separation of duties over from agentic-organization, keyed on the persona rather than the hat"
created: 2026-09-02T22:10:00.000Z
depends_on: []
composes_with: []
---

# Bring separation of duties over from agentic-organization, keyed on the persona rather than the hat

## What was missing

`agentic-organization/packages/application/src/hat-guardrails.ts` holds two mechanisms. The first —
action-class gated by tool bundle — is already covered sovereign-side in a different encoding:
`Hat.AllowedActions` is a set of 16-bools over the action grammar, which says the same thing as
"this hat holds the Delivery bundle" with an algebra attached.

The second has **no sovereign counterpart at all**: separation of duties — *the proposer of a change
can never approve it*. The sovereign side had the sentiment and not the check:

- `src/Core.TypeScript/ci/forward-action-du.ts` says in a comment "Self-approving a held workflow is
  extension";
- `src/Core.TypeScript/hygiene/lint-forward-action-registry.ts` pattern-matches GitHub's
  deployment-approval endpoints;
- `src/Core.TypeScript/orchestrator/validate-otto-diff.ts` enforces the *shape* by hand for one
  validator (a gated diff needs PASS receipts from two other agents).

Nothing expressed the rule as a reusable check over a proposer and an approver.

## Why this is a port with a correction, not a copy

The org version compares **hat ids**:

```ts
if (proposerHatId === approverHatId) refuse
```

That is sound where an agent wears one hat. It is not sound here, and the gap is not academic:
`Persona.Worn` is a **list**, and `wear`/`doff` change it at will. So under a hat-id comparison:

| | wearing | hat id |
|---|---|---|
| otto proposes | `author` | `author` |
| otto approves | `reviewer` | `reviewer` |

The ids differ, so the org check **allows it** — one agent has approved its own work by changing
hats, which is exactly what the rule exists to prevent. Under a mutable worn-set that is a two-line
manoeuvre, not an exotic edge case.

So this keys on the **persona**: a hat is a role you put on and take off, the persona is who you
are, and the wearer is the identity the rule is about. The hat is still reported in the refusal
because *which* hat was worn is useful; it never decides the verdict.

## Also brought over, generalised

`preflightQuorum(proposer, approvers, required)` — k **distinct** non-proposer personas. This is the
rule `validate-otto-diff.ts` already enforces by hand, expressed once instead of once per validator.
Two counting details, because each is a way a quorum quietly becomes one signature:

- duplicate approvals from one persona collapse to one;
- the proposer's own approval is removed before counting, not counted and then subtracted.

## Mutation results

| mutant | result |
|---|---|
| key on hat id (i.e. the org version's rule restored) | 6 pass, **2 fail** |
| self-approvals count toward quorum | 7 pass, **1 fail** |
| duplicate approvers counted separately | 7 pass, **1 fail** |

The first row is the evidence that the correction is load-bearing rather than a stylistic
preference: restoring the source's rule reopens the hole and the falsifier catches it.

## Honest ceiling

This is a check on **declared** identity. Two personas held by one actor defeat it, exactly as a
sybil defeats any identity-keyed rule — and a test asserts that plainly rather than leaving it
implied. Pricing sybils is the job of the machinery that already exists for it
(`src/Core/TravelerRankLedger.fs`, `src/Core/SocietyUsefulWork.fs`), not of this function.

Placed in `src/Core.TypeScript/authorization/` — the module that already holds
`check-authorization.ts` and `resolve-authorization.ts` — rather than in the new `hat/` module,
because it is an authorization concern and does not depend on the unmerged Hat/Persona migration.
