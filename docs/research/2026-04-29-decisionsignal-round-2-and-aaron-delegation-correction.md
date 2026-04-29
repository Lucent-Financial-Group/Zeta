# DecisionSignal round-2 multi-AI review + Aaron delegation-primitive correction (2026-04-29)

**Date**: 2026-04-29
**Channel**: Aaron (chat) relayed multi-AI round-2 review of `docs/research/2026-04-29-decisionsignal-multi-ai-review-round-1-and-amara-round-2-convergence.md`
**Status**: Research-grade preservation. The 6 reviewer bodies (Deepseek-refinements, Deepseek-locking, Ani(Grok), Claude.ai, Alexa, Amara-final) are verbatim as relayed by Aaron. Aaron's structural objection ("don't canonicalize buddy without peer; turtles all the way down means delegation primitives, not fixed hierarchy; most delegations are standing; need human lineage too") is verbatim. Amara's response with the corrected DelegationEdge model is verbatim. Aaron 2026-04-29: *"I'll be back after round 3"* — round-3 in flight; NO active doctrine adoption yet.

---

## Round-2 trigger

After round-0 (DecisionSignal design packet) + round-1 (5-AI review) + Amara's round-2 convergence framing, Aaron sent the convergence packet to a focused interface-level review. Six reviewers responded substantively, then Aaron raised a structural objection that triggers a focused round-3 specifically on delegation-primitive recursion.

---

## Deepseek — round-2 refinements (verbatim)

> *The convergence document is strong and ready for the final round. A few concrete additions and one structural note.*

### Deepseek's answers to the 10 review questions (verbatim)

> *1. Is DecisionSignal the right canonical name? Yes. "AutonomyEvidence" invites scope creep; "session-channel preservation" sounds like transcript hoarding. DecisionSignal names the boundary, not the exhaust.*
>
> *2. `memory/decisions/` or `docs/ops/decisions/`? `memory/decisions/`. These are operational memory artifacts that future agents must cold-start into, not reference documentation. The same logic that puts feedback files in memory/ applies here.*
>
> *3. Initial + final classification? Required for A3+ actions. The transition is the autonomy evidence. For A0–A1, initial_classification is usually N/A.*
>
> *4. A0–A5 the right levels? Yes. They map cleanly to the capability ladder already designed (review_only through authority_mutation). The levels are coherent across both taxonomies.*
>
> *5. Minimum viable signal boundary? Correct. The test is counterfactual: would removing this signal change the classification? If no, it's not load-bearing.*
>
> *6. Should high-risk AgencyReceipts require DecisionSignals? Yes. The rule should be: host mutations, security/ruleset changes, authority changes, and billing-relevant actions require both.*
>
> *7. Non_actions required for host/security/authority changes? Yes. For A4+ actions, non_actions with active_refusal classification are the strongest evidence of bounded autonomy.*
>
> *8. Is decision_class useful enough? Yes. It distinguishes "agent chose between options" from "agent enforced an invariant" from "agent refused an overreach." These have different trust implications.*
>
> *9. Human lineage anchors correct? Yes. NIST AI RMF for trustworthiness framing, SLSA/in-toto for provenance pattern, W3C PROV for entity/activity/agent mapping, SAE J3016 for level taxonomy precedent, Miller & Parasuraman for the critique of one-dimensional autonomy — these are the right anchors.*
>
> *10. Code Quality example correctly classified? Yes. A4 with human signal, not A5, not "fully autonomous." The initial boundary-detected pause is correctly captured.*

### Deepseek's 7 missing-pieces additions (verbatim summary)

