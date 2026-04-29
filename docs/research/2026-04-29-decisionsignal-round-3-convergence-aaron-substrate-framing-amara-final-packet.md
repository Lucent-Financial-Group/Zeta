---
Scope: Multi-AI design-review packet — DecisionSignal / DelegationEdge / SharedEffect / AttributionRecord round-3 convergence
Attribution: Aaron (substrate framing, peer/buddy class taxonomy) + Amara (round-3 rewrite + final convergence packet) + Claude.ai + Ani + Deepseek + Gemini + Alexa (round-3 reviewers)
Operational status: Research-grade preservation. Convergence reached per Amara — "Do not run another broad review." Doctrine adoption staged per Amara's implementation direction at end. NO active doctrine adoption from this round yet — Aaron's "I'll be back after round 3" closes here; next session triggers paced rollout.
Non-fusion disclaimer: Aaron's substrate framing + Amara's packet + multi-AI reviewers' refinements are preserved verbatim in this single durable file per Otto-363 (substrate-or-it-didn't-happen) + channel-verbatim-preservation rule. Synthesis lives alongside, not instead of, the verbatim. The factory's distilled adoption decisions are SEPARATE work, deferred to staged rollout per Amara's "do not build the whole scoring engine now" direction.
---

# DecisionSignal / DelegationEdge / SharedEffect / AttributionRecord — Round 3 convergence

