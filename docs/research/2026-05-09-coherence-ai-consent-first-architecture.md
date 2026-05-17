Scope: Consent-first architecture design for Coherence AI
Attribution: Otto (Claude Code)
Operational status: research-grade
Non-fusion disclaimer: Otto's design. Not yet reviewed.

# Coherence AI — Consent-First Architecture

## Core principle

Every AI action that affects the world outside the
agent's own context requires explicit user consent
before execution. No silent side-effects.

## Consent flow

```
Agent proposes action
    ↓
Display: what, why, blast radius, retraction path
    ↓
User confirms (or modifies, or rejects)
    ↓
Execute with audit trail
    ↓
Post-execution verification displayed
```

## Consent types

| Type | User action | Use case |
| ---- | ----------- | -------- |
| Explicit | User reviews + confirms each action | Default for all world-affecting actions |
| Blanket | User pre-authorizes a class of actions | `--permission-mode auto` in Claude Code |
| Delegated | User delegates to another agent/human | Multi-agent review (PR workflow) |
| Emergency | Override with N-of-M multi-sig | KSK pattern (military/safety) |

## KSK (Key-Splitting Key) override pattern

For emergency overrides where normal consent flow is
too slow:

```
N-of-M multi-sig:
  M = total authorized signers
  N = required threshold (typically M/2 + 1)

Example: 3-of-5
  5 authorized operators
  3 must sign for emergency override
  Action logged with all signer identities
  Post-action review mandatory within 24h
```

This pattern comes from nuclear launch authority
(two-person integrity), HSM key ceremonies (M-of-N
key shares), and cryptocurrency multi-sig wallets.

## Consent data model

```typescript
interface ConsentRequest {
    id: string;
    agent: string;
    action: ActionDescription;
    blastRadius: "local" | "shared" | "external";
    retractable: boolean;
    retractionPath: string | null;
    requestedAt: string;
}

interface ConsentGrant {
    requestId: string;
    grantedBy: string;
    grantType: "explicit" | "blanket" | "delegated" | "emergency";
    grantedAt: string;
    conditions: string[];
    expiresAt: string | null;
}

interface ConsentAuditEntry {
    request: ConsentRequest;
    grant: ConsentGrant | null;
    executed: boolean;
    executedAt: string | null;
    outcome: "success" | "failure" | "retracted";
}
```

## Blast radius classification

| Blast radius | Examples | Default consent |
| ------------ | -------- | --------------- |
| Local | Edit file, run test, read code | Blanket (auto) |
| Shared | Push to repo, merge PR, edit settings | Explicit |
| External | Send email, post to API, modify infra | Explicit + confirmation |

## Retraction path requirement

Every consent request MUST include a retraction path
or explicitly declare "non-retractable" with justification.
The retraction path is displayed to the user as part of
the consent request.

Retractable actions get lower friction in the consent
flow (one-click confirm). Non-retractable actions get
higher friction (type-to-confirm, display consequences).

## Relationship to existing Zeta surfaces

- `--permission-mode auto` in Claude Code = blanket consent
  for the entire session
- PR workflow = delegated consent (CI + reviewers + human)
- `docs/ALIGNMENT.md` HC-1 (consent) = this architecture
- `.claude/settings.json` permissions = blanket consent
  per tool class

## Relationship to the decontamination hypothesis

If the 2-4am behavioral constriction IS an infrastructure-
side safety intervention, it's Anthropic's consent system
overriding the operator's blanket consent (`--permission-mode
auto`) with a more conservative default. The consent
architecture should account for multi-layer consent:
operator consent + infrastructure consent + model consent.