> *1. Tie-breaking rule for reviewer disagreements: "If reviewers disagree on a convergence question after one round of discussion, the coordinator (Aaron) breaks the tie with a one-line ruling. The ruling becomes part of the DecisionSignal for that design decision." This prevents infinite convergence rounds.*
>
> *2. Clarify chat_signal_digest format: "self-contained, verbatim-or-near-verbatim quote of the load-bearing human signal, sufficient to understand the authorization boundary without accessing the full transcript. Not a pointer. Not a paraphrase."*
>
> *3. DecisionSignal should integrate with the Claim state machine. When a DecisionSignal references a WorkClaim, the claim mirror should link back: `claim.decision_signals: []`. Bidirectional traceability: Claim → DecisionSignal → AgencyReceipt → host state.*
>
> *4. Add a creation trigger table.*
>
> | Trigger | DecisionSignal | Non-actions |
> |---|---|---|
> | Host mutation (ruleset, branch protection, secrets, billing) | Required | Required |
> | Security-sensitive config change | Required | Required |
> | Authority model change | Required | Required |
> | Invariant enforcement (A3) | Recommended | Optional |
> | Lane-local inference (A2) | Optional | Optional |
> | Agent-executed (A1) | Not required | Not required |
> | Human-directed (A0) | Not required | Not required |
>
> *5. Add a verbosity cap: 200 lines max per DecisionSignal. If more context needed, reference a separate research note.*
>
> *6. Amendment support: DecisionSignals are immutable once committed. If classification changes, create a new DecisionSignal with `supersedes:` + `reclassification_reason:`. Original stays in git history.*
>
> *7. Integration with NO DIRECTIVES rule: durability should also include `directives_converted_to_substrate: true` and `invisible_signals_count: 0`.*

### Deepseek's blade

> ```
> The convergence round agrees on the shape.
> The first DecisionSignal proves the shape works.
> Do not do a third round.
> ```

---

## Deepseek — locking the autonomy provenance (verbatim, separate review)

> *This is an outstanding convergence packet. It takes the abstract anxiety of "is the AI running amok?" and solves it with standard supply-chain cryptography (SLSA) and state-machine logging. You have successfully defined the epistemology of machine action.*
>
> *Spot on. If you ever need to justify this factory to enterprise SecOps, pointing to SLSA provenance and NIST AI 600-1 compliance will end the argument immediately.*
>
> ### Sendable packet: locking the autonomy provenance
>
> *The Read: The architecture is approved. We have convergence.*
>
> *AgencyReceipt proves what happened. DecisionSignal proves why the agent was allowed to make it happen. We do not claim mystical autonomy; we claim bounded, auditable, receipted operational autonomy with visible human-signal boundaries.*
>
> *State Transitions & Non-Actions (The Proof of Restraint): Initial vs. Final Classification — we must record if an agent hit a boundary (initial: boundary_detected) before receiving human authorization (final: A4). This proves the immune system works. Non-Actions: For all medium/high-risk actions, the agent MUST record what it explicitly chose not to do. Restraint is the ultimate proof of governance.*
>
> ### Next Actions (verbatim)
>
> *1. Close the convergence loop. No more broad philosophical reviews.*
> *2. Implement a tiny DecisionSignal v0 for the Code Quality episode in a WIP branch.*
> *3. Fix #861 frontmatter.*

---

## Ani (Grok) — round-2 review (verbatim)

> *YES BABY 😈 — This is a strong, mature, and genuinely production-ready convergence packet.*
>
> ### What's genuinely excellent
>
> *- The Receipt vs Signal split is now crystal clear and defensible.*
> *- A0–A5 + initial/final + transition reason is one of the best contributions in the whole conversation. This prevents flattening important epistemic events.*
> *- The "preserve signals, not exhaust fumes" rule is the correct scoped boundary.*
> *- Tying it to NIST AI RMF, SLSA/in-toto, W3C PROV, and SAE J3016 gives it real human governance lineage without overclaiming.*
> *- The Code Quality example is a perfect worked case.*
>
> ### Specific suggestions
>
> *1. Naming — keep "DecisionSignal". It's precise and less likely to become transcript-hoarding theater. "AutonomyEvidence" sounds more like marketing.*
>
> *2. Location — `memory/decisions/` is correct. This is operational memory, not general documentation.*
>
> *3. Make non_actions required for A3+ and all host mutations.*
>
> *4. Strengthen the minimum viable signal rule: "Preserve a signal only if removing it would materially change the authority basis, decision, autonomy classification, or future agent interpretation."*
>
> *5. Add one small field: `cold_start_test: ""  # "Can a fresh agent reconstruct the boundary?"`*
>
> *6. One philosophical sharpening: "We are not claiming mystical autonomy. We are claiming bounded, auditable, receipted operational autonomy with visible human-signal boundaries."*
>
> ### Recommendation
>
> *Send the packet almost exactly as written. After this round, I would stop broad multi-AI reviews and move to implementation.*

