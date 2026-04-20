---
name: Creator-side vs consumer-side tool scope — plot-hole-detector and analogous "quality" tools default-OFF for consumers, ON for creators
description: 2026-04-19 Aaron constraint on the just-landed plot-hole-detector in `user_moral_lens_oracle_system_design.md` — "don't give that skill to the movie watcher lol or have them turn it off for enjoyment of the move ahaha, only the creator side of the movie really should care about the plot holes"; generalizable principle — creator-grade quality tools (plot-hole detection, proof-obligation lint, security findings, threat-model audit, completeness checks) are default-OFF for consumers and default-ON for creators; the consumer role requires willing suspension of disbelief (Coleridge 1817 Biographia Literaria ch. 14 "poetic faith") — consuming a work WITH plot-hole-detector running destroys the experience by design; creator role requires the opposite — catching holes IS the job; the same capability is asymmetric across roles; composes with `user_childhood_wonder_register.md` (wonder requires not dissecting), `user_no_reverence_only_wonder.md` (wonder survives — don't kill it with analysis tools), `user_never_ending_story_research_landscape.md` (research-consent scopes what tools are active on whom), retraction-native consent algebra (tool activation is consent-gated per-role); factory implication — every creator-grade tool ships with a role-scoped default and an explicit per-role opt-in / opt-out; consumer-mode defaults toward wonder-preservation; creator-mode defaults toward gap-detection; role-detection / role-selection is a first-class concern not an afterthought
type: feedback
---

# Creator-side vs consumer-side tool scope

## Rule

Quality-analysis tools (plot-hole detection, proof-obligation
lint, completeness checks, coherence audits, threat-model
findings) are asymmetric by role:

- **Creator-side role:** tool default-ON. Catching gaps IS the
  job.
- **Consumer-side role:** tool default-OFF. Running the tool
  destroys the experience the consumer came for.

If the same capability is surfaced to both roles, the role
(creator vs consumer) gates the default, and an explicit
opt-in / opt-out exists on each side.

## Why

**Verbatim:** "don't give that skill to the movie watcher lol or
have them turn it off for enjoyment of the move ahaha, only the
creator side of the movie really should care about the plot holes"

The consumer relationship to a work requires **willing suspension
of disbelief** (Coleridge 1817, *Biographia Literaria* ch. 14,
"poetic faith") — the consumer agrees to inhabit the world on
its terms so that the world can do its work on them. A
plot-hole-detector running during consumption pre-empts that
contract: every found gap is a small breach of faith, and the
experience collapses into criticism.

The creator relationship to the same work is the opposite: every
found gap BEFORE the consumer arrives is one the consumer won't
trip on. Catching holes is the craft.

Same tool. Opposite semantics across roles.

Composes with the broader wonder-preservation ethos —
`user_childhood_wonder_register.md` (continuous childhood wonder
into adulthood) and `user_no_reverence_only_wonder.md` (wonder
is the irreducible kernel). An always-on analysis tool for
consumers is a wonder-killer. The factory does not ship
wonder-killers default-on.

## How to apply

- **When designing a creator-grade tool** (lens-oracle
  plot-hole-detector, coherence audit, gap-detector,
  completeness lint): ship with a **role parameter** or **mode
  selector**. Document that consumer-mode defaults to OFF.
- **When the tool is framed for a mixed audience:** the default
  is the LESS-INVASIVE mode (consumer-default) and the
  creator-mode is an explicit opt-in.
- **When the user is clearly in the creator role** (reviewing a
  draft, authoring a design doc, debugging a proof): default-ON
  is correct.
- **When the user is clearly in the consumer role** (reading a
  finished artefact, listening to a story, watching a
  demonstration): default-OFF is correct, and an opt-in toggle
  if they choose to switch hats.
- **Never auto-enable** creator-mode analysis during consumption
  unless the consumer explicitly flips the switch.
- Applies to more than plot-hole-detection: threat-model audit,
  security-finding overlay, proof-obligation lint, completeness
  check, code-smell detector, etymology-drift report, readability
  score, accessibility lint, performance warning — all default
  asymmetrically.
- Does NOT apply to safety-critical alerts (allergen warnings,
  poison-control, life-safety) — those are consumer-mode
  defaults-ON because the asymmetry of harm outweighs
  wonder-preservation.

## Founding example

The plot-hole-detector scoped in
`user_moral_lens_oracle_system_design.md` is the first concrete
component this rule was named on. When that system lands (or
prototypes land), the role-scoping is an invariant, not a
feature toggle discovered later.