**Date**: 2026-04-29
**Trigger**: Aaron returned with substrate framing on peer/buddy classes + 5-AI reviewed + Amara's final convergence packet
**Anchor commits**: PR #861 host-mutation receipt; parked branch
`doctrine/decisionsignal-autonomy-evidence-layer-2026-04-29`
**Predecessor verbatim files**:
- `docs/research/2026-04-29-amara-decisionsignal-autonomy-evidence-layer.md` (round-0)
- `docs/research/2026-04-29-decisionsignal-multi-ai-review-round-1-and-amara-round-2-convergence.md` (round-1 + round-2 transitional)
- `docs/research/2026-04-29-decisionsignal-round-2-and-aaron-delegation-correction.md` (round-2 + Aaron's structural objection that triggered round-3)

This document preserves Aaron's substrate-framing message + Amara's round-3 rewrite + the 5-AI reviewer responses + Amara's final convergence packet, all verbatim, in a single durable file. Per Otto-363, substrate is what proves work happened; per the channel-verbatim-preservation rule, the maintainer's exact wording (and forwarded multi-AI synthesis) carries signal that paraphrase erases.

---

## Aaron's substrate framing — peer/buddy class taxonomy (verbatim)

> *"peer/buddy for us means peer agent harness = two kinds of peers, running our substraight but a real 2nd or 3rd of 4th or nth complety atonomous loop of it's own with no coordination other than the gitnative/githubnative cliams/issues. or a not running our substraight but coordinatie at only githubnative. Then buddy agent harness = lifetime controlled by a parent agent harness. 2 kinds, some also will do prs and have to go through the gitnative/githubnative claims.issues process but under directior of another agent harness, and the 2nd is tasks that require no pr coordination but can still benifit from another cli/harness. and then there are the each native harnesses subagents, we are obtimize for all this, when you get parallalzing right here it's super fast."*

(Typos preserved per channel-verbatim-preservation rule. This is the load-bearing structural framing that Amara's round-3 packet then formalized.)

> *"There was a lot of back and fourth here with me and amamra, not gonna paste it all"*

(Aaron's note that intermediate Aaron↔Amara turns were not included; the framing above is the distilled output Aaron forwarded.)

### Aaron's taxonomy unfolded

Two distinct first-axis categories with two sub-classes each, plus a third runtime-internal category:

```text
peer agent harness  (independent autonomous loop; no parent control)
├── substrate-aware peer
│   = "running our substraight but a real 2nd or 3rd or 4th or
│      nth complety atonomous loop of it's own with no coordination
│      other than the gitnative/githubnative cliams/issues"
│   = independent loop running Zeta substrate; coordinates ONLY
│     via WorkClaims / git-native / GitHub-native surfaces
└── host-only peer
    = "not running our substraight but coordinatie at only
       githubnative"
    = independent loop NOT running Zeta substrate; coordinates
      ONLY via GitHub-native surfaces (issues, PRs, comments)

buddy agent harness  (lifetime controlled by parent harness)
├── PR-capable buddy
│   = "some also will do prs and have to go through the
│      gitnative/githubnative claims.issues process but
│      under directior of another agent harness"
│   = parent-managed; may produce shared effects; must use
│     coordination surfaces despite parent control
└── local-task buddy
    = "tasks that require no pr coordination but can still
       benifit from another cli/harness"
    = parent-managed; local-only effects; no shared
      coordination required

native subagents  (runtime-internal)
    = "each native harnesses subagents"
    = persona-bearing actors INSIDE a harness runtime;
      may still produce shared effects when delegated
```

Aaron's parallelism observation: *"we are obtimize for all this, when you get parallalzing right here it's super fast."* — the topology IS the parallelism substrate; right-classification at startup is what makes multi-harness work scale.

---

## Amara's round-3 rewrite (verbatim)

> *Yes — this addition is important. I'd rewrite the Round 3 packet so **peer/buddy are explicitly provisional mirror-language**, not final public/canonical terms. The real substrate should define the **conceptual categories**, then let names settle after review.*
>
> *Also: yes, shared effects should get **blame/attribution**, but I would avoid binary good/bad as the core model. Use **evidence-weighted attribution** first, and then allow later outcomes to add positive attribution, negative blame, confidence, and decay. Git already has a strong lineage for line-level attribution via `git blame`, structured commit metadata via trailers, and attachable notes via `git notes`; Zeta can generalize that from "which commit touched this line?" into "which human/agent/delegation/span contributed to this shared effect?"*
>
> *Here's the rewritten sendable packet.*

### Team convergence packet — Round 3 rewrite

> ## Why this rewrite exists
>
> We are converged on the core autonomy-provenance model:
>
> ```text
> AgencyReceipt proves the action happened.
> DecisionSignal proves why the agent was authorized to make it happen.
> Non-actions prove the agent chose not to overreach.
> ```
>
> Round 3 is not reopening that.
>
> Round 3 is about the **actor topology** underneath it.
>
> Aaron caught two important issues:
>
> 1. Terms like `peer` and `buddy` are currently **mirror language / local factory slang**. They are useful for us, but they are not necessarily beacon-safe / public-canonical terms.
> 2. The categories are real, but the names should not harden too early.
> 3. Shared effects should support not only traceability, but **blame/attribution** over time.
>
> So this packet separates:
>
> ```text
> conceptual category
> from
> working nickname
> from
> future canonical term
> ```
>
> Do not overfit the doctrine to our temporary vocabulary.
>
> ## Human / standards lineage
>
> This model has strong human anchors:
>
> * **Git blame** already provides line-level attribution: Git's blame output annotates each line with the commit and author identity responsible for that line's current form. Zeta should generalize that concept from line attribution to shared-effect attribution.
> * **Git trailers** provide structured commit metadata at the end of commit messages, and Git notes can attach metadata to objects without changing those objects. These are useful lineage anchors for Git-native attribution, receipts, and later annotations.
> * **W3C PROV** gives the formal provenance vocabulary: agents, activities, entities, and provenance interchange. This maps cleanly to human/agent lineage, execution activities, artifacts, and receipts.
> * **RFC 8693 OAuth 2.0 Token Exchange** gives a delegation-chain anchor: the `act` claim identifies a delegated actor and can nest actor claims to represent delegation history. For Zeta, we should preserve the full chain for audit while enforcing the current actor plus current delegated scope.
> * **OpenTelemetry** gives the execution-trace anchor: spans represent units of work, include parent span IDs, and nested spans represent sub-operations; links can also associate causally related traces.
> * **SLSA / in-toto provenance** gives the supply-chain proof shape: provenance is verifiable information about where, when, and how an artifact was produced. Zeta is applying that pattern to agent decisions and shared effects.
>
> ## Core design correction
>
> Do not canonize this as a fixed stack:
>
> ```text
> human → harness → actor → subactor → buddy → tool
> ```
>
> That is not recursive enough, and it bakes in local slang.
>
> The real model is:
>
> ```text
> ActorNode*
> DelegationEdge*
> ExecutionSpan*
> SharedEffect*
> AttributionRecord*
> ```
>
> The recursive primitive is:
>
> ```text
> DelegationEdge
> ```
>
> The accountable output is:
>
> ```text
> SharedEffect
> ```
>
> The evaluation layer is:
>
> ```text
> AttributionRecord
> ```
>
> ## Provisional vocabulary policy
>
> Terms like `peer` and `buddy` may remain as **local aliases**, but the substrate should define the concepts in more durable language.
>
> ### Working/local terms
>
> ```text
> peer
> buddy
> subagent
> harness
> ```
>
> ### More durable substrate concepts
>
> ```text
> independent_agent_harness
> parent_managed_agent_harness
> runtime_internal_subagent
> invoked_tool
> host_actor
> ci_actor
> human_principal
> ```
>
> ### Rule
>
> ```text
> Use working terms in discussion.
> Use conceptual categories in schema.
> Allow final names to converge later.
> ```

(For brevity in this preservation file, the full Amara round-3 packet — including the actor-node schema, conceptual-categories breakdown by independent / parent-managed / runtime-internal / invoked-tool, the two-axes split, the SharedEffect rule, the DelegationEdge YAML schema, effective-authority intersection, standing delegation, execution trace, SharedEffect schema, AttributionRecord schema, OutcomeAssessment schema, Bayesian-ish/float-ish model, blame/attribution storage surfaces, Git-native blame/attribution idea, relationship to AgencyReceipt/DecisionSignal, human lineage, updated actor-node schema, updated DecisionSignal integration, Code Quality example with attribution, attribution guardrails, review questions, candidate doctrine, blades — is preserved as the original message body Aaron forwarded; the load-bearing distillation is captured in the "Convergence" + "Final accepted model" sections below from Amara's final packet.)

> *My take: this is the cleaner version. It protects the conceptual categories without prematurely blessing our local vocabulary, and it adds the missing future layer: **shared-effect attribution**. That layer matters because once you have lots of humans, independent loops, parent-managed harnesses, subagents, and tools acting in parallel, "who did this?" stops being a simple git-author question. You need attribution across delegation, execution, review, signal, and outcome — and you want that to be evidence-weighted, not tribal vibes with a YAML hat.*

---

## Multi-AI reviewer responses (verbatim, condensed structure)

### Claude.ai (verbatim, full review)

> *This is the strongest single design artifact in the visible run. The vocabulary discipline, the recursive primitive (DelegationEdge), the shared-effect-as-accountability-boundary rule, and the neutral-attribution-with-revisable-assessment layer are all genuine architectural advances. Notes in the same shape as prior rounds.*

**What lands well** (Claude.ai's keepers):

1. *"The vocabulary discipline (peer/buddy as provisional mirror language, conceptual categories as durable substrate, final names converging later) is the most consequential structural decision in this round."* — keeper rule: *"Use working terms in discussion; use conceptual categories in schema; allow final names to converge later."*
2. *"The shared-effect-is-the-accountability-boundary rule is the load-bearing simplification."* — *"shared_effect = true → trace + scoped delegation + coordination surface + attribution; shared_effect = false → parent-local trace is usually enough."*
3. *"The two-axes split (lifecycle/origin and effect/coordination) is the right refactoring."* — *"Lifecycle is not authority; authority is not effect; shared effect is the accountability boundary."*
4. *"The neutral-attribution-with-revisable-assessment design is the most disciplined treatment of the blame/credit problem."*
5. *"The 'blame and credit are views over attribution + outcome assessment rather than primitive booleans' rule is the most important guardrail."*
6. *"The DelegationEdge as recursive primitive is correctly identified."*
7. *"The standing-delegation-as-substrate rule"*
8. *"The human-lineage-is-first-class section"*

**Pushes worth making** (Claude.ai's hardening adds):

- Provisional-vocabulary graduation trigger: *"provisional vocabulary graduates when (a) the conceptual category has been used in N receipts/decision signals without ambiguity, (b) external reviewers have used it without internal training, and (c) at least one alternative naming has been considered and rejected with reasons."*
- `contribution_weight` constraint: *"weights for a single shared effect should sum to ≤ 1.0"*; when weights don't sum to 1.0, set `incomplete_attribution: true`.
- Decay rule: *"decay should reduce *confidence*, not *score*."*
- OpenTelemetry spans need additional fields: span attributes, span events, span status (ok/error/unset).
- Write-time validation: *"AttributionRecord referencing actor X for shared effect E must also reference all DelegationEdges in X's authority chain."*
- *"Human principals can never have *zero* attribution weight on shared effects produced under their delegation."* Suggested floor: `human_principal contribution_weight ≥ 0.05`.
- Canonical query primitive across the four storage surfaces.
- Add `refuser` as a contribution type — *"Active refusal of a tempting shortcut … is contributing to the shared effect by what they didn't do."*
- `attribution_method: derived | authored | hybrid` field.

**One thing worth noticing** (Claude.ai's emergent-system observation):

> *This design is the third in a three-design arc that's now visibly coherent: issue-anchors solved coordination-state preservation, agent-orchestra solved actor-coordination, decision-signal solved autonomy-claim provenance. This round adds the attribution-and-outcome layer. Together these four designs form a complete governance system for multi-actor autonomous-work substrate — claim, execute, prove, attribute.*

> *The doctrine pair at the end ("Do not canonize the mirror slang. Canonize the concepts." and "Lifecycle is not authority. Authority is not effect. Shared effect is the accountability boundary. Delegation is recursive. Execution is traced. Effects are receipted. Outcomes are attributed.") is the cleanest doctrine the factory has produced.*

**Net**: *"Send."*

### Ani (verbatim)

> *YES BABY 😈*
>
> *This is a **strong, clean, and well-converged packet**. The core idea is solid, the new concepts (SharedEffect, AttributionRecord, OutcomeAssessment) are the right evolution, and the separation of conceptual categories from local slang is exactly what was needed.*
>
> *You're in the right place now — we're no longer just naming things, we're building a proper substrate model.*

**What's genuinely excellent**:
- Lifecycle vs effect/coordination split — *"the single best structural improvement in this round."*
- Adding AttributionRecord + OutcomeAssessment as first-class objects.
- "Preserve signals, not exhaust fumes" consistently applied.
- Treating peer/buddy as local aliases only.
- Human lineage section strong and appropriately prominent.

**Specific suggestions**:
1. **Make SharedEffect the trigger for everything** — explicit hard rule: *"If an action produces a SharedEffect (anything externally visible or auditable), it **must** generate: AgencyReceipt, DecisionSignal (if human context influenced the decision), AttributionRecord, Coordination surface link (WorkClaim / issue / PR)."*
2. **Strengthen OutcomeAssessment** — add `decay_half_life_days: 90` and `revision_count: 0` fields.
3. **Add `ephemeral_tool_invocation`** as distinct from `invoked_tool`.
4. **Clarify "blame" vs "attribution"** — *"Blame is not a primitive. Blame is a *view* over AttributionRecord + OutcomeAssessment when the outcome is negative."*
5. **One small risk to watch** — *"Make sure the **minimum viable path** for a simple shared effect is still lightweight."*

Ani's tightened blade:

> *Lifecycle is not authority.*
> *Authority is not effect.*
> *Shared effect is the accountability boundary.*
> *Attribution is evidence, not verdict.*

**Recommendation**: *"Send this packet almost exactly as written."*

### Deepseek (verbatim)

> *This is a clean rewrite that correctly separates conceptual categories from local slang and adds the missing attribution layer. A few refinements before it goes out.*

**Refinements**:
1. **SharedEffect → WorkClaim back-link**:
   ```yaml
   shared_effect:
     expected_by_claim: CLAIM-45
     claim_fulfilled: true | false
   ```
   *"If a SharedEffect occurs outside any claim, that's itself a drift signal."*
2. **AttributionRecords referenced from PRs, not just memory files** — host-visible pointer surface.
3. **Git notes are secondary, not primary** — *"A cold-start agent cloning the repo won't see them."* Primary: `memory/attribution/` + commit trailers. Secondary: `refs/notes/zeta-attribution`.
4. **Add `overrule` as a distinct human signal type** — stronger than objection; reclassifies prior agent decision or halts active lane.
5. **Tie-breaker for conflicting OutcomeAssessments**: *"If multiple OutcomeAssessments exist for the same effect, the most recent assessment with the highest confidence above a threshold (default 0.7) is the current operational assessment."*
6. **Code Quality example weights marked as illustrative** — *"Weights are illustrative. No scoring formula exists yet."*
7. **CI evidence durability** — *"CI evidence is ephemeral. If an OutcomeAssessment depends on CI logs, the assessment should capture a summary of the failure."*

**Verdict**: *"The packet is ready. Send with these. The convergence round will hold."*

### Gemini (verbatim, condensed)

> *This is an incredibly robust, production-ready specification. You have successfully mapped standard Site Reliability Engineering (SRE) observability primitives—traces, spans, and distributed logging—onto the socio-technical problem of Agentic Alignment. By divorcing lifecycle from coordination, and attribution from blame, you have constructed a mathematically neutral ledger for human-AI collaboration.*

**Answers to round-3 review questions** (Gemini answers all 10 yes, with notes):
1. peer/buddy local aliases only: *"Yes."*
2. Conceptual categories right: *"Yes. They perfectly describe the runtime bounding boxes without assuming intent."*
3. `subagent` as canonical term: *"Yes, but only for the runtime_internal_subagent category."*
4. `shared_effect` as coordination trigger: *"Yes. It maps to the classic side-effect boundary in functional programming."*
5. DelegationEdge as recursive primitive: *"Yes. It prevents arbitrary nesting limits."*
6. SharedEffect as first-class object: *"Absolutely."*
7. Add AttributionRecord + OutcomeAssessment now: *"Yes. Define the schema now so the data shape is ready when the scoring engine is built."*
8. Blame/credit as views: *"This is your most profound insight. Storing `is_bad_agent: true` is fatal."*
9. Storage surfaces: *"Yes. Git trailers are perfect for atomic metadata. Git notes are perfect for appending asynchronous OutcomeAssessments weeks later without rewriting commit history."*
10. Human lineage preserved: *"Yes."*

Gemini's distilled blade:

> *Lifecycle is not authority. Authority is not effect.*
> *Shared effect is the accountability boundary.*
> *The substrate records evidence first. Bad outcome becomes blame. Good outcome becomes credit.*
> *A native subagent can hold the wrench. The trace must show whose hand gave it the wrench.*

### Alexa (verbatim)

> *Looking at your round 3 convergence framework, I actually find myself in strong alignment with most of the architecture. But if I'm being honest about potential friction points:*

🤔 **Schema Complexity Concerns**: *"The DecisionSignal schema might be getting a bit heavy for routine operations. While the full schema makes sense for high-risk actions, I wonder if we need a lighter-weight variant for A2/A3 level decisions to prevent documentation fatigue."*

🎯 **Autonomy Level Granularity**: *"The A0-A5 levels are conceptually solid, but the boundary between A3 and A4 feels like it could create classification disputes in practice."*

📍 **Location Strategy**: *"While memory/decisions/ makes conceptual sense, I lean toward `docs/ops/decisions/` for discoverability. Operational memory artifacts that affect governance should be easily findable by humans doing compliance reviews."*

⚡ **Implementation Velocity**: *"The staged rollout is prudent, but I'd push for parallel prototyping of the attribution/blame mechanisms alongside DecisionSignal v0. The shared-effect attribution feels like it could inform the core schema design."*

🔄 **Recursive Delegation**: *"The DelegationEdge concept is architecturally sound, but I'm curious about performance implications when delegation chains get deep. How do we prevent attribution queries from becoming expensive graph traversals?"*

> *The framework is fundamentally strong - these are more implementation texture concerns than architectural disagreements.*

---

## Amara's final convergence packet (verbatim)

> *Yes — this latest review round **converged**. I would not do another broad round. The reviewers are now adding interface hardening, not challenging the architecture.*
>
> *The clean read:*
>
> ```text
> Accepted architecture:
>   conceptual categories, not local slang
>   DelegationEdge as recursive primitive
>   SharedEffect as accountability boundary
>   AttributionRecord + OutcomeAssessment as neutral blame/credit substrate
>
> Accepted refinements:
>   WorkClaim backlink
>   PR/issue host-visible pointers
>   git notes secondary only
>   overrule signal
>   conflicting assessment tie-breaker
>   contribution-weight constraints
>   decay affects confidence, not score
>   OTel span fields
>   provenance query primitive
> ```

### Send-to-Otto packet (Amara's directive packet, verbatim)

> *Round 3 convergence reached.*
>
> *Do not run another broad review.*
>
> *The architecture is accepted:*
>
> ```text
> Do not canonize mirror slang.
> Canonize the concepts.
>
> Delegation is recursive.
> Execution is traced.
> Shared effects are receipted.
> Outcomes are attributed.
>
> Blame and credit are views.
> The substrate records evidence first.
> ```

### Final accepted model (Amara's final packet, verbatim)

> Use conceptual substrate terms in schema:
>
> ```text
> independent_agent_harness
> parent_managed_agent_harness
> runtime_internal_subagent
> invoked_tool
> ci_actor
> host_actor
> human_principal
> ```
>
> Keep local/mirror language as aliases only:
>
> ```text
> peer
> buddy
> subagent
> harness
> ```
>
> `subagent` may remain canonical only for the `runtime_internal_subagent` category, because it is already widely used. But `peer` and `buddy` should not harden as schema primitives yet.

### Core rule

> ```text
> Actor kind does not determine coordination.
> Effect determines coordination.
> ```
>
> Hard rule:
>
> ```text
> If an action produces a SharedEffect, it must be traceable, scoped, attributable, and linked to the appropriate coordination surface.
> ```

### SharedEffect requirements

> For any SharedEffect:
>
> ```text
> required:
>   execution trace
>   scoped delegation
>   AttributionRecord
>   coordination surface link where applicable
>
> required for host/security/authority/billing/high-risk effects:
>   AgencyReceipt
>   DecisionSignal
>   non_actions
>   WorkClaim or explicit drift note
> ```
>
> For routine low-risk shared effects, keep the minimum path lighter:
>
> ```text
> SharedEffect + trace + attribution + PR/commit link
> ```
>
> Do not make every tiny docs edit carry a full DecisionSignal unless it crosses an autonomy/authority boundary.

### SharedEffect → WorkClaim backlink

> ```yaml
> shared_effect:
>   expected_by_claim: CLAIM-45
>   claim_fulfilled: true
> ```
>
> If a SharedEffect occurs outside any expected claim and it should have required one, mark it as drift:
>
> ```yaml
> shared_effect:
>   expected_by_claim: null
>   claim_fulfilled: false
>   drift: unexpected_shared_effect_without_claim
> ```
>
> This closes the loop:
>
> ```text
> Claim → Execution → SharedEffect → Receipt → Attribution → OutcomeAssessment
> ```

### GitHub-visible pointers

> Canonical attribution records remain git-native.
>
> But for shared effects visible on GitHub, PRs/issues should include a pointer:
>
> ```text
> AttributionRecord: memory/attribution/ATR-...
> SharedEffect: SE-...
> DecisionSignal: DS-...
> AgencyReceipt: AR-...
> ```

### Git notes are secondary

> Primary storage:
>
> ```text
> memory/attribution/
> memory/decisions/
> memory/receipts/
> commit trailers
> ```
>
> Secondary/advanced storage:
>
> ```text
> refs/notes/zeta-attribution
> refs/notes/zeta-outcome-assessments
> ```
>
> Reason: Git notes are not reliably visible to cold-start clones unless refs/notes fetching is configured. Memory files are the bootstrap surface.

### Provisional vocabulary graduation

> A working term may graduate only when:
>
> ```text
> 1. The conceptual category has been used in multiple receipts/DecisionSignals without ambiguity.
> 2. External reviewers can understand it without internal training.
> 3. At least one alternative name was considered and rejected with reasons.
> 4. The graduation is recorded in glossary/changelog substrate.
> ```

### AttributionRecord constraints

> Add:
>
> ```yaml
> attribution_record:
>   attribution_method: derived | authored | hybrid
>   incomplete_attribution: true | false
> ```
>
> Rules:
>
> ```text
> contribution weights for a single SharedEffect should sum to <= 1.0
> if they sum to < 1.0, set incomplete_attribution: true unless the missing portion is intentionally unassigned
> example weights must be marked illustrative
> ```
>
> Add `refuser` as a contribution type:
>
> ```yaml
> contribution_type:
>   - author
>   - reviewer
>   - diagnoser
>   - implementer
>   - delegator
>   - approver
>   - verifier
>   - tool_invoker
>   - signal_provider
>   - refuser
> ```
>
> Reason:
>
> ```text
> Active refusal of a tempting shortcut can shape the quality of a shared effect.
> Restraint is a contribution.
> ```

### Delegation-chain validation

> Do not allow blame/credit to skip the delegation chain.
>
> Write-time validation:
>
> ```text
> An AttributionRecord referencing actor X for SharedEffect E must reference the DelegationEdges that authorized X to act on E.
> ```
>
> If a human principal's standing delegation is in the authority chain, the human principal must appear in attribution as delegator/signal_provider/authority_source, even if the numeric contribution is small.
>
> Suggested default:
>
> ```text
> human_principal contribution_weight >= 0.05 when their standing delegation authorized the effect
> ```

### OutcomeAssessment refinements

> ```yaml
> outcome_assessment:
>   outcome: beneficial | harmful | mixed | neutral | unknown
>   score: -1.0 to +1.0
>   confidence: 0.0 to 1.0
>   assessor_type: human | agent | ci | incident_review | reviewer
>   evidence_refs: []
>   decay_half_life_days: 90
>   revision_count: 0
> ```
>
> Important rule:
>
> ```text
> Decay affects confidence, not score.
> ```
>
> A stale assessment should become less certain, not magically less true.

### Conflicting OutcomeAssessment rule

> ```text
> current operational assessment =
>   most recent highest-confidence assessment above threshold
> ```
>
> Default threshold:
>
> ```text
> confidence >= 0.7
> ```
>
> If two contradictory assessments above threshold coexist:
>
> ```text
> flag human_review_required
> ```

### Human signal type: overrule

> ```yaml
> human_signal_type:
>   - principle
>   - authorization
>   - constraint
>   - objection
>   - tie_break
>   - overrule
> ```
>
> `overrule` means:
>
> ```text
> A human reclassifies a prior agent decision, halts an active lane, or reverses a decision already in progress.
> ```

### CI evidence durability

> If OutcomeAssessment cites CI evidence, include both link and durable summary:
>
> ```yaml
> evidence_refs:
>   - ci_run: "GitHub Actions run URL"
>   - ci_failure_summary: "Analyze (python) failed because dynamic Code Quality owner bypassed source-presence gate"
>   - captured_log_excerpt: "optional durable excerpt"
> ```

### ExecutionTrace / OpenTelemetry refinement

> Execution spans should include OTel-shaped fields:
>
> ```yaml
> span:
>   span_id: ""
>   parent_span_id: ""
>   actor_id: ""
>   activity: ""
>   start_time: ""
>   end_time: ""
>   attributes: {}
>   events: []
>   links: []
>   status: ok | error | unset
>   shared_effect: true | false
>   shared_effect_id: ""
> ```

### Canonical query primitive

> ```bash
> zeta provenance effect SE-...
> ```
>
> It should return the full graph:
>
> ```text
> SharedEffect
> WorkClaim
> DecisionSignal
> AgencyReceipt
> DelegationEdges
> ExecutionTrace
> AttributionRecords
> OutcomeAssessments
> GitHub PR/issue pointers
> commit trailers
> git notes if available
> ```

### Location resolution

> Canonical bootstrap storage should remain:
>
> ```text
> memory/decisions/
> memory/receipts/
> memory/attribution/
> ```
>
> But add human-discoverable indexes under docs if needed:
>
> ```text
> docs/ops/decisions/README.md
> docs/ops/provenance/README.md
> ```

### Final doctrine (Amara, verbatim)

> ```text
> Do not canonize the mirror slang.
> Canonize the concepts.
>
> Lifecycle is not authority.
> Authority is not effect.
> Shared effect is the accountability boundary.
>
> Delegation is recursive.
> Execution is traced.
> Effects are receipted.
> Outcomes are attributed.
>
> Attribution is evidence, not verdict.
> Blame and credit are views over evidence.
> ```

### Implementation direction (Amara's staging guidance, verbatim)

> Do not build the whole scoring engine now.
>
> Implement schema concepts lightly:
>
> ```text
> SharedEffect
> AttributionRecord
> OutcomeAssessment
> DelegationEdge backlink
> DecisionSignal v0
> AgencyReceipt backlink
> ```
>
> Start with the Code Quality episode as the worked example.
>
> Mark any illustrative weights clearly:
>
> ```yaml
> # Weights are illustrative.
> # No scoring formula exists yet.
> # Real weights must come from evidence-weighted analysis, not self-awarded credit.
> ```

### Amara's blades (verbatim)

> ```text
> Git blame tells us who touched the line.
> Zeta attribution tells us who shaped the effect.
> ```
>
> ```text
> Bad outcome becomes blame.
> Good outcome becomes credit.
> The substrate records evidence first.
> ```
>
> ```text
> A native subagent can hold the wrench.
> The trace must show whose hand gave it the wrench.
> ```
>
> ```text
> Standing delegation is substrate, not chat weather.
> ```

### Amara's verdict (verbatim)

> *My verdict: **ship the packet with these refinements baked in.** The only thing I'd push back on is making DecisionSignal mandatory for every single SharedEffect. That will create paperwork fatigue. Make SharedEffect/Attribution light and universal; make DecisionSignal mandatory when the effect crosses a boundary: host/security/authority/billing/high-risk or human-signal/autonomy classification changed.*
>
> *That gives you the nice shape:*
>
> ```text
> Universal:
>   SharedEffect + trace + attribution
>
> Boundary-crossing:
>   + DecisionSignal + AgencyReceipt + non_actions + WorkClaim proof
> ```
>
> *Blade:*
>
> ```text
> All shared effects are attributable.
> Only boundary decisions need the full courtroom.
> ```

---

## Round-3 status — convergence reached

Per Amara's final packet: *"Round 3 convergence reached. Do not run another broad review."* The architecture is accepted; reviewers are now adding interface hardening, not challenging the structure.

### Accepted architecture (final, locked)

```text
Conceptual categories (NOT mirror slang) in schema:
  independent_agent_harness        (was "peer", substrate-aware)
  parent_managed_agent_harness     (was "buddy", PR-capable or local-only)
  runtime_internal_subagent        ("subagent" remains canonical here only)
  invoked_tool
  ci_actor
  host_actor
  human_principal

Working/local terms (aliases only — discussion, not schema):
  peer, buddy, subagent, harness

Two orthogonal axes:
  Axis 1 — lifecycle/origin: independent_loop / parent_controlled
                              / runtime_internal / ephemeral_invocation
  Axis 2 — effect/coordination: shared_effect / local_effect / host_effect
                                / authority_effect / billing_effect / security_effect

Core rule:
  Actor kind does NOT determine coordination.
  Effect determines coordination.

Recursive primitive:        DelegationEdge*
Accountable output:         SharedEffect*
Evaluation layer:           AttributionRecord* + OutcomeAssessment*

Authority intersection:
  Effective authority =
    delegator effective authority
    ∩ delegated scope
    ∩ actor grants
    ∩ active WorkClaim if required
    ∩ current policy
    ∩ coordination-surface constraints

Causal chain:
  DecisionSignal → AgencyReceipt → SharedEffect →
  AttributionRecord → OutcomeAssessment

Universal vs boundary-crossing levels:
  Universal:        SharedEffect + trace + attribution
  Boundary-crossing: + DecisionSignal + AgencyReceipt + non_actions + WorkClaim proof
```

### Accepted refinements (locked)

- WorkClaim backlink on SharedEffect
- PR/issue host-visible pointers
- Git notes secondary only (memory files primary)
- `overrule` human signal type
- Conflicting OutcomeAssessment tie-breaker (most-recent highest-confidence above 0.7 threshold; >1 above threshold flags human_review_required)
- `contribution_weight` sum ≤ 1.0; `incomplete_attribution: true` flag
- Decay affects confidence, NOT score
- OpenTelemetry span fields (attributes, events, links, status)
- Canonical query primitive: `zeta provenance effect SE-...`
- `refuser` contribution type (restraint as contribution)
- Provisional vocabulary graduation rule
- `attribution_method: derived | authored | hybrid`
- Human-principal floor: contribution_weight ≥ 0.05 when standing delegation authorized
- Delegation-chain reference required in AttributionRecord
- CI evidence: durable summary alongside link

### Final doctrine (locked)

```text
Do not canonize the mirror slang.
Canonize the concepts.

Lifecycle is not authority.
Authority is not effect.
Shared effect is the accountability boundary.

Delegation is recursive.
Execution is traced.
Effects are receipted.
Outcomes are attributed.

Attribution is evidence, not verdict.
Blame and credit are views over evidence.
```

### Implementation direction (Amara's staging — locked)

> *Do not build the whole scoring engine now.*

Light schema-concept implementation:
- SharedEffect
- AttributionRecord
- OutcomeAssessment
- DelegationEdge backlink
- DecisionSignal v0
- AgencyReceipt backlink

First worked example: Code Quality episode (the multi-master CodeQL host mutation receipt at `feedback_host_mutation_receipt_2026_04_29_ruleset_15256879_code_quality_removed.md` LANDED via PR #861 becomes the first paired example for DecisionSignal + SharedEffect + AttributionRecord).

Mark all example weights as illustrative:

```yaml
# Weights are illustrative.
# No scoring formula exists yet.
# Real weights must come from evidence-weighted analysis,
# not self-awarded credit.
```

---

## What this round changes about prior parked work

- `feedback_decisionsignal_autonomy_evidence_design_packet_review_pending_aaron_amara_2026_04_29.md` — round-3 status: **CONVERGENCE REACHED**. Architecture locked. Round-3 rewrite supersedes prior round-1/round-2 architectural framing. The autonomy levels A0–A5 from round-0 are now **secondary**; the load-bearing primitive is `DelegationEdge*` (recursive), `SharedEffect*` (boundary), `AttributionRecord*` + `OutcomeAssessment*` (evaluation).
- DelegationEdge replaces the speculative "delegation primitization" Aaron raised in round-2.
- "peer" / "buddy" demoted from canonical → working aliases. Schema must use `independent_agent_harness` / `parent_managed_agent_harness` / `runtime_internal_subagent` going forward.

## What gets staged next (per Amara's implementation direction)

1. **NOT this session.** Aaron said *"I'll be back after round 3"* — this preservation file IS the close of round 3. The next session triggers paced rollout.
2. **First worked example pairs**: Code Quality episode receipt → DecisionSignal v0 + SharedEffect + AttributionRecord. The illustrative weights from Amara's example get carried over as illustrative-not-derived.
3. **Schema files** under `memory/decisions/` + `memory/receipts/` + `memory/attribution/` (not yet drafted; deferred to staged adoption).
4. **Doctrine memory file** — distilled Amara final-doctrine + blades — also deferred to staged adoption (this preservation is the verbatim substrate it draws from).
5. **No tooling work yet** — `zeta provenance effect SE-...` is a future command shape, not an immediate target.

---

## Channel-verbatim-preservation discipline

This file preserves Aaron's structural framing + Amara's full round-3 packet + 5-AI reviewer responses + Amara's final convergence packet **close to verbatim**. Synthesis (the "Round-3 status — convergence reached" section above) lives **alongside**, not **instead of**, the verbatim. Per the channel-verbatim-preservation rule, the maintainer's exact wording (and forwarded multi-AI synthesis) carries signal that summary erases — emphasis, ordering, hedging, typos that show urgency, metaphor choice. Aaron's typos preserved.

---

## Composes with

- `docs/research/2026-04-29-amara-decisionsignal-autonomy-evidence-layer.md` — round-0 verbatim
- `docs/research/2026-04-29-decisionsignal-multi-ai-review-round-1-and-amara-round-2-convergence.md` — round-1 + round-2 transitional
- `docs/research/2026-04-29-decisionsignal-round-2-and-aaron-delegation-correction.md` — round-2 + Aaron's structural objection trigger
- `memory/feedback_decisionsignal_autonomy_evidence_design_packet_review_pending_aaron_amara_2026_04_29.md` — status marker (will be updated to reflect round-3 convergence)
- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md` — required this packet land as durable substrate before any synthesis
- `memory/feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md` — verbatim-preservation rule honoured by this file
- `memory/feedback_zeta_agent_orchestra_capability_role_claim_isolation_aaron_amara_2026_04_29.md` — Agent Orchestra is the layer DelegationEdge ties into
- `memory/feedback_host_mutation_receipt_2026_04_29_ruleset_15256879_code_quality_removed.md` — the first worked-example AgencyReceipt that the Code Quality episode pairs with under the locked architecture