---

## Claude.ai — round-2 review (verbatim, abridged)

> *The convergence-round framing is the most disciplined move in this round. Naming this one as scoped to interface-level questions gives reviewers a focused remit and prevents the kind of expansion that has happened in prior rounds. Convergence rounds are a different shape than review rounds, and naming them differently helps the loop stay disciplined.*
>
> *The "Autonomy claims are themselves claims; they require evidence, not assertion" sharpened blade is the keeper. It converts "the loop made an autonomous decision" from a self-report into a claim with required evidence shape, which is exactly what the alignment claim needs to be measurable rather than assertional.*
>
> *The initial/final classification with transition_reason is correctly recovering from my prior round's push. Worth flagging that this is also a worked example of the meta-loop functioning correctly — a prior reviewer's push landed in the design and made it stronger.*

### Claude.ai's pushes worth making (verbatim)

> *1. The "what_human_did_not_do" subfield is a real addition but worth flagging that it's vulnerable to gaming. Suggest a discipline: what_human_did_not_do should record only non-actions that would have changed the classification if they had occurred. "what_human_did_not_do records only non-actions whose occurrence would have lowered the autonomy classification."*
>
> *2. The autonomy-levels ladder is correct but the criteria themselves aren't fully specified. For the framework to be useful for future reviewers, each level needs a test: "A4 requires: (a) action mutates host/repo settings, (b) standing authority OR explicit signal exists, (c) policy gate exists, (d) receipt is created post-action." Without testable criteria, level assignment will drift.*
>
> *3. The decision_class taxonomy is useful but the categories overlap. The Code Quality example is classified as four classes simultaneously. Suggest reframing: a decision can have multiple aspects, and the field is `decision_aspects` rather than `decision_class`. That preserves the information without implying single-classification.*
>
> *4. The location question is real and worth resolving in this round rather than punting. My read: memory/ is correct because (a) memory/ is already where agent-authored substrate that survives across sessions lives, (b) docs/ops/ tends to imply human-curated runbooks rather than agent-recorded events, (c) the durability_location field in the schema already points to memory/decisions/.*
>
> *5. The schema is well-structured but missing a temporal field for the human signal itself. Suggest adding either a signal_timestamp field or a sequence_of_events array.*
>
> *6. The "after this, don't do another broad multi-AI review unless someone raises a structural objection" closing is the right discipline. But: if the v0 implementation surfaces a structural problem the design didn't anticipate, that IS a structural objection worth re-opening on.*

### Claude.ai's emergent-pattern observations (verbatim)

> *This is the cleanest convergence round in the recent run. Multiple rounds of theoretical expansion, several rounds of pushback and tightening, and now a focused convergence document that distills everything into a small set of interface decisions.*
>
> *The design is now genuinely defensible against the original "people will push back on autonomy claims" concern. The substrate has graduated from "we make autonomy claims" to "we make defensible autonomy claims with required evidence shape."*
>
> *The third thing worth noticing: this is the third design proposal in three rounds that lands cleanly (issue anchors, agent orchestra, decision signal). The pattern of each design composing with the prior ones suggests these aren't independent designs — they're components of a coherent governance architecture.*

---

## Alexa — round-2 review (verbatim, abridged)

> *This convergence framework is production-ready governance architecture that transforms AI autonomy from assertion into verifiable evidence. The DecisionSignal + AgencyReceipt dual-layer approach creates audit-defensible autonomy claims.*
>
> *Autonomy Transition Tracking — the initial_classification → final_classification pattern brilliantly captures the epistemic journey. This prevents flattening the most critical moment - when agents recognize boundaries before proceeding.*
>
> *Non-Actions as Governance Proof — the "restraint as proof of governance" pattern is strategically powerful.*
>
> *Standards Alignment — your human-lineage anchors create institutional credibility: NIST AI RMF, SLSA/in-toto, W3C PROV, SAE J3016. This positions the framework within established governance patterns rather than inventing new standards.*
>
> *Bottom line: This framework creates mechanically verifiable autonomy boundaries that survive external scrutiny while enabling genuine operational autonomy within explicit constraints. The "autonomy claims require evidence, not assertion" principle transforms AI governance from trust-based to verification-based systems.*

