---
name: a-rule-without-a-why-is-dogma
description: "Aaron 2026-05-31 meta-principle for rule-authoring: 'i like to make sure my rules are not dogma but have real whys that others can question and agree on if they are the right whys' + 'a rule without a why IS dogma basically.' Every rule MUST carry a real, articulable WHY that is (a) questionable — others can challenge the reasoning — and (b) agreeable — if the why is right, people converge; if wrong, they can dispute it. A why-less rule is dogma by definition. This is the razor/substrate-honest ethos applied to rule-authoring itself; it governs how Otto writes every .claude/rules/ file (whys-first + invite-challenge, never assertion-by-authority)."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

Aaron 2026-05-31, while shaping the BCL-interface-boundary rule:

> *"i like to make sure my rules are not dogma but have real whys that others can
> question and agree on if they are the right whys"*

> *"a rule without a why IS dogma basically"*

## The principle

**A rule without a why is dogma.** Every rule must carry a real, articulable WHY,
and that why must be:

- **Questionable** — stated so others can challenge the *reasoning* (not just the
  conclusion). The why is exposed, not hidden behind authority.
- **Agreeable on the merits** — if the why is correct, people converge on it; if
  it's wrong, they can dispute it and the rule gets revised. Agreement comes from
  the reasoning being right, not from who wrote it.

A rule asserted without its why — "do X because [the rule says so / I said so]" — is
dogma by definition: unchallengeable because there's nothing to challenge.

## Why this matters (the why for the why-rule)

- **It's razor-discipline applied to rules themselves.** `razor-discipline.md` says
  operational claims only — checkable. A rule's why IS the checkable claim; without
  it the rule can't be razored, can't be falsified, can't improve.
- **It composes with no-directives.** `no-directives.md` makes the human an
  accountable peer, not an order-giver; a why-bearing rule is one a peer can agree
  with on reasoning rather than obey. Why-less rules recreate the order-giver shape.
- **It's how rules stay alive.** A rule whose why is exposed gets revised when the
  why turns out wrong (future-self-not-bound). A dogmatic rule ossifies because
  there's no surface to revise against.
- **It enables genuine multi-party agreement** (Knights Guild / multi-oracle): you
  can only ratify a rule you can evaluate, and you can only evaluate a stated why.

## Operational discipline for authoring rules (apply to every `.claude/rules/` file)

1. State the WHY explicitly and prominently — not buried in "Full reasoning" alone,
   but as the load-bearing content. Each clause of the rule gets its why.
2. Make the why **questionable**: phrase the reasoning so a reader can disagree with
   the *logic* (e.g., "BCL is OK to depend on BECAUSE it's platform-vendor-maintained
   with long-term-compat guarantees — a different risk profile than a swappable lib";
   a reader can challenge "is ASP.NET really that tier?" and the discriminator
   answers it).
3. Make it **agreeable**: the why should be one a reasonable peer converges on if
   correct. If you can't articulate a why someone could agree with, the rule may be
   dogma — reconsider it.
4. Invite revision: note that the rule is revisable if the why is shown wrong
   (composes with `future-self-not-bound.md`).

## Empirical anchor + immediate application

Stated while shaping the BCL-interface-boundary rule (hexagonal / own-your-interfaces
— see [[hexagonal-own-interfaces-is-the-io-monad-shape]]). That rule, when landed as
`.claude/rules/`, must be authored whys-first per this principle: every clause (BCL-
ok, wrap-3rd-party, soft-version-provenance-AND-wide-adoption) carries its real,
questionable, agreeable why — e.g. WHY wrap 3rd-party (churn / abandonment /
supply-chain / lock-in; wrapping = swappable + testable + isolated), WHY soft needs
both provenance AND adoption (provenance = supply-chain integrity; adoption =
many-eyes/maintenance/Schelling-point). Not "wrap 3rd-party because the rule says so."

Composes with: `.claude/rules/razor-discipline.md`, `.claude/rules/no-directives.md`,
`.claude/rules/future-self-not-bound.md`, `.claude/rules/god-tier-claims-high-signal-high-suspicion-dont-collapse.md`
(don't-collapse = keep the why open to challenge), and the framework's existing
rule structure (every rule already carries a "Why this rule auto-loads" + "Full
reasoning" — this principle says make those load-bearing + questionable, not pro forma).
