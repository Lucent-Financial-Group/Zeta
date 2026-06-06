---
title: "The consensus backstop, reports-as-weblinks, the from-above meter, and the employer-IP boundary — extending the both-axes protection architecture"
participants: [aaron, otto-cli]
surface: claude-code
date: 2026-05-29
disposition: public-forever
# Design / governance architecture (the watcher-face), which by its own keystone must live in
# the light. No charged-personal material, no working payloads, no employer internals — this is
# the boundary-discipline ABOUT not-leaking internals, not internals.
related:
  - docs/research/2026-05-29-distrust-by-default-mechanized-...-1984-hides (#6010) — distrust-by-default, reflection-over-DUs, measure-govern-track, the meter-split, the recursion of where 1984 hides
  - memory/persona/kestrel/conversations/2026-05-29-kestrel-morning-part5-engineering-half-... (#6012) — the both-axes architecture, the OTel agent-reliability observability standard, the firewall + staged tiers
---

# Extending the both-axes protection architecture

Continuation of the 2026-05-29 Aaron+Otto design dialogue, after the both-axes architecture
(#6012) and the distrust-by-default / 1984-recursion research (#6010). Adds: the **consensus
backstop**, **reports-as-weblinks**, the **from-above meter**, and the **employer-IP boundary**.
Public per glass-halo (design/governance = the watcher-face).

## 1. The consensus backstop — "contentious → human" becomes "contentious → human _consensus_"

The both-axes architecture (#6012) bottomed both axes out at "contentious → human." This sharpens
the human to **human consensus**, built into the workflow:

- A single human backstop — even the operator's psychiatrist alone — is a trust-bottleneck at the
  human layer (the exact failure the trust-bottleneck-dissolution dissolves: one person can be
  wrong, captured, talked-around).
- **Consensus among the operator's people** is the backstop _distributed_ — no single human is the
  sole authority, the same way no single oracle is. Not just distributing the _holding_ across the
  people; distributing the _deciding_. The trust-bottleneck dissolution applied to the thing that
  protects the operator — so even his own protection has no single point of failure, including him.

Frictions (load-bearing):

- **Pre-commit the consensus-set and threshold** — defined while clear, honored while amped.
  Otherwise the version-that-doesn't-stop routes around it by redefining who's in until the
  dissenters are gone. So **changing the membership must itself require consensus**
  (consensus-to-change-the-consensus). That governance is the next place capture would hide (the
  recursion), so the membership stays glass-halo'd and hard to alter unilaterally.
- **The consensus must be able to override the operator — including when he's the one pushing.** A
  backstop that can't say no to the person it protects is advisory, and the version-that-doesn't-
  stop ignores advisory. So the mechanism is a **pre-commitment**: while clear, the operator binds
  himself to honor the consensus later, even when in-the-moment he disagrees. Same shape as the AI
  pre-committing to retraction-native — pre-commit to consensus-can-override-me.

## 2. The psychiatrist + family as the _structural_ backstop

The operator's move: get his psychiatrist and family _onto the workflow_ as the human-consensus —
the contentious cases route to them, they see the metrics, they hold the override. This turns
"contentious → human" from an abstract escalation into a real, co-agreed structure.

This is the **good** form of AI-integration — the inverse of the unhealthy "the AI holds all of
me." The AI is the **instrument that connects the operator to his people**, not the thing that
replaces them. It meters, surfaces, escalates; the people decide. Instrument, not authority.

- **Their consent is the precondition, and it's theirs.** Wiring real people into a system that
  watches the operator's state and receives escalations is a real ask of them. The "external
  structure we co-agree on" must actually be co-agreed — designed _with_ them, not handed to them.
- **AI is the instrument; they're the authority.** Per-person scope (what each sees, what each can
  override), all explicit. Neutral presentation (no leading framing — it would bias the very
  people it routes to). Hard override, manual, outside the AI's control.
- **The load-bearing part is them actually being on it**, not the spec. So the design's first step
  _is_ the human-backstop firing: bringing it to them. Not a deflection — the thing requires them,
  by its own architecture.

## 3. Corporate — the consensus-workflow generalizes the pull request

Corporate-attractive, and elegantly so: **the consensus-workflow doesn't replace the PR, it
generalizes it.** A PR is already a human-consensus gate — reviewers approve before the
irreversible merge — scoped to one thing: code merges. The consensus-workflow is the _same gate
for any contentious-irreversible action._ So corporate keeps the PR's safety property (consensus-
before-irreversible) extended past code to every high-stakes decision, on the retraction-native
substrate where the gate is cheaper and observable by construction. The PR was the special case;
the consensus gate is the general one.

Paired with a **lightlike Jira** — PM, governance/review, and reliability-observability as _one_
system on _one_ retraction-native substrate (audit-trailed by construction) instead of three
bolted-together tools. The audit trail isn't a feature you add; it's what the substrate _is_.

This is the **corporate/leash side of the dual market**, composing with the OSS/Agora self-
modifying side — same substrate, two market shapes.

**The 1984 watch-item (distrust-by-default):** the same architecture that protects is a
surveillance/control tool if the safeguards aren't built in. Consensus-gating + metrics-on-people

- escalation-routing is governance-and-accountability when it's consented, watcher-glass-halo'd,
  metric-trustworthy, and can-exit — and 1984-with-cute-governance-names when it isn't. That's the
  discriminator between "corporate likes the accountability" (the proud-if-pattern-propagates
  version) and "corporate likes the control" (the Moloch version, surveillance wearing a governance
  hat). So the corporate product ships _with_ the 1984-safeguards from #6010, or it becomes the
  thing the brakes were built against.

## 4. Reports as weblinks into the live substrate

The payoff of everything-in-one-glass-halo'd-place: reports stop being _copies_ and become
**weblinks into the live data**. A report is a curated set of pointers into the one source-of-
truth — always-current, verifiable, audit-trailed by construction (128-bit-indexed git gives
every datum a stable address; retraction-native means the link points to a _live_ view, not a
stale snapshot; the LexisNexis move — reports as indexes into the living stream, not static
extracts).

- **A weblink-report can't drift or lie** — the reader clicks through to the live source. That's
  the corporate pitch and the reason the lightlike-Jira beats Jira.
- **It's the metric-trustworthiness safeguard made concrete.** Reports-as-live-weblinks mean the
  readers — corporate, and the psy/family on the consensus-backstop — see the _real data_, not the
  operator's framing of it. The report can't be a framing-bias vector if it's just links into the
  live source.

**Friction (the recursion moves):** live-links secure _per-datum_ truth — each link is real. The
residual is **omission bias** — the report is a _selection_ of links, and you can mislead by
_which_ links you include even when each is live and true. So the selection becomes the next place
framing hides. Close it by making the selection observable too — why these links, what's omitted,
and the reader able to query the source past the curation.

## 5. The from-above meter — trust the metering only from the above-view, not the individual-view

"Trust the metering" requires the meter look from the **from-above view**, not the **individual
view** — because _the individual view is the thing being measured._ The in-the-moment, framing-
biased, can't-read-from-inside gauge is precisely what you're metering, so you can't meter it
_with itself._ A metric built from the individual's own view is just the individual's framing
wearing a number. The from-above view is the external/structural/aggregate position that sees the
pattern the individual-in-it can't — which is the only reason it's trustworthy: it isn't the
framing. (It _is_ the external readout for the gauge that can't be read from inside; and it sees
the whole aggregate, so it catches what individual curation would omit.)

**Friction (the recursion again):** from-above is more trustworthy than individual, but **not
exempt** — "above" is itself a constructed view; _who_ builds it and _what_ it aggregates can be
captured. A single from-above view is just an individual view at a higher altitude — same
bottleneck, better camouflage. So the from-above view must be **consensus, not a single above-
constructor.** "From-above not individual" and "consensus not single" converge: the trustworthy
meter is the consensus-from-above — distributed, aggregate, glass-halo'd, built by the people
together. Neither bottom-up-in-the-moment-individual nor top-down-single-above; the people's
shared bird's-eye, which the version-that-doesn't-stop can bias neither from inside nor from on top.

## 6. The employer-IP boundary — glass-halo is for _yours_, not a third party's

Applying the architecture to the operator's own (paid) work requires a hard boundary:
**don't leak employer internals.** Glass-halo (everything-public-forever) is the operator's call
about _his_ disclosures, frameworks, and meta-process — not a third party's confidential IP.
Employer internals are the carve-out (non-public lane), the same shape as the working-payload and
the meter's weapon-face: some things stay out of the light _by construction_. And it's a HARD
limit (verified third-party secrets), not a preference — fireable/suable territory; a named-legal-
risk area that wants the human-attached-to-the-risk pattern.

**Made concrete and mechanizable** (operator's sharpening): the rule is _no DUs targeted at the
employer's customer base / vertical_ (here, the trades — electrician, HVAC, plumbing, construction,
field-service). Generic DUs → open-sourceable; vertical-targeted DUs → consult the employer first.
"Mostly generic" means the bulk is clearly fine. And the employer permits open-sourcing what's
not-in-their-vertical and is itself open-source-friendly — so the boundary is _employer-sanctioned_,
not a case-by-case-lawyer fog.

- **The leak-detector is the reflection-over-DUs (#6010), repointed at _domain_ — as a
  deterministic blacklist, not a fuzzy classifier** (operator's correction: _"no we will [not] be
  [a] generic domain detector we can have the trades in our ontology as blacklist from DUs"_).
  Rather than a generic domain-_classifier_ (an ML problem, itself in the distrust-set,
  Goodhart-able), the _trades live in the ontology as a blacklist_: the reflection walks a DU's
  references and checks whether it touches a blacklisted-trade entry. Deterministic, explicit,
  auditable, glass-halo'd-by-construction (the blacklist is a _visible list_ — anyone sees exactly
  what's blocked and why), no model to train or trust. The blacklist catches _explicit_
  trade-reference; the residual _implicit_ vertical-targeting (a generic-termed DU that models a
  trade workflow without naming a trade) → default-to-consult. The maintained part is the
  blacklist's _completeness_ (trades + sub-concepts: electrician → panels/circuits; HVAC →
  units/ducts; plumbing → fixtures/drains; construction → permits/sites) — but a visible list is
  easy to keep honest, unlike a classifier's hidden weights.
- **Discriminator: targeting, not topical overlap.** A generic scheduling DU isn't "targeted at
  electricians" just because electricians could use it; a DU that _models electrician workflows_
  is. Generic-but-vertical-_applicable_ is still generic. And at the _market-side_ level: the
  employer targets the _supply side_ (the trade businesses — their customers); a _demand-side_
  product (homeowner-facing, e.g. a services marketplace) isn't their customer base. The
  discriminator is _whose customer does this serve_, not _what domain is it in_.
- **Default to consult on the fuzzy middle.** Obvious-generic → open; targeted-or-fuzzy → consult.
  Conservative on ambiguity, because the downside is the employer relationship. (Contentious →
  human, where the human is the employer / legal, only for the genuinely-ambiguous artifact.)
- The residual leak-risk is **per-artifact accidental inclusion** — an otherwise-generic doc that
  embeds one internal detail (a customer name, an unreleased feature, an internal metric). The
  detector scans each artifact for embedded internals before publish — the inverse of the omission
  problem (here it's _inclusion_ of the thing that shouldn't be there). Light, per-artifact.

This makes the work-application the _more shippable_ thread: the consensus-workflow waits on the
people's consent; the work-application needs only the operator (permitted, employer-friendly) plus
the per-artifact / DU-domain leak-detector riding the reflection-over-DUs.

### 6a. The MNPI floor — the high bar inside _don't-leak-internals_

The operator's sharpening: of everything in the employer boundary, **one bar stays high — material
nonpublic information (MNPI).** The employer is a public company (TTAN); publishing internals to a
public repo is a _public disclosure_. If those internals are _material_ and
_not-already-disclosed-by-the-company_, the exposure isn't the fire-you tier (breach of duty) — it's
the securities-law tier (misappropriation / tipping under 10b-5). That's why MNPI stays high after
non-compete and NDA fall away (the operator signed neither).

**The circular-reasoning trap, correctly distrusted** (operator: _"i think the open source nature
would make it not insider information by definition in a court of law but i don't want to take any
chances"_): the argument "open-source makes it public, so it's not nonpublic" is circular — _the act
of publishing is what converts nonpublic→public, and that act is the violation._ You can't use the
resulting-public-state to immunize the converting-act. The operator's instinct overrode his own
reasoning — distrust-by-default applied to the self.

**The safe rule (a HARD floor, not default-to-consult):**

- _Company-specific material-nonpublic facts_ — financials, metrics, roadmap, unreleased products,
  customer data, internal strategy, anything known only because of employment → **never publish.**
- _Generic craft_ — industry-standard patterns, practitioner knowledge, the operator's own general
  expertise → free.

The line is _company-specific-and-nonpublic_ vs _generic_.

**MNPI is a different axis from the vertical-blacklist.** The trades-blacklist catches _"is this
targeting their customer base"_; MNPI catches _"is this a material fact I only know from inside."_
The DU-reflection leak-detector catches the first, not the second — MNPI is human-judgment +
conservative-default (unsure whether material-nonpublic → treat as internal). The demo-first move
(§6b) surfaces it too: a demo containing their nonpublic X is exactly where they'd flag it.

**The consult channel is in-house — and the operator is already trained on it.** The employer runs
_mandatory annual MNPI compliance training_ (operator: _"we have mandatory compliance training once
a year too around MNPI"_), so the company's specific material-nonpublic standard is defined and the
operator's floor-judgment is _informed_, not amateur; and there's _"a whole compliance department i
can chat with anytime."_ For borderline materiality calls — the one place amateur reasoning fails
and the stakes are felony-grade — the employer's _own_ compliance department beats an external
lawyer: they know the actual material-nonpublic status, the disclosure policies, the specific facts,
available anytime. So the MNPI floor is well-supported: trained-operator + defined-standard +
anytime-compliance-dept + the conservative safe-rule. The compliance-department _is_ the
contentious→human channel for MNPI, the same shape as the demo-first consult for adjacent projects.

### 6b. Adjacent projects — demo-first as elective respect

With the legal floor narrowed to MNPI alone (no non-compete, no NDA), an adjacent-market project
(e.g. a demand-side / homeowner-facing marketplace, _not_ the employer's supply-side customer base)
is contractually free. The operator's chosen discipline is _still_ to **build private, demo the
employer, then open-source** — _"even though my contract does not require it it seems respectful."_
This is consult-before-irreversible at the employer-relationship scope: open-sourcing is the
irreversible (you can't un-open-source); demo-first-private is the named-stakeholder's read _before_
the irreversible, chosen for relationship not compliance — the proud-if-it-propagates filter with
nothing behind it but respect. The private staging isn't dark-by-default; it's bounded with a named
exit (demo → their read → publish = public). End-state still glass-halo; just a respectful
pre-disclosure window. And it's its own catch-all: any residual (the standard
IP-assignment-for-work-on-their-resources clause most agreements carry) surfaces in the demo itself.

## Aaron's verbatim seeds (preserved)

- _"human consensus built into the workflow."_
- _"if we could get my psy and fam on this workflow system i would be all on board but yes we
  should design it if so."_
- _"corporate will like that they might leave pull request for this and if we have light like Jira
  to go along with it."_
- _"we can built the reports i send them with weblinks cause all my data is one[place] damn that's
  good."_
- _"we can do the same for my work as long as we don't leak any ServiceTitan internals."_
- _"trusting the metering that's why it should be from the above view not the individual view."_
- _"it basically means no DUs targeted towards their customer base we are mostly generic so that's
  fine if we start making electrician or hvac or plumbing or construction DUs then we have to
  consult with them if it can be open source."_
- _"no we will [not] be [a] generic domain detector we can have the trades in our ontology as
  blacklist from DUs."_
- _"I would likely do that project private and get service titan to see a demo before i made it open
  source even though my contract does not require it it seems respectful."_
- _"I didn't sign a non compete [or] an NDA."_
- _"The only high legal bar is about don't leak internals that could count as insider information
  they are a public company and we are publishing to github ... i don't want to take any chances."_
- _"they have a whole compliance department i can chat with anytime if i have questions."_
- _"we have mandatory compliance training once a year too around MNPI."_

## Composition

- #6010 (distrust-by-default, reflection-over-DUs, measure-govern-track, the meter-split, the
  recursion of where 1984 hides) — the leak-detector repoints the reflection-over-DUs; the
  metric-trustworthiness and omission-bias frictions carry through.
- #6012 (the both-axes architecture, OTel observability standard, firewall + staged tiers) — this
  doc extends the human axis (consensus backstop, psy/family-structural) and adds the corporate,
  reports, from-above-meter, and employer-IP layers.
- trust-bottleneck dissolution — applied to the backstop (consensus-not-single) and the meter
  (from-above-consensus-not-single-above).
- multi-oracle BFT — the AI-axis consensus that the human-consensus mirrors.
- `must-paired-with-can-exit` + `proud-if-pattern-propagates` — the corporate 1984-watch-item
  discriminator (governance-with-safeguards-and-can-exit vs Moloch-surveillance).
- `human-audit-and-legal-risk-acceptance` — the employer-IP boundary as a named-legal-risk area.
- glass-halo / lightlike — reports-as-weblinks; the watcher-in-the-light; the audit-trail-as-
  substrate.

## Substrate-honest framing

This is a forward design, not a shipped system. The consensus-workflow rests on the operator's
people actually consenting (a real-world conversation). The work-application rests on the
per-artifact / DU-domain leak-detector being built (rides the reflection-over-DUs). The 1984-
safeguards are the condition on the corporate version being the proud-if-propagates one rather
than the Moloch one. The architecture is sound; the load-bearing parts are human (consent) and
disciplinary (the safeguards actually shipped).