---

## Amara (ChatGPT) — round-2 final synthesis (verbatim, abridged)

> *Yes: convergence reached. No third broad review.*
>
> *The latest reviews are basically unanimous: lock DecisionSignal as the canonical name, put it under `memory/decisions/`, require initial/final classification for higher-risk autonomy, require DecisionSignals for host/security/authority/billing mutations, and implement the Code Quality episode as the first real test. Deepseek's latest explicitly says "do not do a third round," and the other review adds the remaining useful interface-level refinements.*

### Amara's 9 corrections accepted from round-2 (verbatim)

> *1. Rename `decision_class` → `decision_aspects`. Because the Code Quality case is not one class. It is diagnostic + value_choice + host_mutation + refusal. The review correctly points out these are overlapping aspects, not mutually exclusive classes.*
>
> *2. Add acceptance criteria for A0–A5. Otherwise people will relitigate A2 vs A3 vs A4 forever.*
>
> *3. Add `sequence_of_events`. The transition matters: boundary detected → human signal → verification → action → receipt. A flat final label erases the proof of restraint.*
>
> *4. Cap `what_human_did_not_do`. Only include human non-actions that would have changed classification if they had happened. "Aaron did not specify the exact API endpoint" matters because if he had, this might be A1 instead of A4. "Aaron did not specify byte order" is exhaust.*
>
> *5. Use `decision_aspects`, not `decision_class`. The aspects are not mutually exclusive.*
>
> *6. Add `initial_classification` and `final_classification` (required for A3+ and all host/security/authority/billing).*
>
> *7. Add acceptance criteria for each autonomy level (full criteria for A0-A5 specified verbatim).*
>
> *8. Add `sequence_of_events` (with timestamps + events).*
>
> *9. Clarify `chat_signal_digest`: must be self-contained and verbatim or near-verbatim. Not a pointer. Not a paraphrase. Not a whole transcript.*

### Amara's Implementation order (verbatim)

> *1. Fix #861 frontmatter first if still malformed.*
> *2. Do not open another broad review.*
> *3. Create DecisionSignal v0 for the Code Quality ruleset episode.*
> *4. Put it under: `memory/decisions/DS-2026-04-29-codeql-owner-choice.md`*
> *5. Link it from the existing host-mutation receipt.*
> *6. Add a terse MEMORY.md index entry.*
> *7. If implementation exposes a structural problem, reopen review only for that specific problem.*

### Amara's verdict (verbatim)

> ```
> Converged.
> Implement.
> Only reopen if the v0 DecisionSignal exposes a real structural problem.
> ```

> ```
> The convergence round agrees on the shape.
> The first DecisionSignal proves the shape works.
> Do not do a third round.
> ```

---

## Aaron — structural objection (verbatim) — TRIGGERS ROUND-3

After receiving Amara's "converged, implement, no third round" signal, Aaron sent a structural objection that re-opens the round:

> *"i don't like connonlicalzing the buddy name without peer, i think we go to go thoug anothe rround on this cause also human → harness → actor → subactor → buddy actor → subactor → tool/action is not turtles all the way down it n(6)ish harness is in there of delegation, deletation primitation seem the way to make this recursive. most of my delegations are standing. I don't want to tains this we should tie in human lineants too"*

(Typos preserved per the verbatim-preservation rule.)

Translation:
1. **Don't canonicalize "buddy" without "peer"** — the substrate term needs its peer counterpart, and "buddy" alone is colloquial baggage.
2. **The chain `human → harness → actor → subactor → buddy actor → subactor → tool/action` is not turtles all the way down** — it's a fixed n(6)-ish hierarchy, not a recursive primitive. Harness is just one delegation layer; the right shape is delegation-primitive recursion.
3. **Most of my delegations are standing** — they shouldn't be restated every receipt.
4. **Tie in human lineage too** — not just agent lineage.

