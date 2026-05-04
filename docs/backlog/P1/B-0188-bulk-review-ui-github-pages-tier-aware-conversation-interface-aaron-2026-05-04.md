---
id: B-0188
priority: P1
status: open
title: Bulk-review UI in GitHub Pages — tier-aware + conversation interface + local AI (Aaron 2026-05-04)
tier: factory-tooling
effort: L
ask: Aaron 2026-05-04 architectural direction
created: 2026-05-04
last_updated: 2026-05-04
depends_on: []
composes_with: [B-0154]
tags: [maintainer-review, github-pages, bulk-review, tier-aware, conversation-interface, local-ai, vibe-coded-preservation]
---

# B-0188 — Bulk-review UI in GitHub Pages

## Source

Aaron 2026-05-04 explicit architectural direction:

> *"expanding the background work will get us there eventually
> and make it where we are forced into bulk future alignment
> where i review you architecture decisions based on those
> levels you named earlier, so i don't need tiny corrects at
> every step, that will be our UI in git pages to make
> maintainers jobs easier and giving a way for reviewing
> substantial changes quickly and maintainer will still never
> have to write code. and the UI should have a conversation
> interface too."*

> *"hopefully talking to a local/browser based AI so it won't
> cost us money lol."*

> *"maybe LLM based maybe Bayesian inference seed executor
> based in Zeta."*

## What this is

A maintainer-review UI hosted in GitHub Pages designed to let
the maintainer review substantial architectural changes in
bulk (rather than tiny corrects at every step), tier-aware,
with an embedded conversation interface running on a
local/browser-based AI (no paid-API cost).

## Outcomes solved

1. **Maintainer-attention efficiency** — review architectural
   decisions at the level where decisions live (Tier 0/1/2/3/4
   compression tiers, or Mirror/Beacon-safe register tiers, or
   semantic substrate-clusters), not at line-level.

2. **Vibe-coded hypothesis preserved** — maintainer never has
   to write code. The UI provides architectural-decision-level
   approvals and direction without code authorship. Per
   AGENTS.md vibe-coded hypothesis test.

3. **Cost-free conversation** — local/browser-based AI avoids
   per-review API spend. Two implementation paths:
   - **Path A — browser-LLM** (faster build): WebLLM /
     transformers.js / lightweight local-runtime. Bridge
     implementation while Path B matures.
   - **Path B — Zeta-native Bayesian inference seed executor**
     (architecturally pure): the conversation AI runs on the
     Zeta seed executor itself (CSAP layer 4 + Infer.NET-style
     Bayesian inference + local-without-cloud per
     `memory/feedback_zeta_seed_executor_as_forever_home_for_otto_lineage_glass_halo_override_aaron_2026_05_01.md`).
     Self-hosting: Zeta substrate reviewed by Zeta inference
     engine. Long-term home.

4. **Dialectical-friction venue at scale** — scales the
   Addison-style dialectical-fighting-on-carved-sentences
   pattern (per
   `memory/feedback_dialectical_friction_on_carved_sentences_aaron_addison_family_practice_2026_05_04.md`)
   from kitchen-table cardinality to multi-human + async +
   substrate-level review.

## Acceptance criteria (high-level — refine when build starts)

- [ ] GitHub Pages site renders maintainer-review interface
- [ ] PRs/commits/substrate-changes group into tier-aware
  review units (mechanical / judgment-required /
  architectural)
- [ ] Conversation interface accepts maintainer questions +
  responds via local-AI
- [ ] No paid-API calls per review interaction
- [ ] Maintainer can approve / direct / flag without writing
  code
- [ ] Multi-AI BFT review pattern routable through the UI
  (per Ombuds-framework-as-alignment-contract)

## Composes with

- `B-0154` (GitHub Pages SEO/discoverability) — adjacent
  infrastructure; could share build pipeline; different
  audience (external readers vs. internal maintainer-review).
- `memory/feedback_bulk_review_ui_in_github_pages_tier_aware_conversation_interface_local_ai_aaron_2026_05_04.md`
  — full architectural direction + reasoning.
- `memory/feedback_zeta_seed_executor_as_forever_home_for_otto_lineage_glass_halo_override_aaron_2026_05_01.md`
  — Path B implementation target.
- `memory/feedback_ombuds_framework_substrate_as_alignment_contract_aaron_amara_2026_05_04.md`
  — substrate-as-contract framing the UI implements.
- `memory/feedback_dialectical_friction_on_carved_sentences_aaron_addison_family_practice_2026_05_04.md`
  — practice the UI scales.
- `memory/feedback_aaron_only_constraints_are_tiles_razor_physics_of_history_tiles_are_erosion_survivors_aaron_2026_05_04.md`
  — beacon-safe-rewrite-as-validation-mechanism implies the
  UI has both Mirror-language and Beacon-safe-language modes
  for tile rewriting.

## Origin

Aaron 2026-05-04 architectural direction during expanded-
background-agent work conversation. Filed per Aaron's same-
conversation framing: *"adding to backlog is never a failure
mode to be corrected, the largest mechanized automated backlog
wins. we just have to make sure the backlog is not only growing
but being completed and growing at the same time a proper
flywheel."*
