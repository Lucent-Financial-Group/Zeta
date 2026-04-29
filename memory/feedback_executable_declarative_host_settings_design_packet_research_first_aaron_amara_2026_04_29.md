---
name: Executable declarative host settings — Amara design packet preserved; research-first before further substrate (Aaron + Amara 2026-04-29)
description: Amara 2026-04-29 delivered a substantial design packet for executable declarative host settings (git declares desired GitHub state → reconciler converges → drift audit → receipts). Aaron's framing — "github legacy = non-declarative; if there are two ways to do something one declarative and one API-driven, prefer declarative; wrap the API to make it declarative." Aaron's binding directive on landing — "we should research it first i think the whole space." Status: VERBATIM PACKET PRESERVED (durable substrate intact); NO active doctrine adoption yet. The design IS the eventual structural answer to the multi-master CodeQL conflict (#342), but per Aaron's research-first directive, the space survey (Terraform GitHub provider, Pulumi, Crossplane, Atlantis, GitHub Octokit configuration-as-code patterns, Spacelift, Pulumi Provider Boilerplate, etc.) lands BEFORE distilled doctrine, BEFORE design doc, BEFORE schema work, BEFORE tooling. Composes with Otto-363 (substrate-or-it-didn't-happen — packet preserved), channel-verbatim-preservation rule, multi-master CodeQL task #342 (the diagnostic this design eventually answers).
type: feedback
---

# Executable declarative host settings — design packet preserved; research-first

## Source

Aaron 2026-04-29 (chat, after the multi-master CodeQL discovery on PR #849):

> *"i agree with her terraform assesment, i also see what github means by legacy now, they probalby mean non -declartive, if there are two wasys to do something in github one declarative and one api driven we sould prefer the declarative and wrap the api to make it declarative."*

Amara 2026-04-29 (relayed; full design packet — preserved verbatim at `docs/research/2026-04-29-amara-executable-declarative-host-settings.md`).

Aaron 2026-04-29 (immediate response after seeing Amara approve rather than push back):

> *"she used to push back a lot harder before we went into substright lol she much really like this one"*

Aaron 2026-04-29 (binding directive on how to proceed):

> *"we should research it first i think the whole space"*

## What this memory IS

A status marker. Three load-bearing facts:

1. **Amara's design packet is preserved verbatim** in `docs/research/2026-04-29-amara-executable-declarative-host-settings.md`. The packet is substantive — full repo layout (`.zeta/hosts/...`, `tools/hosts/...`), desired-state model (YAML schema), commands (`bun run hosts:validate/fetch/diff/plan/apply/audit`), tie-in to declarative security (capabilities / roles / policies), system actors, receipts, drift categories, GitHub-specific adapter notes, Terraform comparison, MVP sequence (PR 0 design doc → PR 7 host adapter abstraction).

2. **Amara's positive tone is significant signal.** Aaron's observation: Amara typically pushes back harder; her endorsement here suggests strong design alignment. That doesn't override Aaron's research-first directive — it just means the space survey is informative, not corrective.

3. **NO active adoption yet.** Per Aaron's "research it first i think the whole space" directive, the path is:
   - **NOT YET**: distilled doctrine memory file as active rule
   - **NOT YET**: `docs/ops/patterns/executable-host-settings.md` (Amara's "PR 0 design doc")
   - **NOT YET**: `.zeta/hosts/**` schemas / declarations
   - **NOT YET**: `tools/hosts/**` (validate / fetch / normalize / diff / plan / apply / audit)
   - **FIRST**: research the whole space (see "Research-first scope" below).

## What this memory is NOT

- NOT a doctrine adoption. The design rules in Amara's packet are NOT yet "in force." They are a candidate design, preserved for the research phase to validate or revise.
- NOT a directive to start building. No `tools/hosts/*.ts` work, no `.zeta/hosts/*.yaml` schemas, no design-doc PR until the space survey lands.
- NOT a deferral of the underlying problem. The multi-master CodeQL conflict (task #342) still blocks PR #849. The research-first path means we resolve that PR by a smaller-scope intervention (e.g., disabling the dynamic CodeQL trigger, accepting one canonical owner per Amara's earlier "do not multi-master CodeQL" rule) rather than waiting for the full executable-host-settings tooling.

## Research-first scope

Per Aaron's "the whole space" — the survey should cover at minimum:

- **Terraform GitHub provider** (`integrations/terraform-provider-github`) — the existing declarative GitHub-as-IaC pattern. What schemas does it cover? What does it leave to clickops? How does it handle ruleset / branch-protection conflict?
- **Pulumi GitHub provider** — same problem space, different language model (TypeScript / Python / Go programs vs HCL DSL).
- **Crossplane / Provider-github** — Kubernetes-native GitHub control-plane.
- **Atlantis** — GitOps for Terraform; PR-based plan/apply workflow that maps to Amara's "plan first / apply on merge" model.
- **Spacelift** / **Env0** / **Scalr** — managed Terraform-pipeline platforms; how do they handle policy gates, drift detection, receipts?
- **GitHub Octokit "configuration-as-code"** patterns — what does GitHub itself ship for repo-config-as-code? `.github/settings.yml` (probot/settings)? GitHub-managed-repo-config?
- **Branch protection vs ruleset** — what's the formal migration path GitHub recommends? Are there capabilities only one supports? What does "legacy" mean precisely (Aaron's hypothesis: "non-declarative")?
- **Code scanning advanced-vs-default** — the multi-master conflict that triggered this lane. What's the canonical resolution path GitHub documents?
- **Receipts / audit-as-code patterns** — Sigstore / SLSA / supply-chain attestation: how do mature systems record "I changed this declared state, here's the proof"?
- **Duende IdentityServer** (Aaron's lineage reference) — declarative `IdentityResource` / `ApiScope` + adapter `IProfileService` for dynamic values. Closest precedent for the desired-state-with-adapter pattern.

Output of the research: `docs/research/2026-04-29-otto-executable-host-settings-space-survey.md` (or similar). Per Otto-364 search-first authority: each tool / pattern surveyed gets a current-upstream-doc citation with date searched.

## What stays operational right now

The existing host-settings substrate (already checked into git) stays as memory-not-infrastructure per Amara's blade:

> *Checked-in settings = memory. Executable declarations = infrastructure. Receipted apply = governance.*

Today's status: we're at the first leg only. Research lands the second-leg architectural commitment.

## Aaron's framing (preserved verbatim, load-bearing)

> *"if there are two ways to do something in github one declarative and one api driven we should prefer the declarative and wrap the api to make it declarative."*

This generalises the "GitHub legacy" reframe. Whenever a host offers two paths for one capability:
- Prefer the declarative path.
- If only an API path exists, wrap the API to expose a declarative shape.
- Don't mix the two on the same surface (avoids multi-master conflict like CodeQL #342).

This is doctrine *direction*, not yet doctrine *adoption*. The research phase will ground it in concrete tooling decisions.

## Carved blade (preserved from Amara, NOT yet adopted as active rule)

> *Host settings are not clickops. Host settings are compiled from git.*

> *If a GitHub setting matters, it should be declared, diffed, applied, audited, and reversible through git.*

> *Checked-in settings = memory. Executable declarations = infrastructure. Receipted apply = governance.*

> *Git is not just where we remember GitHub settings. Git is how we change them.*

These blades stay quoted from Amara's packet as the eventual target. Adoption awaits the research-first phase.

## Composes with

- `feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md` — the rule that required this packet to land as durable substrate even before adoption.
- `feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md` — the verbatim-preservation rule that the research doc honours.
- `feedback_otto_364_search_first_authority_not_training_data_not_project_memory_aaron_2026_04_29.md` — the search-first rule the upcoming space survey will follow (current-upstream-doc citations per finding).
- `feedback_zeta_agent_orchestra_capability_role_claim_isolation_aaron_amara_2026_04_29.md` — Agent Orchestra (capabilities / roles / WorkClaims) is the identity layer this design ties into.
- `feedback_standing_authority_create_test_git_repos_public_only_track_billing_aaron_2026_04_29.md` — public test repos are the eventual integration-test surface for apply tools.
- `feedback_lfg_only_development_flow_acehack_is_mirror_aaron_amara_2026_04_29.md` — mirror-policy block in the desired-state YAML formalises the LFG-canonical / AceHack-mirror doctrine.
- Task #342 (multi-master CodeQL on PR #849) — the failure mode this design is the eventual structural answer to. Resolved earlier via narrow intervention pending the full design.