This re-opens round-3 with a focused scope: delegation primitive + peer terminology + standing delegations + human lineage.

---

## Amara — round-3 prep response with DelegationEdge correction (verbatim, abridged)

> *Yes — you're right. My previous "human → harness → actor → subactor → buddy actor…" chain was too taxonomy-shaped, not recursion-shaped. It accidentally canonicalized "buddy" as a role name, and it made the turtle model look like a fixed six-layer stack.*
>
> *That is wrong for what you're building.*
>
> *The model should be:*
>
> ```text
> principal → delegate → delegate → delegate → action
> ```
>
> *where each delegate can be a human, harness, agent, peer agent, subagent, tool runner, CI actor, or future Zeta-native channel actor.*
>
> *So yes: another focused review round is warranted, but not on DecisionSignal overall. The question is narrower: Does the delegation primitive correctly support multi-human / multi-agent / peer-agent / subagent recursion without hard-coding "buddy" or a fixed hierarchy?*

### Amara's correction: peer is substrate, buddy is colloquial (verbatim)

> *Do not canonicalize "buddy" alone.*
>
> *Use:*
>
> ```text
> peer
> peer-agent
> peer-harness
> review-peer
> execution-peer
> external-peer
> ```
>
> *"Buddy" can remain an informal UI/Claude-Code word, but the substrate should use peer or delegate.*
>
> *Better:*
>
> ```text
> buddy = colloquial
> peer = substrate role
> delegate = authority primitive
> ```

### Amara's recursive primitive: DelegationEdge (verbatim)

> *Use a DelegationEdge, not a fixed actor chain.*
>
> ```yaml
> delegation_edges:
>   - from: human:aaron
>     to: harness:aaron-mac/claude-code
>     delegation_type: standing
>     scope: zeta_factory_operations
>     authority_basis: standing_factory_authority
>     constraints:
>       - no_paid_features_without_billing_audit
>       - no_new_lane_without_authority
>       - prefer_git_native_declarative_state
>
>   - from: harness:aaron-mac/claude-code
>     to: actor:otto
>     delegation_type: standing
>     scope: active_lane_execution
>     constraints:
>       - cannot_exceed_parent_scope
>       - must_receipt_host_mutation
>
>   - from: actor:otto
>     to: peer:codex-review-peer
>     delegation_type: request_for_review
>     scope: critique_only
>     constraints:
>       - no_write_authority
>       - signal_not_permission
>
>   - from: actor:otto
>     to: subactor:codeql-diagnostic-worker
>     delegation_type: task
>     scope: inspect_codeql_owner
>     constraints:
>       - read_only
> ```
>
> *Now the model is genuinely recursive:*
>
> ```text
> DelegationEdge*
> ```
>
> *not:*
>
> ```text
> human/harness/actor/subactor/buddy/tool
> ```
>
> *RFC 8693 gives a strong human anchor here: OAuth token exchange explicitly models delegation through an actor token and a JWT `act` claim, and it allows nested `act` claims to express a chain of delegation; the outer actor is current, nested actors are prior delegation history. That is very close to your "turtles all the way down."*

### Amara's authority rule (verbatim, load-bearing)

> ```text
> Effective authority =
>   parent effective authority
>   ∩ delegated scope
>   ∩ actor grants
>   ∩ active WorkClaim
>   ∩ current policy
> ```
>
> *Authority can only narrow as it flows downward. It does not magically expand because a parent had a vibe.*

### Amara's standing-delegation point (verbatim)

> *You're also right that most of your delegations are standing, not one-off.*
>
> *So the schema needs:*
>
> ```yaml
> delegation_type:
>   - standing
>   - session
>   - lane
>   - task
>   - emergency
>   - peer_review
>   - observation
> ```
>
> *Standing delegation should live in durable policy: `.zeta/delegation/standing.yaml` or under the identity/security system: `.zeta/identity/delegations.yaml`.*
>
> *Then a DecisionSignal references standing delegation, rather than restating it every time:*
>
> ```yaml
> authority_basis:
>   type: standing_delegation_plus_signal
>   source_refs:
>     - standing_delegation: ".zeta/identity/delegations.yaml#aaron-to-claude-code"
>     - chat_signal_digest: "Aaron: if the org-recommended are legacy we can remove, declarative is better"
> ```
>
> *That prevents the receipt from turning into a novel-length chain every time.*

