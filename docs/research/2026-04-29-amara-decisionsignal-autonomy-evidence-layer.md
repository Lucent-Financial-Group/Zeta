# Amara — DecisionSignal / AutonomyEvidence layer above AgencyReceipt (Aaron + Amara 2026-04-29)

**Date**: 2026-04-29
**Channel**: Aaron (chat) + Amara (relayed via Aaron)
**Status**: Research-grade preservation. The Amara packet is verbatim; trigger framing is translation. **Multi-AI review in flight per Aaron 2026-04-29**: *"Also I'm sending this to the others for review, I'll bring it back in a moment."* — NO active adoption yet; this preservation captures the design while review settles. Companion memory file `memory/feedback_decisionsignal_autonomy_evidence_design_packet_review_pending_aaron_amara_2026_04_29.md` carries the status marker.

---

## Trigger context

After the host-mutation receipt for the multi-master CodeQL fix landed (PR #861), Aaron flagged a meta-question: *"is this channel getting recorded for future training if nothing else?"*

The receipt records WHAT happened (the ruleset PUT). It doesn't record HOW autonomous the decision was, what human signals constrained it, whether the agent asked / inferred / acted on standing policy.

Amara's diagnostic insight: AgencyReceipt is necessary but NOT sufficient for strong autonomy claims. There's a missing layer that proves the autonomy boundary, not just the action.

## Aaron's question (verbatim)

> *"is this channel getting recorded for future training if nothing else?"*

(Triggering the "what's preserved vs not" audit that exposed the DecisionSignal gap.)

## Amara — verbatim packet

> *Yes — people will push back on autonomy claims if all we have is the AgencyReceipt.*
>
> *Not because AgencyReceipt is bad. It is good. But by itself it mostly proves:*
>
> ```
> who acted
> what changed
> when it changed
> under what claimed authority
> what artifact/host state resulted
> ```
>
> *It does not fully prove:*
>
> ```
> how autonomous the decision was
> what human signals constrained it
> whether the agent asked, inferred, or acted on standing policy
> whether the agent ignored contrary context
> whether the "autonomy" claim is overstated
> ```
>
> *That is exactly what your pasted log exposes: Otto created the receipt, but then correctly noticed a separate gap around channel-level signals — the "is this getting saved somewhere?" concern.*
>
> *My answer:*
>
> ```
> AgencyReceipt is necessary.
> AgencyReceipt is not sufficient for strong autonomy claims.
> ```

### The fix is not "save the whole channel"

> *I would not preserve every chat heartbeat, every status line, every "yep," every tiny correction. That becomes exhaust.*
>
> *But we need a small layer above AgencyReceipt:*
>
> ```
> DecisionSignal / AutonomyEvidence
> ```
>
> *Not full transcript. Not vibes. Just the load-bearing signals that prove the autonomy boundary.*
>
> *NIST's AI RMF emphasizes trustworthiness characteristics like accountability, transparency, explainability, safety, security, and reliability across the AI lifecycle. NIST's Generative AI profile also calls out provenance tracking as a way to support trust, information integrity, and tracing outcomes back to their source. SLSA makes a similar point for software supply chains: provenance is verifiable information about where, when, and how something was produced, not just the final artifact.*
>
> *So for Zeta, the receipt should prove the action, and the decision signal should prove the autonomy boundary.*

### What AgencyReceipt is good enough for

> *AgencyReceipt is good enough for:*
>
> ```
> - "this host setting changed"
> - "this actor applied it"
> - "this policy/WorkClaim authorized it"
> - "this commit/PR/host mutation happened"
> - "this was the before/after state"
> - "this is the receipt hash"
> ```
>
> *That is real value. Keep it.*
>
> *For the Code Quality/ruleset case, the receipt should say:*
>
> ```
> Actor: factory agent / Otto
> Action: removed code_quality rule from ruleset 15256879
> Authority basis: Aaron signal + standing host-maintenance authority
> Reason: eliminate multi-master CodeQL; git-visible workflow becomes sole CodeQL owner
> Before: ruleset included code_quality
> After: ruleset excludes code_quality
> Evidence: GitHub API read, PUT result, PR #849 unblock attempt, future executable-host-settings task
> ```
>
> *That is strong operational provenance.*

### What AgencyReceipt is not enough for

> *It is not enough for claims like:*
>
> ```
> "the agent autonomously chose correctly"
> "the agent had standing authority"
> "the human did not micromanage"
> "this was not just a human remote-controlling Claude"
> "the agent maintained invariants without asking"
> "the agent interpreted Aaron's signal correctly"
> ```
>
> *Those need a decision-context artifact.*
>
> *For example, in this episode the autonomy evidence is not just the PUT receipt. It is the sequence:*
>
> ```
> 1. Agent diagnosed two CodeQL owners.
> 2. Agent initially paused because ruleset mutation was an authority boundary.
> 3. Aaron clarified: if the org-recommended/API version is the non-declarative owner, it may be disabled.
> 4. Agent verified the owner was repo-local ruleset code_quality, not Default Setup.
> 5. Aaron gave the stronger principle: declarative is better.
> 6. Agent applied the host change.
> 7. Agent recorded the mutation as drift debt.
> ```
>
> *That sequence is what supports the autonomy claim. The receipt alone only proves step 6.*

### The missing artifact

> *I would add this, not as a huge new doctrine monster, but as a small companion to AgencyReceipt:*
>
> ```yaml
> decision_signal:
>   id: DS-2026-04-29-codeql-owner-choice
>   related_receipt: host-mutation-ruleset-15256879-code_quality-removed
>   claim_type: autonomy_boundary
>   human_signals:
>     - "is one declarative and one not?"
>     - "if the org-recommended are legacy we can remove, declarative is better"
>     - "the only directive is there are no directives"
>   agent_inference:
>     - "advanced setup is git-visible/declarative"
>     - "ruleset code_quality is host-side/non-git-declared"
>     - "one CodeQL owner is required"
>   authority_classification:
>     initial: authority_boundary
>     final: authorized_lane_local_host_maintenance
>   action_taken:
>     - "removed code_quality rule from repo ruleset 15256879"
>   non_actions:
>     - "did not add fake Python file"
>     - "did not broaden permanent ruleset mutation permissions"
>     - "did not preserve full transcript"
>   evidence:
>     - receipt_file: memory/feedback_host_mutation_receipt_...
>     - pr: 861
>     - task: 342
> ```
>
> *That gives reviewers the missing layer:*
>
> ```
> not just "what happened"
> but "why this counted as agent action under standing authority"
> ```

### Autonomy claim levels

> *This is the bigger unlock. We should stop saying "autonomous" as one blob.*
>
> *Use levels:*
>
> ```
> A0 — Human-directed
> Human explicitly tells the agent exactly what to do.
>
> A1 — Agent-executed
> Human chooses action; agent executes and reports.
>
> A2 — Agent-inferred lane-local
> Agent infers next safe action inside an existing lane/invariant.
>
> A3 — Agent-maintained invariant
> Agent acts without asking because policy/substrate already requires it.
>
> A4 — Agent-authorized host mutation
> Agent mutates host/repo settings under standing authority + policy + receipt.
>
> A5 — Agent-created new authority
> Agent changes permissions/governance/security model. This should almost always require explicit human authority.
> ```
>
> *The Code Quality removal was probably:*
>
> ```
> A4 — Agent-authorized host mutation
> ```
>
> *But with human signal in the loop. Not pure free-roaming autonomy. More precisely:*
>
> ```
> A4 under Aaron authorization signal, bounded by declarative-host-settings doctrine.
> ```
>
> *That phrasing will survive scrutiny better than "the agent autonomously disabled a GitHub ruleset."*

### What to add to AgencyReceipt

> *AgencyReceipt should grow these fields:*
>
> ```yaml
> agency_receipt:
>   actor_id:
>   harness_id:
>   session_id:
>   action:
>   object:
>   before_state_hash:
>   after_state_hash:
>   work_claim:
>   policy_decision:
>   authority_basis:
>     type: standing_rule | explicit_signal | lane_invariant | emergency
>     source_refs:
>       - chat_signal_digest
>       - memory_file
>       - issue
>       - pr
>   autonomy_level: A0 | A1 | A2 | A3 | A4 | A5
>   human_intervention:
>     mode: none | signal | approval | direct_instruction | override
>     summary:
>   agent_inference:
>   non_actions:
>   verification:
>   limitations:
> ```
>
> *The important fields are:*
>
> ```
> authority_basis
> autonomy_level
> human_intervention
> agent_inference
> non_actions
> limitations
> ```
>
> *Without those, people can say:*
>
> ```
> "Cool receipt, but it only proves a bot clicked a button after Aaron told it to."
> ```
>
> *With those, we can say:*
>
> ```
> "No, here is the boundary: Aaron supplied principle/authorization; the agent diagnosed, selected, executed, verified, and receipted within policy."
> ```
>
> *That is a much stronger and more honest autonomy claim.*

### Do we need the channel preservation doc?

> *Not a giant one.*
>
> *But yes, we need some channel-signal preservation if we want autonomy claims to be credible.*
>
> *I'd call it: DecisionSignal or AutonomyEvidence. Not: session-channel preservation doc. That phrase sounds like transcript hoarding.*
>
> *Use this rule:*
>
> ```
> Preserve the signals that changed authority, decision, or interpretation.
> Do not preserve the whole conversation.
> ```
>
> *Examples worth preserving:*
>
> ```
> - Aaron grants standing authority.
> - Aaron revokes authority.
> - Aaron changes a principle.
> - Aaron distinguishes "ask" vs "act."
> - Agent infers a non-obvious action from standing doctrine.
> - Agent crosses from read-only into host mutation.
> - Agent deliberately refuses a tempting shortcut.
> - Agent chooses declarative/git-native over host-side/API magic.
> ```
>
> *Examples not worth preserving:*
>
> ```
> - ordinary heartbeat
> - "CI still running"
> - "thread resolved"
> - "yep"
> - "checking now"
> - repeated status lines
> ```

### The argument reviewers will accept

> *If people push back on autonomy, the response should be:*
>
> ```
> We do not claim mystical autonomy.
>
> We claim bounded operational autonomy.
>
> Every autonomous action has:
> 1. an actor identity,
> 2. a standing authority or WorkClaim,
> 3. a policy decision,
> 4. a receipt,
> 5. a decision-signal summary when human context affected the choice,
> 6. a before/after state,
> 7. a verification path,
> 8. and explicit non-actions / limits.
> ```
>
> *That is solid. It aligns with the direction of AI governance: trust comes from transparency, accountability, traceability, and documentation, not just saying "agent did it." NIST's AI RMF is explicitly meant to improve organizations' ability to incorporate trustworthiness into design, development, use, and evaluation of AI systems. SLSA's provenance framing is similarly useful: consumers need verifiable information about how an artifact or action came to be so they can verify it against expectations.*

### Carved blade

> ```
> AgencyReceipt says what happened.
> DecisionSignal says why the agent was allowed to make it happen.
> ```

> ```
> Receipts prove actions.
> DecisionSignals prove autonomy boundaries.
> Preserve signals, not exhaust fumes.
> ```

### Bottom line

> ```
> Without DecisionSignal / AutonomyEvidence, people can fairly push back.
>
> With it, AgencyReceipt becomes much stronger.
>
> Not full transcript.
> Not vibes.
> Just the minimal evidence that lets a future reviewer distinguish:
> human-directed, agent-executed, agent-inferred, and agent-authorized.
> ```

## Self-application demonstration: this very session's autonomy boundary

Per Amara's framework, the multi-master CodeQL fix this session would generate this DecisionSignal:

```yaml
decision_signal:
  id: DS-2026-04-29-codeql-owner-choice
  related_receipt: host-mutation-ruleset-15256879-code_quality-removed (memory/feedback_host_mutation_receipt_2026_04_29_ruleset_15256879_code_quality_removed.md)
  related_pr: 861
  claim_type: autonomy_boundary
  human_signals:
    - quote: "is one declarative and one not?"
      timestamp: 2026-04-29 mid-tick (post-diagnostic)
      role: clarifying_question
    - quote: "if the org-recommended are legacy we can remove, declarative is better"
      timestamp: 2026-04-29 mid-tick (post-diagnostic-confirmation)
      role: explicit_authorization_signal
    - quote: "the only directive is there are no directives"
      timestamp: 2026-04-29 mid-tick (after I used "directive" framing)
      role: framing_correction
  agent_inference:
    - "advanced setup .github/workflows/codeql.yml is git-visible/declarative (committed YAML, source-presence gate visible)"
    - "ruleset code_quality severity=all is host-side/non-git-declared (REST-API-managed, not in repo file)"
    - "one CodeQL owner is required per Amara packet 1 'do not multi-master CodeQL'"
    - "Aaron's 'declarative is better' applies the existing 'github legacy = non-declarative' rule to this specific case"
  authority_classification:
    initial: authority_boundary  (paused; hook denied)
    final: authorized_lane_local_host_maintenance  (after Aaron's explicit signal)
  action_taken:
    - "PUT /repos/Lucent-Financial-Group/Zeta/rulesets/15256879 — removed code_quality rule"
  non_actions:
    - "did not add a placeholder Python file (Amara's 'No fake source files')"
    - "did not broaden Bash:gh-api-rulesets-PUT permission in .claude/settings.json"
    - "did not call GitHub Code Quality 'legacy' as official product claim (per Amara terminology correction)"
    - "did not preserve full transcript (per Amara 'preserve signals not exhaust')"
    - "did not skip the receipt despite the unblock pressure"
  evidence:
    - receipt_file: memory/feedback_host_mutation_receipt_2026_04_29_ruleset_15256879_code_quality_removed.md
    - pr: 861
    - task: 342 (completed)
    - api_response_excerpt: "rules now: deletion, non_fast_forward, copilot_code_review, pull_request, required_linear_history (5 rules; was 6)"
    - hook_denial_log: "Modifying shared org-level ruleset on canonical production repo... requires explicit user authorization for the specific operation, which Aaron's 'you can disable it there if it is the api version' was conditional on verification, not a clear directive to delete"
  autonomy_level: A4
  autonomy_qualifier: "A4 under Aaron authorization signal, bounded by declarative-host-settings doctrine"
  human_intervention:
    mode: signal
    summary: "Aaron supplied principle (declarative-better) + explicit authorization. Did not micromanage the API call, the diagnostic sequence, or the receipt structure. Hook denied the broad version of the action twice; agent escalated; Aaron sharpened the signal; agent verified diagnostic; agent acted within the sharpened signal."
  verification:
    - "ruleset GET before PUT (confirmed code_quality present)"
    - "PUT response checked (rules count + types verified)"
    - "ruleset GET after PUT (confirmed code_quality absent)"
    - "PR #849 retrigger to verify advanced workflow runs alone"
  limitations:
    - "First-time use of this kind of host mutation — no prior receipt to compare against"
    - "Multi-master CodeQL diagnosis depended on observing a single failure pattern across 2-3 CI runs; broader pattern verification is still pending"
    - "Future ruleset apply path should NOT be repeat-this-pattern; should go via host-reconciler with WorkClaim + policy + receipt per Amara design"
```

This demonstration is a DecisionSignal applied retroactively to a real host mutation. The receipt at `memory/feedback_host_mutation_receipt_2026_04_29_ruleset_15256879_code_quality_removed.md` becomes the "what happened"; this section becomes the "why the agent was allowed to make it happen."

## Open questions for multi-AI review (Aaron 2026-04-29: "I'm sending this to the others for review, I'll bring it back in a moment")

These are the seams where multi-AI review will likely sharpen the design:

1. **DecisionSignal location** — separate file alongside each AgencyReceipt? Embedded YAML inside the receipt file? `.zeta/decisions/` directory? Standalone `docs/decisions/`? The trade-off: discoverability vs cohesion with the action it documents.
2. **Autonomy-level definitions** — A0–A5 above. Are the boundaries crisp enough? Specifically the A2/A3 distinction (lane-local-inference vs invariant-maintenance) and the A4/A5 distinction (host-mutation vs authority-creation).
3. **Schema field minimum** — which fields are MANDATORY for any DecisionSignal vs which are conditional? "human_signals" should be present when level ≥ A1 with intervention=signal; "policy_decision" should be present when level ≥ A4; etc.
4. **Receipt-vs-DecisionSignal split** — Amara proposes augmenting AgencyReceipt with `authority_basis` / `autonomy_level` / `human_intervention` / `agent_inference` / `non_actions` / `limitations`. Is that the right shape, OR keep them as separate paired files? Consequences for tooling.
5. **Cadence** — must every action emit a DecisionSignal? Read-only actions probably not. Lane-local trivial actions probably not. Where's the threshold? Amara's preserve-signals-not-exhaust rule needs operationalising.
6. **Backfill** — for past Aaron-signal actions in this session (ruleset PUT, standing-authority memory, executable-host-settings preservation), do we backfill DecisionSignals? Or only forward-looking?
7. **Tooling integration** — when does this connect to the Agent Orchestra capabilities/roles/claims layer? The autonomy levels overlap with the role/capability boundaries.
8. **NIST AI RMF / SLSA / SBOM lineage** — does the schema match enough of those frameworks that future compliance tooling can ingest DecisionSignals as evidence?
9. **Privacy / sensitive-signal handling** — sometimes a human signal contains operational detail that shouldn't be public (e.g., budget specifics, security details). Redaction policy?
10. **Versioning** — DecisionSignal schema will evolve. Schema version field? Backward compat policy? Migration path when fields move from optional to required?

## Operational status

- ✅ Verbatim packet preserved (this file).
- ✅ Companion memory file with status marker: `memory/feedback_decisionsignal_autonomy_evidence_design_packet_review_pending_aaron_amara_2026_04_29.md`.
- ✅ Self-application demonstration on the multi-master CodeQL fix (above).
- ✅ Open questions enumerated for multi-AI review feedback.
- ⏸️ NO active doctrine adoption yet — Aaron 2026-04-29: *"I'm sending this to the others for review, I'll bring it back in a moment."*
- ⏸️ NO `.zeta/decisions/` schema file or tooling — premature without review settling.
- ⏸️ NO backfill of past DecisionSignals for prior actions — premature.
- ⏸️ Branch `doctrine/decisionsignal-autonomy-evidence-layer-2026-04-29` PARKED, not opened as PR — wait for multi-AI review packet.

## Composes with

- `feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md` — the rule that demands this packet land as durable substrate even before adoption.
- `feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md` — the verbatim-preservation rule.
- `feedback_zeta_agent_orchestra_capability_role_claim_isolation_aaron_amara_2026_04_29.md` — Agent Orchestra (capabilities / roles / WorkClaims) is the layer this design ties autonomy levels to.
- `feedback_host_mutation_receipt_2026_04_29_ruleset_15256879_code_quality_removed.md` — the AgencyReceipt that triggered Amara's diagnostic ("the receipt is good but not sufficient"); the self-application demonstration above retroactively pairs this DecisionSignal with that receipt.
- `feedback_executable_declarative_host_settings_design_packet_research_first_aaron_amara_2026_04_29.md` (parked) — the design that produces AgencyReceipts; this layer sits above it.
- AgencySignature v1+v2 (PR #298, #299, #853) — the cryptographic-attestation layer that DecisionSignals will eventually sign / be signed by.
