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
   - **NOT YET**: `.zeta/decisions/` schema file or directory
   - **NOT YET**: AgencyReceipt schema augmentation (the proposed `authority_basis` / `autonomy_level` / etc. fields)
   - **NOT YET**: tooling (DecisionSignal validator / generator / linter)
   - **NOT YET**: backfill of past actions with retroactive DecisionSignals
   - **FIRST**: multi-AI review feedback lands; THEN the design firms; THEN active substrate.

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