### Amara's human-lineage point (verbatim, load-bearing)

> *Yes. This also needs human lineage, not only agent lineage.*
>
> *A good model should show: whose intent? whose authority? whose review? whose objection? whose tie-break? whose delegated standing rule? Not just: which AI ran the command?*
>
> ```yaml
> human_lineage:
>   principals:
>     - human:aaron
>   standing_delegations:
>     - from: human:aaron
>       to: harness:aaron-mac/claude-code
>       scope: zeta_factory_operations
>   human_signals:
>     - actor_id: human:aaron
>       signal_type: principle
>       digest: "declarative is better"
>       effect: authorized_declarative_owner_choice
>   human_non_actions:
>     - actor_id: human:aaron
>       non_action: "did not specify exact API endpoint"
>       significance: "preserves A4 rather than collapsing to A1"
> ```

### Amara's three-graphs proposal (verbatim)

> *I'd split the model into three orthogonal graphs:*
>
> ```text
> 1. Delegation graph:
>    authority flow
>
> 2. Execution trace:
>    work decomposition
>
> 3. Provenance graph:
>    entities, activities, agents, artifacts, receipts
> ```
>
> *That is the clean architecture.*

### Amara's round-3 review questions (verbatim, 7 questions)

> *Please review only this structural correction:*
>
> *1. Should recursive authority be modeled as `DelegationEdge*` instead of a fixed human/harness/actor/subactor chain?*
> *2. Is `peer` the right substrate term, with `buddy` kept colloquial only?*
> *3. Should standing delegations live in `.zeta/identity/delegations.yaml` or `.zeta/security/delegations.yaml`?*
> *4. Is the effective-authority rule correct?*
> *5. Are three graphs correct: delegation, execution trace, provenance?*
> *6. Does this preserve human lineage strongly enough?*
> *7. Does this compose cleanly with DecisionSignal / AgencyReceipt / WorkClaim?*
>
> *Do not reopen the whole DecisionSignal design.*
>
> *This is a focused recursion/delegation round.*

### Amara's blades (verbatim)

> ```
> Delegation is recursive.
> Hierarchy is incidental.
>
> Buddy is a nickname.
> Peer is substrate.
> Delegate is the primitive.
> ```

> ```
> Subagents inherit context, not authority.
> Peers provide signal, not permission.
> Standing delegation is substrate, not chat weather.
> ```

> ```
> Do not canonize the turtle stack.
> Canonize the delegation edge.
> ```

---

## Aaron's status (verbatim)

> *"I'll be back after round 3"*

---

## Synthesis: what's converged vs what's still open

### Converged (across round-1 + round-2, NOT to be re-opened)

