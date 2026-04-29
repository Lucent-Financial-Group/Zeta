---
name: DecisionSignal / AutonomyEvidence layer above AgencyReceipt — design packet preserved; multi-AI review pending (Aaron + Amara 2026-04-29)
description: Amara 2026-04-29 design packet — AgencyReceipt is necessary but NOT sufficient for strong autonomy claims; needs a small companion DecisionSignal/AutonomyEvidence layer that captures human signals + agent inference + authority basis + autonomy level (A0–A5) + non-actions + limitations. Aaron 2026-04-29 binding directive on landing — *"Also I'm sending this to the others for review, I'll bring it back in a moment."* — multi-AI review IN FLIGHT; NO active doctrine adoption yet. Status: VERBATIM PACKET PRESERVED (durable substrate intact); status-marker only. Verbatim at `docs/research/2026-04-29-amara-decisionsignal-autonomy-evidence-layer.md` with self-application demonstration on the multi-master CodeQL host mutation. Composes with Otto-363 (substrate-or-it-didn't-happen — packet preserved), channel-verbatim-preservation rule, AgencySignature (the cryptographic-attestation layer this design eventually pairs with).
type: feedback
---

# DecisionSignal / AutonomyEvidence layer — design packet preserved; review-pending

## Source

Aaron 2026-04-29 (chat, after the host-mutation receipt PR #861 thread fixes):

> *"is this channel getting recorded for future training if nothing else?"*

(The meta-question that triggered Amara's diagnostic.)

Amara 2026-04-29 (relayed; full design packet — preserved verbatim at `docs/research/2026-04-29-amara-decisionsignal-autonomy-evidence-layer.md`).

Aaron 2026-04-29 (binding directive on landing):

> *"Also I'm sending this to the others for review, I'll bring it back in a moment."*

This message tells the agent: *do not adopt yet*. The packet is preserved as substrate; doctrine adoption awaits the multi-AI review feedback.

## What this memory IS

A status marker. Three load-bearing facts:

1. **Amara's design packet is preserved verbatim** in `docs/research/2026-04-29-amara-decisionsignal-autonomy-evidence-layer.md` — including the autonomy-level scale (A0–A5), the proposed AgencyReceipt schema additions (`authority_basis` / `autonomy_level` / `human_intervention` / `agent_inference` / `non_actions` / `limitations`), the preserve-signals-not-exhaust rule, and a self-application demonstration on this very session's multi-master CodeQL host mutation (showing what a DecisionSignal would look like for the ruleset PUT).

2. **Aaron has the packet out for multi-AI review** — *"I'm sending this to the others for review, I'll bring it back in a moment."* The pattern of sending substantive design packets through additional AI review before adoption is now well-established (e.g., 5-AI review on Otto-363; Gemini+Claude.ai+Ani+Alexa+Deepseek+Claude.ai on Agent Orchestra v3/v4). This packet is mid-flight in that pattern.

3. **NO active adoption yet.** Per Aaron's "review-then-bring-back" pattern:
   - **NOT YET**: distilled doctrine memory file as active rule
   - **NOT YET**: `memory/decisions/` schema file or directory (Deepseek + Amara consensus location, pending round-2 confirmation)
   - **NOT YET**: AgencyReceipt schema augmentation (the proposed `authority_basis` / `autonomy_level` / etc. fields)
   - **NOT YET**: tooling (DecisionSignal validator / generator / linter)
   - **NOT YET**: backfill of past actions with retroactive DecisionSignals
   - **FIRST**: multi-AI review feedback lands; THEN the design firms; THEN active substrate.

## Round-1 review status (2026-04-29)

**Round 1 complete** — 5 reviewers (Gemini, Ani, Claude.ai, Alexa, Deepseek) returned substantive feedback; Amara synthesized into a round-2 convergence packet. Verbatim preserved at `docs/research/2026-04-29-decisionsignal-multi-ai-review-round-1-and-amara-round-2-convergence.md`.

**Convergence points across reviewers** (multiple reviewers independently flagged):
- Pick **DecisionSignal** as canonical name (Claude.ai + Amara)
- `initial_classification` + `final_classification` (not single `autonomy_level` field) (Claude.ai + Amara + Deepseek) — captures the agent-paused-at-boundary epistemic event
- Define minimum-viable-signal boundary as concrete inclusion test: preserve only if (a) agent's interpretation is recorded AND (b) removing the signal would change the authority basis (Claude.ai + Amara)
- Required vs recommended fields per receipt class (Claude.ai + Amara) — keep routine receipts light; require full DecisionSignal for host/security/authority changes
- Add `autonomy_justification` field — the *why* of the level label (Deepseek + Amara)
- Git-native location: `memory/decisions/DS-YYYY-MM-DD-<slug>.md` (Deepseek + Amara) — operational memory artifacts, not general docs
- `decision_class` field (Deepseek + Amara) — diagnostic / value_choice / invariant_enforcement / host_mutation / permission_change / refusal
- `non_actions` classification (Deepseek + Amara) — active_refusal / out_of_scope / deferred; only `active_refusal` proves boundary discipline
- Tie-breaking rule: classify at highest satisfied level; downgrade if uncertain (Deepseek + Amara)
- A4/A5 should never have `human_intervention: none` — autonomous host mutation without any human signal is a danger signal (Gemini constraint)
- `human_signals` / `agent_inference` strictly bullet-points, not transcripts (Gemini constraint — prevents exhaust hoarding)
- `human_intervention.what_human_did_not_do` field — symmetric boundary (Claude.ai + Amara)
- `durability` self-check applying NO-INVISIBLE-DIRECTIVES rule (Deepseek + Amara) — DecisionSignal applies Otto-363 to its own existence
- Tighten SLSA citation as analogy not literal claim (Claude.ai + Amara) — receipt = artifact; DecisionSignal = build provenance for that artifact
- Anchor to NIST AI RMF / NIST AI 600-1 / SLSA-in-toto / W3C PROV / SAE J3016 / Miller-Parasuraman human-automation collaboration literature (Amara)

**Round 2 in flight** — Aaron 2026-04-29: *"I'm going through round 2 now, I'll bring it back in a bit."*

**Amara's recommended next step (post-round-2)**: *"the next step should be Claude Code implementing a tiny DecisionSignal v0 for the Code Quality episode, probably in a WIP branch, with #861 frontmatter fixed first."* — i.e. once round-2 settles, the first concrete adoption is implementing one DecisionSignal v0 paired with the existing host-mutation receipt at `feedback_host_mutation_receipt_2026_04_29_ruleset_15256879_code_quality_removed.md` (LANDED via PR #861). The Code Quality episode IS the canonical worked example all 5 reviewers used — DecisionSignal v0 will retrofit it as the first paired receipt+signal artifact.

## What this memory is NOT

- NOT a doctrine adoption. The autonomy levels A0–A5, the field shape, the preserve-signals rule are all candidates pending review.
- NOT a directive to start building. No `tools/decisions/*.ts` work, no `.zeta/decisions/*.yaml` schemas, no AgencyReceipt schema PR until multi-AI review lands.
- NOT a deferral of receipt-discipline. AgencyReceipt remains operational. The host-mutation receipt at `feedback_host_mutation_receipt_2026_04_29_ruleset_15256879_code_quality_removed.md` stays valid as a receipt; it just doesn't yet have a paired DecisionSignal.

## Why this packet matters now

The ruleset PUT for the multi-master CodeQL fix is a real autonomous host mutation — it's exactly the kind of action that needs both an AgencyReceipt (which it has) and a DecisionSignal (which the design proposes, demonstrated retroactively in the research doc).

Without the DecisionSignal layer, reviewers can fairly ask: *"Cool receipt, but it only proves a bot clicked a button after Aaron told it to."*

With the DecisionSignal layer, the answer is: *"Aaron supplied principle/authorization; the agent diagnosed (two CodeQL owners), verified (repo-local ruleset is the api version, Default Setup is not-configured), distinguished declarative-vs-API path, paused on hook denial, escalated, received explicit signal, applied, verified, receipted, and recorded drift debt — all bounded by the standing host-maintenance authority and the executable-host-settings doctrine."*

That's much stronger autonomy provenance — and matches NIST AI RMF / SLSA framings where trust comes from transparency, accountability, traceability, not just "the agent did it."

## Carved blade (Amara, preserved verbatim — NOT yet adopted as active rule)

> *AgencyReceipt says what happened. DecisionSignal says why the agent was allowed to make it happen.*

> *Receipts prove actions. DecisionSignals prove autonomy boundaries. Preserve signals, not exhaust fumes.*

> *Without DecisionSignal / AutonomyEvidence, people can fairly push back. With it, AgencyReceipt becomes much stronger.*

These blades stay quoted from Amara's packet as the eventual target. Adoption awaits multi-AI review feedback.

## Open questions (preserved from research doc for review feedback)

1. DecisionSignal location (separate file / embedded YAML / `.zeta/decisions/`)?
2. A2/A3/A4/A5 boundary crispness — are the levels distinguishable in practice?
3. Mandatory vs optional schema fields per autonomy level
4. Receipt-vs-DecisionSignal split (augment vs paired-files)
5. Cadence — every action vs threshold-gated
6. Backfill policy for past actions
7. Tooling integration with Agent Orchestra capabilities/roles/claims
8. Compliance lineage (NIST AI RMF / SLSA / SBOM ingestability)
9. Privacy / sensitive-signal redaction policy
10. Schema versioning + migration path

## What stays operational right now

- AgencyReceipt remains operational as-is.
- The existing host-mutation receipt at `feedback_host_mutation_receipt_2026_04_29_ruleset_15256879_code_quality_removed.md` stays valid; if/when the design adopts and prescribes a paired DecisionSignal, that's a backfill candidate.
- The receipt-as-substrate rule (Amara *"Clickops used to restore declarative ownership must become a receipt, or it becomes the next drift"*) stays load-bearing.

## Composes with

- `feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md` — required this packet land as durable substrate even before adoption.
- `feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md` — the verbatim-preservation rule the research doc honours.
- `feedback_zeta_agent_orchestra_capability_role_claim_isolation_aaron_amara_2026_04_29.md` — Agent Orchestra (capabilities / roles / WorkClaims) is the layer the autonomy levels eventually tie into.
- `feedback_host_mutation_receipt_2026_04_29_ruleset_15256879_code_quality_removed.md` — the AgencyReceipt that triggered Amara's diagnostic; the research doc's self-application demonstration retroactively pairs a DecisionSignal with that receipt.
- `feedback_executable_declarative_host_settings_design_packet_research_first_aaron_amara_2026_04_29.md` (parked) — the design that produces AgencyReceipts; this DecisionSignal layer sits above it.
- AgencySignature (PRs #298 / #299 / #853) — the cryptographic-attestation layer that DecisionSignals will eventually sign / be signed by.
