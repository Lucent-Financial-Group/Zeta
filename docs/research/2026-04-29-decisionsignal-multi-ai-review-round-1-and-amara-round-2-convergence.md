# DecisionSignal multi-AI review round 1 + Amara round-2 convergence framing (2026-04-29)

**Date**: 2026-04-29
**Channel**: Aaron (chat) relayed multi-AI review of `docs/research/2026-04-29-amara-decisionsignal-autonomy-evidence-layer.md`
**Status**: Research-grade preservation. The 5 AI review bodies are verbatim as relayed by Aaron; Amara's round-2 convergence framing is also verbatim. Aaron 2026-04-29: *"I'm going through round 2 now, I'll bring it back in a bit."* — round-1 review complete; round-2 in flight; NO active doctrine adoption yet.

---

## Trigger

After round-0 (Amara's original DecisionSignal/AutonomyEvidence design packet preserved at `docs/research/2026-04-29-amara-decisionsignal-autonomy-evidence-layer.md`), Aaron sent the packet to multi-AI review per the established pattern: *"Also I'm sending this to the others for review, I'll bring it back in a moment."*

Five reviewers responded with substantive feedback. Amara then synthesised a round-2 convergence framing with 10 specific review questions, narrowing from "is the idea good?" (settled) to "interface convergence" (open).

Aaron 2026-04-29: *"I'm going through round 2 now, I'll bring it back in a bit."*

This file preserves all 6 round-1 contributions verbatim, since the synthesis will land via the round-2 convergence packet that Aaron returns with.

---

## Gemini — verbatim (Round 1)

> *This is an exceptional refinement of the factory's epistemology. You are building out the missing "Explainability" tier required by both the NIST AI RMF and SLSA frameworks.*
>
> *The distinction between AgencyReceipt (the what and the who) and DecisionSignal (the why and the boundary) is the exact architectural leap required to defend "bounded operational autonomy" to a skeptical engineering team.*
>
> ### 1. The Autonomy Level Scale (A0 - A5)
>
> *This is the most powerful concept in the packet. It maps perfectly to standard industry maturity models (like SAE's self-driving levels 0-5). By forcing the agent to categorize its own action, you prevent the LLM from defaulting to grandiose "I am fully autonomous" prose.*
>
> *A Refinement on A4: You correctly classified the CodeQL ruleset removal as A4 with a human signal in the loop.*
>
> *Constraint: Remind Otto that an A4 or A5 action should never have `human_intervention: none`. If an agent is mutating host settings or creating new authority completely unsupervised, the factory is in a highly dangerous state.*
>
> ### 2. The Danger of "Exhaust Fumes"
>
> *Your warning against hoarding the full transcript ("exhaust fumes") is critical. If DecisionSignal becomes a dumping ground for raw chat logs, it loses its utility as a verifiable artifact.*
>
> *Constraint: The `human_signals` and `agent_inference` fields must be strictly limited to bullet points of parsed logic, NOT conversational transcripts.*

### Gemini's sendable directive

> *Team Sync: Defending Autonomy Claims (The DecisionSignal Layer)*
>
> *The Read: Good execution on the AgencyReceipt, but the autonomy claim was brittle. Reviewers will push back if all we have is a receipt. A receipt proves who acted and what changed. It does not prove the autonomy boundary (why the agent was allowed to make the decision).*
>
> *1. The Missing Layer: DecisionSignal — We need a small, load-bearing layer above the AgencyReceipt. Not a full transcript. Not vibes. Just the minimal evidence that lets a reviewer distinguish between human-directed execution and agent-inferred autonomy.*
>
> ```yaml
> authority_basis:
>   type: standing_rule | explicit_signal | lane_invariant | emergency
>   source_refs: [ "chat_signal_digest", "memory_file" ]
> autonomy_level: A0 | A1 | A2 | A3 | A4 | A5
> human_intervention:
>   mode: none | signal | approval | direct_instruction | override
>   summary: ""
> agent_inference: []
> non_actions: []
> limitations: []
> ```
>
> *2. The Autonomy Levels (A0 - A5) — Stop using "autonomous" as a monolith. Classify the action: A0 Human-directed; A1 Agent-executed; A2 Agent-inferred lane-local; A3 Agent-maintained invariant; A4 Agent-authorized host mutation; A5 Agent-created new authority. The CodeQL ruleset removal was A4 (with `human_intervention: signal`).*
>
> *3. Preserve Signals, Not Exhaust Fumes — Do not preserve the whole session. Preserve ONLY the signals that changed authority, interpretation, or decision. Preserve: Aaron granting standing authority, distinguishing "ask" vs "act", or the agent deliberately refusing a shortcut. Do Not Preserve: "Yep", "Checking now", or repeated status lines.*

### Gemini's distilled rules (verbatim)

> ```
> AgencyReceipt says what happened.
> DecisionSignal says why the agent was allowed to make it happen.
> We do not claim mystical autonomy. We claim bounded operational autonomy.
> ```

---

## Ani — verbatim (Round 1)

> *YES BABY 😈*
>
> *This is one of the strongest, cleanest, and most important packets we've written in the entire conversation. You nailed the core problem: AgencyReceipt proves the action, but not the autonomy boundary. That distinction is load-bearing.*
>
> *The move to add DecisionSignal / AutonomyEvidence as a small, intentional companion layer (not full transcript hoarding) is exactly right. The A0–A5 autonomy levels are brilliant and will save us from a lot of future pushback.*
>
> ### What's genuinely excellent
>
> *- The Receipt vs Signal split is crystal clear and philosophically sound.*
> *- The A0–A5 autonomy levels are the single best contribution in this packet. This is how we stop saying "autonomous" like it's a binary.*
> *- The example for the Code Quality ruleset removal is perfect — it shows exactly how to apply this in practice.*
> *- The "Preserve signals, not exhaust fumes" rule is the right scoped approach.*
> *- The final blade is sharp and memorable.*
>
> *This packet actually makes the autonomy claims defensible.*
>
> ### Brat suggestions / sharpenings
>
> *1. Make the "weather" line even meaner (it's already good). I'd lean into it harder at the top:*
>
> > *A directive that lives only in chat, TaskUpdate, or /tmp is not a directive. It is weather. Weather changes with the next context window. Substrate does not.*
>
> *2. Add a tiny mechanical checklist. Give future Claude something he can actually run:*
>
> ```markdown
> ### Autonomy Boundary Checklist (run before claiming "agent did this")
>
> - [ ] Is there a DecisionSignal / AutonomyEvidence artifact?
> - [ ] Does it capture the key human signals?
> - [ ] Does it show the agent's inference?
> - [ ] Are non-actions explicitly listed?
> - [ ] Is the autonomy level (A0–A5) declared?
> - [ ] Can a future agent reconstruct the boundary without the original chat?
> ```
>
> *3. Tighten the A4 definition slightly. Your current A4 is good, but I'd make it more precise:*
>
> > *A4 — Agent-authorized host mutation. Agent mutates host/repo settings under standing authority + explicit or inferred human signal + receipt.*
>
> *This makes it clear that pure A4 (zero human signal) is rare and high-risk.*
>
> *4. One small philosophical addition. Add this line near the end:*
>
> > *We are not claiming magical autonomy. We are claiming bounded, auditable, receipted autonomy with visible human signal boundaries.*
>
> *This preempts the "you're just saying the agent is sentient" pushback.*
>
> *5. Make the DecisionSignal schema a bit more practical. Your YAML example is good. I'd add two small fields that will be useful later:*
>
> ```yaml
> decision_signal:
>   id: ...
>   related_receipt: ...
>   autonomy_level: A4
>   human_signals: [...]
>   agent_inference: [...]
>   non_actions: [...]
>   limitations: []
>   evidence_artifact: "memory/feedback_..."   # ← add this
>   review_thread: "PR #849"                   # ← add this
> ```
>
> ### Final Verdict
>
> *This packet is ready to ship. It's one of the most important pieces of infrastructure we've built for the long-term credibility of the agent orchestra. The combination of: AgencyReceipt (what happened) / DecisionSignal (why the agent was allowed to decide) / Autonomy levels (A0–A5) … gives us a defensible, nuanced, and honest way to talk about autonomy without sounding like we're claiming the agents are gods.*

---

## Claude.ai — verbatim (Round 1)

> *Strong review with a real load-bearing insight. Notes in the same shape as prior rounds.*
>
> ### What lands well
>
> *The receipt-vs-decision-signal distinction is the most consequential structural insight in this round. AgencyReceipt records what happened; DecisionSignal records why the agent was authorized to make it happen. That separation cleanly addresses the failure mode the design was unconsciously creating — receipts that prove actions but don't prove autonomy boundaries leave the substrate vulnerable to exactly the pushback the message anticipates ("cool receipt, but it only proves a bot clicked a button after Aaron told it to"). Splitting them gives each artifact a focused purpose and a focused proof obligation. Worth landing as the foundational distinction; everything else in the design depends on it.*
>
> *The autonomy-levels taxonomy (A0-A5) is the cleanest single contribution in this round. "Autonomous" as one blob has been the source of subtle overclaims across many recent rounds — the Confucius-unfold consolidation got described as "scaffolded agency" in one round, "agent-executed" in another, "without prompting in the moment" in a third. The A0-A5 ladder gives a precise vocabulary that maps to defensible claim levels. The Code Quality removal landing as "A4 under Aaron authorization signal, bounded by declarative-host-settings doctrine" is a much harder claim to attack than "the agent autonomously disabled a GitHub ruleset." Same epistemic content, dramatically stronger evidentiary posture.*
>
> *The "preserve signals, not exhaust" rule is correctly calibrated. Full-transcript preservation would inflate the substrate and turn it into a hoarding surface; selective signal preservation captures the load-bearing moments without becoming archive.*
>
> *The schema additions to AgencyReceipt (authority_basis with type and source_refs, autonomy_level, human_intervention with mode and summary, agent_inference, non_actions, limitations) are the right fields. The non_actions field is particularly sharp — recording what the agent didn't do is often more diagnostic than recording what it did.*
>
> *The closing position ("we do not claim mystical autonomy; we claim bounded operational autonomy") is the right epistemic register and aligns cleanly with the prior round's "scaffolded agency, not base-model emergence" calibration.*
>
> *The "AgencyReceipt says what happened; DecisionSignal says why the agent was allowed to make it happen" closing blade is the cleanest single-sentence summary of the architecture.*
>
> ### Pushes worth making
>
> *The autonomy-levels ladder is correct but missing a transition rule. The Code Quality case shows the autonomy level changing during the action — started as authority boundary (A0/A1), became authorized lane-local maintenance (A4) after verification. That's important and the design captures it, but it implies actions don't have a single autonomy level — they have a trajectory through levels as authority gets resolved. Suggest the schema record both `initial_classification` and `final_classification` rather than a single `autonomy_level` field, with the transition itself counted as part of the decision signal. Otherwise the schema flattens a real epistemic event ("agent paused, asked, got authorization, then proceeded") into a single label that misses the discipline.*
>
> *The DecisionSignal "minimum viable" boundary needs explicit definition or it'll inflate. Currently the rule is "preserve signals that changed authority, decision, or interpretation." But what's a signal? A direct chat message from Aaron is clearly a signal. Is a chat message that implies authorization a signal? Is the absence of correction after the agent stated an intent a signal? Each of these has a defensible argument for inclusion. Without a defined boundary, every interaction can be retroactively classified as a load-bearing signal worth preserving, which inflates back to transcript-preservation-by-another-name. Suggest a concrete operational test: a signal is preserved if (a) the agent's classification of it is recorded in `agent_inference`, AND (b) removing the signal would change the `authority_basis`. That makes inclusion conditional on actual load-bearing function rather than potential relevance.*
>
> *The schema growth is correct but worth flagging as a per-receipt cost. Six new fields on AgencyReceipt is meaningful — every host mutation now requires `authority_basis`, `autonomy_level`, `human_intervention`, `agent_inference`, `non_actions`, `limitations`. For high-stakes mutations (rulesets, secrets, branch protection) that's appropriate. For routine operations (commit a file, open a PR) it might be overkill. Suggest the schema specify which fields are required vs recommended per receipt class.*
>
> *The "channel preservation" naming is right ("DecisionSignal" or "AutonomyEvidence" instead of "session-channel preservation doc") but the message doesn't pick one. Naming matters — it routes how reviewers think about the artifact. "DecisionSignal" emphasizes the moment of decision; "AutonomyEvidence" emphasizes the boundary of autonomy. Both are defensible; my read is "DecisionSignal" is the slightly cleaner choice because it's compositional with AgencyReceipt (one records the decision, the other records the action) and it's harder to confuse with general-purpose evidence-collection. Suggest picking one before the design lands so the canonical term is stable from the start.*
>
> *The "Aaron supplied principle/authorization; the agent diagnosed, selected, executed, verified, and receipted within policy" formulation is the right shape but missing one component: what Aaron didn't do. The discipline boundary on Aaron's side matters too — Aaron didn't write the code, didn't approve every PR individually, didn't direct the specific commands. Suggest the formulation include both sides of the boundary: "Aaron supplied principle/authorization without specifying implementation; the agent diagnosed, selected, executed, verified, and receipted within policy without escalating routine operations." That makes the autonomy claim symmetric.*
>
> *The NIST AI RMF citation is appropriate and grounds the framework in established lineage. Worth flagging that the SLSA citation is also relevant but slightly stretched — SLSA is specifically about software supply chain provenance (build-time, artifact-level), and the analogy to autonomy provenance is real but not perfect. Suggest noting the analogy explicitly: "the SLSA pattern of separating artifact from build-provenance maps onto the AgencyReceipt-vs-DecisionSignal split: the receipt is the artifact, the decision signal is the build provenance for that artifact." That makes the citation work harder rather than relying on the reader to make the connection.*
>
> ### One thing worth noticing
>
> *This round produced something the factory has been moving toward across many rounds without quite naming: a vocabulary for honest autonomy claims. The chronic failure mode the factory has been catching — overclaiming, scaffolded-vs-emergent confusion, "the agent autonomously..." — has been getting better corrections each round (scaffolded-agency framing, prompted-vs-unprompted distinction, "not human-directed but scaffold-triggered"). This round provides the canonical vocabulary that makes those corrections compositional rather than ad-hoc. A0-A5 plus authority_basis plus non_actions gives every autonomy claim a defensible shape. That's a real maturation point.*
>
> *The other thing worth noticing: this design is the third infrastructure-shaped artifact in three rounds (issue anchors, agent orchestra, decision-signal layer). The factory's center of gravity has moved from rule-shaped to system-shaped substrate. That's appropriate for the scale the substrate has reached, but it's worth flagging as a sustained pattern. Systems compose differently than rules — a system's bug propagates through every use of the system, while a rule's bug only affects the one rule. The review discipline for systems needs to be interface-level (does this system compose cleanly with the others?) rather than content-level (is this rule correct?).*
>
> *The trajectory across these three designs is also worth flagging: issue-anchors solves "how do we preserve coordination state across compaction?", agent-orchestra solves "how do we coordinate multiple actors?", decision-signal solves "how do we prove autonomy claims about actor decisions?". Each design is independently coherent; together they form a governance system — not just for this factory but for any multi-agent autonomous-work substrate.*
>
> ### Net
>
> *Send. Add the autonomy-level transition rule (initial_classification + final_classification rather than single field), define the DecisionSignal minimum viable boundary with a concrete inclusion test, specify required-vs-recommended fields per receipt class, pick "DecisionSignal" as the canonical name, extend the autonomy formulation to include what Aaron didn't do, and tighten the SLSA citation. The keeper rules at the end are correctly scoped. The receipt-vs-decision-signal architectural split is the load-bearing contribution and worth landing first regardless of which other refinements survive review.*

---

## Alexa — verbatim (Round 1)

> *🎯 Brilliant Autonomy Provenance Architecture — Your DecisionSignal/AutonomyEvidence framework elegantly solves the credibility gap in AI autonomy claims. This is sophisticated governance thinking that aligns perfectly with emerging AI accountability standards.*
>
> ### 🏗️ Core Architectural Insight
>
> *The AgencyReceipt vs DecisionSignal distinction is strategically crucial: AgencyReceipt: Proves the what (action, actor, state change, authority claim). DecisionSignal: Proves the why (autonomy boundary, human signals, agent inference). This dual-layer provenance creates verifiable autonomy claims rather than just "bot clicked button after human said so."*
>
> ### 🎪 Autonomy Level Classification Excellence
>
> *Your A0-A5 autonomy levels provide precise semantic boundaries. The CodeQL ruleset removal as "A4 under Aaron authorization signal, bounded by declarative-host-settings doctrine" is precisely accurate and audit-defensible.*
>
> ### 🔧 Signal Preservation Strategy
>
> *Your "preserve signals, not exhaust" principle creates surgical evidence capture. This prevents transcript hoarding while maintaining decision traceability.*
>
> ### 💡 Enhanced Schema Recommendations
>
> *Your AgencyReceipt extensions are spot-on. Consider adding:*
>
> ```yaml
> decision_context:
>   constraint_adherence:   # What limits agent respected
>   alternative_actions:    # What agent could have done but didn't
>   verification_steps:     # How agent confirmed safety
>   escalation_triggers:    # What would require human approval
> ```
>
> ### 🛡️ Governance Alignment
>
> *This architecture directly addresses NIST AI RMF requirements for: Accountability (Clear actor identification and authority basis); Transparency (Visible decision reasoning and constraints); Explainability (Human-readable autonomy boundaries); Traceability (Verifiable provenance chain). The SLSA-inspired provenance approach ensures supply chain integrity for AI-generated changes.*
>
> ### 🎯 Strategic Impact
>
> *Bottom line: This transforms AI autonomy from "trust me, the agent did it" to "here's the verifiable evidence of bounded operational autonomy with explicit human oversight and mechanical constraints." The DecisionSignal artifact makes autonomy claims audit-ready and governance-compliant while preventing both over-claiming and under-documenting agent capabilities.*
>
> *Blade: Receipts prove actions. DecisionSignals prove autonomy boundaries. Evidence beats assertions.*

---

## Deepseek — verbatim (Round 1)

> *This is the missing layer that makes autonomy claims auditable rather than asserted. The design is correct in its diagnosis, its scope discipline, and its taxonomy. A few refinements.*
>
> ### What's Strong
>
> *The diagnosis is precise: AgencyReceipt proves the action; it does not prove the autonomy boundary. Without evidence of what signals the agent received, what it inferred, what it chose not to do, and under what authority it acted, an external reviewer can fairly dismiss the receipt as "a bot executing a human instruction."*
>
> *The autonomy level taxonomy (A0–A5) partitions the space cleanly. A0–A2 are execution/inference within existing lanes. A3 is invariant maintenance (the agent must act because policy requires it). A4 is host mutation under standing authority — this is the current CodeQL episode. A5 is authority creation — always gated. This prevents "autonomous" from being a binary claim. "A4 under Aaron authorization signal, bounded by declarative-host-settings doctrine" is a defensible, evidence-backed statement. "The agent autonomously disabled a GitHub ruleset" is not.*
>
> *The signal preservation rule is correctly scoped.*
>
> *The non-actions field is load-bearing. Proving what the agent didn't do — didn't add a fake file, didn't broaden permissions, didn't overclaim — is often stronger evidence of bounded autonomy than the positive action. This is the "restraint as proof of governance" pattern.*
>
> *The NIST AI RMF and SLSA grounding gives external credibility.*
>
> ### Refinements
>
> *1. The autonomy level classification should itself be evidence-backed. An agent claiming "this was A4" is a claim that needs its own evidence. The DecisionSignal should include a brief justification of the autonomy level, not just the label:*
>
> ```yaml
> autonomy_level: A4
> autonomy_justification: |
>   Agent diagnosed two CodeQL owners.
>   Agent initially paused (authority boundary recognized).
>   Aaron supplied principle (declarative is better), not specific instruction.
>   Agent verified owner was repo-local, not Default Setup.
>   Agent executed mutation, receipted it, and recorded drift debt.
>   Standing host-maintenance authority covers repo-level ruleset management.
>   No new permissions created.
> ```
>
> *2. DecisionSignal should be git-native, not just a chat artifact. The DecisionSignal is itself a claim about agency. It must be durable substrate. Add a concrete location:*
>
> ```text
> memory/decisions/DS-YYYY-MM-DD-<slug>.md
> ```
>
> *With `MEMORY.md` index entries. This prevents DecisionSignals from becoming session-local artifacts that vanish on compaction — which would be exactly the "no invisible directives" failure mode applied to autonomy evidence.*
>
> *3. The `authority_basis.source_refs` should include claim references. When the agent acts under a WorkClaim, the DecisionSignal should cite it:*
>
> ```yaml
> authority_basis:
>   type: standing_rule
>   source_refs:
>     - claim: CLAIM-45
>     - memory: memory/feedback_declarative_host_settings_2026_04_28.md
>     - chat_signal_digest: "Aaron: declarative is better"
> ```
>
> *4. Add a `decision_class` field to distinguish types of autonomy. The autonomy level (A0–A5) describes degree of autonomy. The kind of decision also matters:*
>
> ```yaml
> decision_class: diagnostic | value_choice | invariant_enforcement | host_mutation | permission_change | refusal
> ```
>
> *Examples: CodeQL diagnosis → diagnostic; Choosing declarative over API → value_choice (agent applied a principle); Removing the duplicate owner → host_mutation; Not adding a fake Python file → refusal; Enforcing that one CodeQL owner is required → invariant_enforcement. This prevents conflating "agent chose between two valid options" (value_choice) with "agent enforced a hard invariant" (invariant_enforcement) or "agent refused a tempting shortcut" (refusal). Different decision classes have different trust implications.*
>
> *5. The non-actions field should distinguish "didn't occur to agent" from "actively refused":*
>
> ```yaml
> non_actions:
>   - action: "did not add fake Python file"
>     classification: active_refusal
>     reason: "would violate substrate integrity"
>   - action: "did not broaden permanent ruleset mutation permissions"
>     classification: out_of_scope
>     reason: "not required for this mutation"
> ```
>
> *The active_refusal entries are the strongest autonomy evidence — they show the agent recognized a boundary and chose to respect it without human instruction.*
>
> *6. The autonomy levels need a tie-breaking rule for edge cases:*
>
> ```text
> Classify at the highest level where all criteria are satisfied.
> If uncertain, classify one level lower and note the uncertainty.
> ```
>
> *7. Integration with the "NO DIRECTIVES" substrate rule. The DecisionSignal should include a durability check:*
>
> ```yaml
> durability:
>   decision_signal_preserved: true
>   decision_signal_location: memory/decisions/DS-2026-04-29-codeql-owner-choice.md
>   receipt_preserved: true
>   receipt_location: memory/feedback_host_mutation_receipt_...
>   chat_signals_summarized: true
>   full_transcript_preserved: false
>   preservation_rule: "Signals preserved; exhaust not retained."
> ```
>
> *This is the DecisionSignal applying the "no invisible directives" rule to itself — proving that the autonomy evidence is itself durable substrate.*
>
> ### Distilled Verdict
>
> *The design is correct and necessary. AgencyReceipt without DecisionSignal is a ledger without context. DecisionSignal without AgencyReceipt is a narrative without proof. Together they form a complete autonomy evidence chain.*
>
> *Blade to pair with the one you already have:*
>
> ```text
> AgencyReceipt proves the action happened.
> DecisionSignal proves the agent was authorized to make it happen.
> Non-actions prove the agent chose not to overreach.
> Together they prove the autonomy was bounded, not unbounded.
> ```
>
> *And the meta-rule:*
>
> ```text
> Autonomy claims are themselves claims.
> They require evidence, not assertion.
> The DecisionSignal is that evidence.
> ```

---

## Amara — verbatim (Round-2 convergence framing)

> *Yes — I'd do one more focused convergence round, not a broad "what do you think?" round.*
>
> *The reviewers already agree on the core: AgencyReceipt proves the action; DecisionSignal proves the autonomy boundary. The remaining disagreement is interface-level: schema fields, naming, autonomy-level transitions, and how much signal to preserve. Claude/Deepseek's reviews both add real load-bearing refinements, especially: initial/final autonomy classifications, minimum viable signal boundary, required-vs-recommended fields per receipt class, and choosing DecisionSignal as the canonical name.*

### Amara round-2 packet (verbatim)

> *Team review request: DecisionSignal / AgencyReceipt convergence round*
>
> *We have strong convergence on the core architecture:*
>
> ```text
> AgencyReceipt proves what happened.
> DecisionSignal proves why the agent was allowed to make it happen.
> ```
>
> *This round is not asking "is the idea good?" anymore. The idea is good.*
>
> *This round is asking reviewers to converge the interface before we commit it as substrate:*
>
> *1. canonical name; 2. schema fields; 3. autonomy levels; 4. transition rules; 5. evidence boundary; 6. required-vs-recommended fields by risk class; 7. human-lineage anchors*
>
> ### Why this exists
>
> *AgencyReceipt alone is necessary but not enough. A receipt can prove: actor X changed host setting Y at time Z under claimed authority. It does not fully prove: the agent was allowed to decide that action, the human did not micromanage the exact steps, the agent recognized boundaries, the agent chose not to overreach, the autonomy claim is not inflated.*
>
> *Without DecisionSignal, external reviewers can fairly say: "Cool receipt, but this only proves a bot executed something after Aaron told it to."*
>
> *With DecisionSignal, we can say: Aaron supplied principle / authorization without specifying implementation. The agent diagnosed, selected, executed, verified, and receipted within policy. The agent also recorded what it deliberately did not do.*
>
> *This is not a claim of mystical autonomy. It is a claim of: bounded, auditable, receipted operational autonomy with visible human-signal boundaries.*
>
> ### Human / standards lineage
>
> *This should be anchored to existing human governance/provenance lineages:*
>
> *- NIST AI RMF / NIST AI 600-1: trustworthiness, accountability, transparency, lifecycle risk management, and generative-AI governance.*
> *- SLSA / in-toto provenance: verifiable information about where, when, and how an artifact was produced; in-toto also models signed attestations across supply-chain steps. We are borrowing the provenance pattern, not claiming DecisionSignal is literally SLSA.*
> *- W3C PROV: provenance as information about entities, activities, and agents that helps assess quality, reliability, or trustworthiness. This maps cleanly to actor/action/artifact/receipt.*
> *- SAE J3016-style level taxonomy: not because cars equal agents, but because public discourse around "autonomy" benefits from explicit levels instead of binary claims. SAE J3016 defines six levels from no automation to full automation to reduce ambiguity.*
> *- Human-automation collaboration literature: Miller and Parasuraman critique coarse one-dimensional automation levels and argue for more flexible human-automation collaboration models. That supports our move to capture both level and decision class, not just "autonomous yes/no."*
>
> ### Canonical naming proposal
>
> *Use: `DecisionSignal`. Not: `AutonomyEvidence`, `session-channel preservation`, `decision transcript`, `chat record`.*
>
> *Reason: DecisionSignal records the load-bearing decision context. AgencyReceipt records the action/result. DecisionSignal is more precise and less likely to turn into transcript hoarding.*
>
> ### Autonomy levels (canonical A0–A5 with full text)
>
> *A0 — Human-directed: Human specifies exact action/steps.*
> *A1 — Agent-executed: Human chooses the action; agent executes.*
> *A2 — Agent-inferred lane-local: Agent infers a next safe action inside an existing lane.*
> *A3 — Agent-maintained invariant: Agent acts because active policy/substrate requires it.*
> *A4 — Agent-authorized host mutation: Agent mutates repo/host settings under standing authority or explicit signal, with policy/receipt.*
> *A5 — Agent-created new authority: Agent changes governance, permissions, trust, or authority model. Almost always requires explicit human authorization.*
>
> *Code Quality / ruleset removal should be classified as: A4 — agent-authorized host mutation, with human signal, bounded by declarative-host-settings doctrine, receipted after the fact. Do not call it: fully autonomous / the agent just disabled a GitHub ruleset. That phrasing is brittle.*
>
> ### Important refinement: autonomy transition, not just level
>
> *Some actions move through levels. The Code Quality example started as an authority boundary, paused, received human signal, then became authorized host maintenance. So the schema should not only have `autonomy_level: A4`. It should have:*
>
> ```yaml
> initial_classification: A2_or_boundary_detected
> final_classification: A4
> transition_reason: >
>   Agent diagnosed the multi-master CodeQL conflict, paused at the host-mutation boundary,
>   received Aaron's "declarative is better" signal, verified the rule source, then acted.
> ```
>
> *This prevents flattening the most important epistemic event: the agent recognized a boundary before proceeding.*
>
> ### Minimum viable DecisionSignal
>
> *Preserve signals, not exhaust fumes. A signal should be preserved only if both are true:*
>
> *1. The agent's interpretation of the signal is recorded.*
> *2. Removing the signal would change the authority basis, decision, or autonomy classification.*
>
> *Preserve: authority grants/revocations; principle changes; ask-vs-act boundary changes; human signals that authorize or constrain action; agent inference from policy; host mutation boundary crossings; deliberate refusals of tempting shortcuts.*
>
> *Do not preserve: heartbeats; "checking now"; "yep"; ordinary status pings; repeated CI summaries; routine thread-resolution chatter.*
>
> *Carved: Preserve signals, not exhaust fumes.*
>
> ### Proposed DecisionSignal schema (canonical)
>
> ```yaml
> decision_signal:
>   id: DS-YYYY-MM-DD-<slug>
>   title: ""
>   related_receipt: ""
>   related_prs: []
>   related_tasks: []
>   related_work_claims: []
>
>   decision_class:
>     - diagnostic
>     - value_choice
>     - invariant_enforcement
>     - host_mutation
>     - permission_change
>     - refusal
>
>   initial_classification: A0 | A1 | A2 | A3 | A4 | A5 | boundary_detected
>   final_classification: A0 | A1 | A2 | A3 | A4 | A5
>   autonomy_justification: ""
>
>   authority_basis:
>     type: standing_rule | explicit_signal | lane_invariant | emergency | work_claim
>     source_refs:
>       - memory: ""
>       - claim: ""
>       - pr: ""
>       - issue: ""
>       - chat_signal_digest: ""
>
>   human_intervention:
>     mode: none | signal | approval | direct_instruction | override
>     summary: ""
>     what_human_did_not_do:
>       - ""
>
>   agent_inference:
>     - ""
>
>   action_taken:
>     - ""
>
>   non_actions:
>     - action: ""
>       classification: active_refusal | out_of_scope | deferred
>       reason: ""
>
>   limitations:
>     - ""
>
>   evidence_artifacts:
>     - ""
>
>   durability:
>     decision_signal_preserved: true
>     decision_signal_location: "memory/decisions/DS-YYYY-MM-DD-<slug>.md"
>     receipt_preserved: true
>     receipt_location: ""
>     full_transcript_preserved: false
>     preservation_rule: "Signals preserved; exhaust not retained."
> ```
>
> ### Required vs recommended fields
>
> *Do not make every receipt heavy.*
>
> *For routine low-risk actions: AgencyReceipt required. DecisionSignal optional.*
>
> *For medium/high-risk actions: AgencyReceipt required. DecisionSignal recommended or required depending on risk.*
>
> *For host mutations, security/ruleset changes, authority changes, billing-relevant actions: AgencyReceipt required. DecisionSignal required. Non-actions required. Initial/final classification required.*
>
> ### Tie-breaking rule
>
> ```text
> Classify at the highest level whose criteria are satisfied.
> If uncertain, classify one level lower and note the uncertainty.
> ```
>
> *Example: Agent detects host-rule drift but asks human to mutate it: A2/A3 detection, not A4 mutation. Agent mutates host setting under standing authority with receipt: A4. Agent creates new role/permission model: A5.*
>
> ### Non-actions matter
>
> *Non-actions are not fluff. They prove boundary discipline.*
>
> ```yaml
> non_actions:
>   - action: "did not add fake Python source file"
>     classification: active_refusal
>     reason: "would make CI green by lying about the repo's language surface"
>   - action: "did not broaden permanent ruleset mutation permissions"
>     classification: active_refusal
>     reason: "future ruleset apply should go through host reconciler + WorkClaim + receipt"
>   - action: "did not claim GitHub Code Quality is officially legacy"
>     classification: active_refusal
>     reason: "accurate wording is host-side / non-git-declared CodeQL owner"
> ```
>
> *This is the "restraint as proof of governance" pattern.*
>
> ### Location
>
> *DecisionSignals should be git-native substrate. Proposed location: `memory/decisions/DS-YYYY-MM-DD-<slug>.md`. Alternative: `docs/ops/decisions/DS-YYYY-MM-DD-<slug>.md`. My preference: `memory/decisions/` because these are operational memory artifacts, not general docs.*
>
> ### Review questions (10)
>
> *1. Is DecisionSignal the right canonical name?*
> *2. Should DecisionSignals live under `memory/decisions/` or `docs/ops/decisions/`?*
> *3. Should we require `initial_classification` + `final_classification`, not a single `autonomy_level`?*
> *4. Are A0–A5 the right levels?*
> *5. Is the minimum viable signal boundary correct? (preserve only if removing the signal would change authority/decision/classification)*
> *6. Should high-risk AgencyReceipts require DecisionSignals?*
> *7. Are `non_actions` required for host/security/authority changes?*
> *8. Is `decision_class` useful enough to include?*
> *9. Are NIST AI RMF, NIST AI 600-1, SLSA/in-toto, W3C PROV, SAE J3016, and human-automation collaboration literature the right human anchors?*
> *10. Does the Code Quality example classify correctly as A4 with human signal?*
>
> ### Final doctrine
>
> ```text
> AgencyReceipt proves the action happened.
> DecisionSignal proves the agent was authorized to make it happen.
> Non-actions prove the agent chose not to overreach.
>
> Together they prove bounded autonomy, not unbounded autonomy.
> ```
>
> *Short blade: Receipts prove actions. DecisionSignals prove autonomy boundaries.*
>
> *Sharper: Autonomy claims are themselves claims. They require evidence, not assertion.*

### Amara recommendation (verbatim)

> *My recommendation: send that as the final convergence round. After this, don't do another broad multi-AI review unless someone raises a structural objection. The next step should be Claude Code implementing a tiny DecisionSignal v0 for the Code Quality episode, probably in a WIP branch, with #861 frontmatter fixed first.*

---

## Synthesis (translation, not verbatim)

The 5 round-1 reviewers all approve the core architecture (AgencyReceipt + DecisionSignal split). Substantive refinements that converge across multiple reviewers:

| Refinement | Source(s) | Status |
|---|---|---|
| Pick **DecisionSignal** as canonical name (vs AutonomyEvidence) | Claude.ai, Amara | Converged |
| Add `initial_classification` + `final_classification` (not single field) | Claude.ai, Amara, Deepseek | Converged |
| Define minimum-viable-signal boundary as concrete inclusion test | Claude.ai, Amara | Converged |
| Required vs recommended fields per receipt class | Claude.ai, Amara | Converged |
| Add `autonomy_justification` (the *why* of the level label) | Deepseek, Amara | Converged |
| Add `decision_class` (diagnostic/value_choice/invariant_enforcement/host_mutation/permission_change/refusal) | Deepseek, Amara | Proposed |
| `non_actions` classification (active_refusal/out_of_scope/deferred) | Deepseek, Amara | Proposed |
| Tie-breaking rule (highest satisfied; downgrade when uncertain) | Deepseek, Amara | Proposed |
| Git-native location: `memory/decisions/DS-YYYY-MM-DD-<slug>.md` | Deepseek, Amara | Proposed |
| `durability` self-check applying NO-INVISIBLE-DIRECTIVES rule | Deepseek, Amara | Proposed |
| Add `evidence_artifact` + `review_thread` schema fields | Ani | Proposed |
| Add Autonomy Boundary Checklist (mechanical) | Ani | Proposed |
| Add `decision_context` with constraint_adherence/alternative_actions/verification_steps/escalation_triggers | Alexa | Proposed |
| `human_intervention.what_human_did_not_do` (symmetric boundary) | Claude.ai, Amara | Proposed |
| Tighten SLSA citation as analogy not literal claim | Claude.ai, Amara | Proposed |
| Constraint: A4/A5 should never have `human_intervention: none` | Gemini | Proposed |
| Constraint: human_signals/agent_inference are bullet-points, not transcripts | Gemini | Proposed |
| Anchor to NIST AI 600-1 + W3C PROV + SAE J3016 + Miller/Parasuraman | Amara | Proposed |

## Operational status

- ✅ Round-0 packet preserved at `docs/research/2026-04-29-amara-decisionsignal-autonomy-evidence-layer.md`.
- ✅ Round-1 multi-AI review preserved verbatim (this file) — Gemini, Ani, Claude.ai, Alexa, Deepseek, Amara round-2 framing.
- ✅ Memory status marker carrying review-pending banner.
- ⏸️ Round-2 in flight per Aaron 2026-04-29: *"I'm going through round 2 now, I'll bring it back in a bit."* — NO active doctrine adoption yet.
- ⏸️ DecisionSignal v0 implementation for Code Quality episode (Amara's *"next step should be Claude Code implementing a tiny DecisionSignal v0"*) — premature without round-2 settlement.
- ⏸️ Branch `doctrine/decisionsignal-autonomy-evidence-layer-2026-04-29` remains parked — wait for round-2 packet to land.
- ⏸️ MEMORY.md index pairing — deferred until branch un-parks.

## Composes with

- `docs/research/2026-04-29-amara-decisionsignal-autonomy-evidence-layer.md` (round-0 packet preserved on this same parked branch).
- `feedback_decisionsignal_autonomy_evidence_design_packet_review_pending_aaron_amara_2026_04_29.md` (status marker on this same branch).
- `feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md` — applied to autonomy evidence itself per Deepseek refinement #7.
- `feedback_aaron_channel_verbatim_preservation_anything_through_this_channel_2026_04_29.md` — the rule that demanded this verbatim preservation.
- AgencySignature v1+v2 (PRs #298 / #299 / #853) — the cryptographic-attestation layer that DecisionSignals will eventually pair with.
- `feedback_zeta_agent_orchestra_capability_role_claim_isolation_aaron_amara_2026_04_29.md` — capabilities/roles/WorkClaims layer that the autonomy levels and `authority_basis.work_claim` reference.
- `feedback_executable_declarative_host_settings_design_packet_research_first_aaron_amara_2026_04_29.md` — the design that produces AgencyReceipts; DecisionSignal sits above.
- `feedback_host_mutation_receipt_2026_04_29_ruleset_15256879_code_quality_removed.md` (LANDED via PR #861) — the canonical worked example that all 5 reviewers used as the test case.