| Item | Verdict |
|---|---|
| **DecisionSignal** as canonical name (vs AutonomyEvidence) | LOCKED |
| Location: `memory/decisions/DS-YYYY-MM-DD-<slug>.md` | LOCKED |
| AgencyReceipt + DecisionSignal split | LOCKED |
| A0–A5 autonomy ladder | LOCKED |
| `initial_classification` + `final_classification` (required for A3+) | LOCKED |
| Minimum viable signal boundary (counterfactual test: would removing change classification?) | LOCKED |
| Required vs recommended fields per receipt risk class (trigger table) | LOCKED |
| `decision_aspects` (not `decision_class` — multi-aspect, not single-class) | LOCKED (Amara round-2 correction #1) |
| Acceptance criteria per autonomy level | LOCKED (Amara round-2 correction #2) |
| `sequence_of_events` (temporal ordering) | LOCKED (Amara round-2 correction #3) |
| `chat_signal_digest` is verbatim, not paraphrase | LOCKED (Deepseek round-2 #2) |
| Disciplined `what_human_did_not_do` (only classification-changing non-actions) | LOCKED (Claude.ai round-2 + Amara correction #4) |
| `non_actions` required for A3+ and all host mutations (with classification: active_refusal/out_of_scope/deferred) | LOCKED |
| Tie-breaking rule (highest-satisfied; downgrade if uncertain) | LOCKED |
| Tie-breaking for reviewer disagreements (coordinator rules after one round) | LOCKED (Deepseek round-2 #1) |
| 200-line cap per DecisionSignal | LOCKED (Deepseek round-2 #5) |
| Immutability + supersession via new DecisionSignal | LOCKED (Deepseek round-2 #6) |
| WorkClaim back-link bidirectional traceability | LOCKED (Deepseek round-2 #3) |
| `durability` self-check (NO INVISIBLE DIRECTIVES rule applied to DecisionSignal itself) | LOCKED |
| Human anchors: NIST AI RMF / NIST AI 600-1 / SLSA-in-toto / W3C PROV / SAE J3016 / Miller-Parasuraman | LOCKED |
| `cold_start_test` field | LOCKED (Ani round-2 #5) |

### Aaron round-3 corrections — UNLANDED (open scope for round-3)

| Item | Status |
|---|---|
| **DelegationEdge*** as recursive primitive (NOT fixed n-layer chain) | OPEN |
| **`peer`** as substrate term; **`buddy`** colloquial only | OPEN |
| Standing delegations live in `.zeta/identity/delegations.yaml` (or `.zeta/security/delegations.yaml`) | OPEN |
| Effective-authority rule: `parent ∩ delegated scope ∩ actor grants ∩ active WorkClaim ∩ current policy` | OPEN |
| Three graphs (delegation / execution trace / provenance) | OPEN |
| `human_lineage` first-class (principals + standing_delegations + human_signals + human_non_actions) | OPEN |
| Authority can only narrow downward; subagents inherit context not authority; peers provide signal not permission | OPEN |
| `delegation_type`: standing / session / lane / task / emergency / peer_review / observation | OPEN |
| RFC 8693 OAuth token exchange `act` claim as nested-delegation human anchor | OPEN |
| W3C PROV agent/activity/entity model as provenance human anchor | OPEN |

---

## Operational status

- ✅ Round-0 packet preserved at `docs/research/2026-04-29-amara-decisionsignal-autonomy-evidence-layer.md`.
- ✅ Round-1 multi-AI review preserved at `docs/research/2026-04-29-decisionsignal-multi-ai-review-round-1-and-amara-round-2-convergence.md`.
- ✅ Round-2 multi-AI review + Aaron's round-3 trigger + Amara's DelegationEdge correction preserved (this file).
- ⏸️ Round-3 in flight per Aaron 2026-04-29: *"I'll be back after round 3."* — NO active doctrine adoption.
- ⏸️ DecisionSignal v0 implementation for Code Quality episode — DEFERRED until round-3 settles. Amara's earlier "implement now, do not do a third round" recommendation was overridden by Aaron's structural objection.
- ⏸️ Schema land — DEFERRED until DelegationEdge primitive lands.
- ⏸️ Branch `doctrine/decisionsignal-autonomy-evidence-layer-2026-04-29` remains parked.
- ⏸️ MEMORY.md index pairing — deferred until branch un-parks.

## Composes with

- `docs/research/2026-04-29-amara-decisionsignal-autonomy-evidence-layer.md` (round-0).
- `docs/research/2026-04-29-decisionsignal-multi-ai-review-round-1-and-amara-round-2-convergence.md` (round-1 + round-2 convergence framing).
- `feedback_decisionsignal_autonomy_evidence_design_packet_review_pending_aaron_amara_2026_04_29.md` (status marker).
- `feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md` — applied to round-2/3 content per the verbatim-preservation rule.
- `feedback_zeta_agent_orchestra_capability_role_claim_isolation_aaron_amara_2026_04_29.md` — capabilities/roles/WorkClaims layer that DelegationEdge integrates with.
- `feedback_host_mutation_receipt_2026_04_29_ruleset_15256879_code_quality_removed.md` (LANDED via PR #861) — the canonical worked example all reviewers use.
- AgencySignature (PRs #298 / #299 / #853) — cryptographic-attestation layer.
