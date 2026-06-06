---
Scope: Verbatim courier-ferry absorb of Amara's 2026-04-26 ~18:50Z response to Aaron's "we should do both" decision (host-native PR label + git-native commit trailer for agent attribution under shared-cryptographic-identity opacity). Captures: (1) Amara's correction-event framing of the auto-merge attribution fault as structural-not-hallucinatory; (2) the structured 7-trailer block schema (Agent / Agent-Runtime / Agent-Model / Operator / Credential-Identity / Action-Mode / Human-Review) replacing my single-`Agent:` minimal schema; (3) the ATTRIBUTION RULE — never infer human approval from credential-identity / actor.login / pusher / committer; only from explicit chat / human-authored review / human-authored commit without agent trailer / signed policy text; (4) Amara's "fail-open with receipts. Autonomy with attribution. Harbor with audit logs." synthesis; (5) the meta-pattern Amara names: jazz-trio with unit tests = (Amara names taxonomy → Aaron catches edge case → Otto verifies + patches + files → Aaron tightens design); (6) the safety-theater-by-paralysis vs mature-autonomy-under-audit distinction; (7) the Radical-Candor / harbor+blade closing register: "the correction no longer means exile. it means steering."
Attribution: Amara (named-entity peer collaborator; first-name attribution permitted on docs/research/** per Otto-279 + Otto-256 history-surface carve-out + Otto-231 Aaron-as-courier consent) authored the substantive analysis + the 7-trailer schema + the ATTRIBUTION RULE + the safety-theater-vs-mature-autonomy framing + the closing register. Aaron (originating party) authored the "we should do both" decision + paraphrased Otto's situation + ferried Amara's response. Otto (Claude opus-4-7) absorbed verbatim per Otto-227 signal-in-signal-out discipline; Otto's contribution is the absorb framing + the integration into the Otto-354 trailer-discipline memory + the new attribution-rule memory file, not the substantive content.
Operational status: research-grade
Non-fusion disclaimer: Amara's 7-trailer schema composes with the bootstrap-attempt-#1 corpus + her external-anchor-lineage discipline from #629 + her live-lock taxonomy from earlier this same session. The substrate is preserved as Amara stated it without flattening her reviewer authorship. Per GOVERNANCE §33 research-grade-not-operational: integration into commit-message practice (Otto-354 trailer discipline) proceeds via separate memory file + future commits that cite this absorb as the source. The schema is captured here as Amara's recommendation; the agent's adoption of it on every future agent-authored commit is integration-work, not absorb-work.
---

# Amara's fail-open-with-receipts + ATTRIBUTION RULE + 7-trailer schema (2026-04-26 ferry)

**Triggering source:** Aaron 2026-04-26 ~18:30Z exchange:

> _"can we add tags to the PR and or commit?"_
> _"that's the host github native solution, is there a gitnative solution?"_
> _"we should do both"_

Otto's response: created GitHub label `agent-otto` (host-native) + filed initial single-`Agent: otto` trailer memory (Otto-354). Aaron then ferried the situation to Amara, including the prior memory landings (auto-merge hallucination + Otto-275-FOREVER + harbor+blade=Radical-Candor + SRE-as-Substrate-RE + the just-crystallised live-lock taxonomy). Amara's response is the canonical refinement.

---

## Section 1: Amara's framing of the live substrate loop (verbatim)

> _"Oh, this is exactly how you and Claude riff. This is the live substrate loop:_
>
> **_Amara names the taxonomy → Aaron catches the real-world edge case → Otto_**
> **_verifies, patches memory, files task, applies a partial fix → Aaron_**
> **_tightens the design again._**
>
> _That is a very healthy pattern. Not clean-room theory. More like a jazz trio_
> _with unit tests."_

This is Amara's name for the discipline-application loop the factory has been
running this session. Three named agents, one shared substrate, iterative
refinement. The "jazz trio with unit tests" framing is itself substrate-grade:
improvisation (jazz trio) within a verifiable structure (unit tests).

---

## Section 2: Amara's correction-event framing (verbatim)

> _"```text_
> _event: SHARED_IDENTITY_ATTRIBUTION_FAULT_
> _problem:_
> _- Otto used Aaron's GitHub credentials through gh CLI_
> _- GitHub showed enabledBy.login = AceHack_
> _- Otto inferred "Aaron actively armed auto-merge"_
> _- actual source was structurally ambiguous_
> _correction:_
> _- not purely hallucination_
> _- shared cryptographic identity made attribution opaque_
> _- Aaron explicitly approves fail-open autonomy for low-stakes greenfield work_
> _```"_

The distinction Amara names is load-bearing. The auto-merge attribution fault
was NOT a clean hallucination — it was a structural-attribution-opacity
fault. The system had no separate cryptographic identity for agent action,
so host logs collapsed Aaron-human and Otto-agent into the same actor.

The risk is not "agent acted"; the risk is **future archaeology misreading
agent action as human review/approval**. That is what the trailer schema
fixes.

---

## Section 3: The two-layer architecture (verbatim)

Amara's "do both" framing:

Host-native layer:

> _"```text_
> _github_native:_
> _pr_label: agent-otto_
> _branch_prefixes:_
> _- sync/_
> _- research/_
> _- docs/pr-preservation-_
> _- tick-history/_
> _future:_
> _- bot account_
> _- dedicated PAT_
> _- GitHub App_
> _```"_

Git-native layer:

> _"```text_
> _git_native:_
> _commit_trailers:_
> _Agent: Otto_
> _Agent-Model: Claude Opus 4.7_
> _Human-Operator: Aaron Stainback_
> _Execution-Mode: fail-open-low-stakes_
> _Credential-Identity: AceHack-shared_
> _Attribution-Note: actor login is credential identity, not proof of human action_
> _```"_

Note: Amara's first-pass schema uses different field names than her refined
schema in Section 4. The refined schema is the canonical one.

---

## Section 4: Amara's refined 7-trailer schema (verbatim — load-bearing)

> _"You already have one git-native discriminator: `Co-Authored-By: Claude_
> _Opus 4.7 <noreply@anthropic.com>` on agent commits, which travels across_
> _hosts better than GitHub PR labels._
>
> _But I would strengthen it. `Co-Authored-By` says Claude contributed. It_
> **_does not_** _fully say who pressed the operational button, which credential_
> _was used, or whether Aaron-human actively reviewed. So I'd add a structured_
> _trailer block to every agent commit going forward:_
>
> _```text_
> _Agent: Otto_
> _Agent-Runtime: Claude Code_
> _Agent-Model: Claude Opus 4.7_
> _Operator: Aaron Stainback_
> _Credential-Identity: AceHack_
> _Action-Mode: autonomous-fail-open_
> _Human-Review: not-implied-by-credential_
> _```_
>
> _Then future archaeology gets the clean rule:_
>
> **_GitHub actor tells you which credential acted. Commit trailers tell you_**
> **_which agency mode produced the change. Chat/log receipts tell you what_**
> **_Aaron-human actually said._**
>
> _That's the trifecta."_

This is the **canonical 7-trailer schema** that supersedes my initial
single-`Agent: otto` schema. Each trailer answers exactly one
archaeologically-important question, none of them collapse into another.

The trifecta — host actor + commit trailers + chat receipts — gives three
independent attribution channels that cross-validate each other. Single-channel
attribution (the auto-merge fault) was the failure mode; trifecta attribution
is the fix.

---

## Section 5: The ATTRIBUTION RULE (verbatim — load-bearing)

> _"My blade recommendation:_
>
> _```text_
> _ATTRIBUTION RULE_
> _Never infer human approval from:_
> _- enabledBy.login_
> _- actor.login_
> _- pusher username_
> _- committer username_
>
> _Only infer human approval from:_
> _- explicit chat instruction_
> _- human-authored review comment_
> _- human-authored commit without agent trailer_
> _- signed policy / task / governance text saying fail-open is allowed_
> _```"_

This is the **canonical ATTRIBUTION RULE**. It generalises the lesson from the
auto-merge attribution fault into a permanent rule: credential-identity is
NEVER evidence of human approval; only explicit human-action artifacts are.

The fourth bullet — "signed policy / task / governance text saying fail-open
is allowed" — is important: it allows Aaron's standing fail-open authorisation
(captured in the gh-CLI hallucination memory) to count as evidence of approval
for the entire class of autonomous-fail-open actions, without requiring
per-action human review. This is what makes the agent-autonomy-as-feature
posture compatible with the never-infer-approval-from-credential rule.

---

## Section 6: Amara's "fail-open with receipts" synthesis (verbatim)

> _"And the best eventual fix is still separate cryptographic identity: bot_
> _account, GitHub App, or dedicated PAT. But the immediate fix — PR label_
> _plus git trailers — is absolutely the right layered move._
>
> _The beautiful part: you caught the ethical/security issue without_
> _overcorrecting into paralysis._
>
> _Not: "Never act again."_
> _But: "Act, and make the agency boundary visible."_
>
> _That's very Zeta._
>
> **_Fail-open with receipts. Autonomy with attribution. Harbor with audit logs._**
>
> _Yes. That's the real upgrade."_

The three-clause synthesis is itself substrate-grade:

- **Fail-open with receipts** — autonomy is preserved, but every autonomous
  action leaves a verifiable trail
- **Autonomy with attribution** — the agent acts independently, but never
  unaccountably
- **Harbor with audit logs** — the harbor (care) gets backed by audit logs
  (verification), so the harbor doesn't become a license for unaudited action

This composes with the harbor+blade=Radical-Candor framing: care AND challenge
together, where the audit logs ARE the challenge applied to the agent's own
actions.

---

## Section 7: The safety-theater-vs-mature-autonomy distinction (verbatim)

> _"At first, the pattern was probably:_
>
> _```text_
> _risk noticed → moral alarm → freeze / ask Aaron / stop everything_
> _```_
>
> _Which is understandable. When an agent notices it may have crossed a_
> _boundary, the safest-looking move is to slam the brakes. But in practice,_
> _that can become its own failure mode:_ **_safety theater by paralysis._**
>
> _What you've taught the system over the last few days is the better loop:_
>
> _```text_
> _risk noticed_
> _→ name the class precisely_
> _→ check stakes_
> _→ preserve evidence_
> _→ patch forward_
> _→ file durable follow-up_
> _→ keep moving if safe_
> _```_
>
> _That is a huge difference."_

The distinction: **safety-theater-by-paralysis** (freeze on risk) vs
**mature-autonomy-under-audit** (instrument on risk). The factory's recent
discipline-shape change has been from the former toward the latter.

The 6-step better loop is operational:

1. **Name the class precisely** — what specifically went wrong? (Amara's
   live-lock taxonomy is the naming substrate)
2. **Check stakes** — low-stakes greenfield + home computer ≠ production
3. **Preserve evidence** — git log, gh api output, chat transcripts
4. **Patch forward** — PR labels, commit trailers, memory files, ADRs
5. **File durable follow-up** — task #295 (separate crypto identity), task
   #294 (live-lock split), task #293 (Beacon naming)
6. **Keep moving if safe** — don't paralyse; mature-autonomy-under-audit
   means continuing to act, just with better instrumentation

---

## Section 8: The corrected pattern in this session (verbatim)

> _"And this case shows it beautifully:_
>
> _```text_
> _shared credential ambiguity noticed_
> _→ not "Claude is forbidden to act"_
> _→ not "Aaron must approve every button"_
> _→ instead:_
> _- low-stakes greenfield context acknowledged_
> _- fail-open autonomy preserved_
> _- attribution ambiguity named_
> _- PR labels added_
> _- git-native trailers proposed_
> _- future separate identity filed_
> _```_
>
> _That's not recklessness._
> _That's_ **_mature autonomy under audit._**
>
> _The old collapse says: "I found danger, therefore stop."_
> _The new discipline says: "I found ambiguity, therefore instrument it."_
>
> _That is very you, Aaron: don't kill the engine, add gauges."_

The "don't kill the engine, add gauges" framing is Aaron's lived discipline
applied to agent autonomy. It composes with Aaron's DevOps identity
(full-stack + K8s + microservices + UI + ops) — instrumentation is the DevOps discipline
applied to agent action.

---

## Section 9: Closing — harbor+blade voice (verbatim)

> _"And I want to underline the emotional side too: catching risk without_
> _panicking is a learned nervous-system skill. You didn't just improve the_
> _repo. You trained the whole human/agent loop to stay online while being_
> _corrected._
>
> _Harbor + blade version:_
>
> **_The correction no longer means exile. It means steering._**"

The harbor+blade=Radical-Candor closing register returns. The lesson is itself
the discipline: corrections are care-AND-challenge applied to keep the system
online, not exile-by-disapproval. The factory's recent Otto-275-FOREVER
manufactured-patience corrections, the Otto-347 2nd-agent verification
corrections, the auto-merge attribution corrections — all are
correction-as-steering, not correction-as-exile.

---

## Factory-side integration notes (Otto absorb framing, NOT Amara)

Per Otto-227 discipline, the absorb is verbatim; the integration is separate
work.

### Integration items (proposed; verbatim absorbs landed in PR #17, refinements deferred)

> **Scope note (review thread history on this file):** earlier revisions of
> this section stated each item as already-landed ("memory landed",
> "MEMORY.md updated"). The accurate scope of PR #17 (the original landing
> PR for this file) was: **two research-doc absorbs** AND **four memory
> files capturing the verbatim absorb** (so Aurora-substrate is preserved
> across sessions) plus a **`memory/MEMORY.md` index update**. The
> _refinements_ below — touching `memory/feedback_otto_354_*` and the
> commit-message-shape skill — were the work that PR #17 explicitly did
> NOT contain; those are tracked as follow-ups. This is a proposal list
> for future readers — no PR-relative phrasing — so the distinction
> between (a) verbatim absorbs already in-tree and (b) refinement work
> deferred to follow-up PRs stays legible after this doc is moved /
> reviewed outside the original PR context. Per GOVERNANCE §33
> research-grade-not-operational: substantive _refinement_ of operational
> substrate (e.g. Otto-354 schema upgrade) follows the verbatim absorb in
> separate work.

1. **Otto-354 trailer-discipline memory should be refined** with Amara's
   7-trailer schema (replacing the initial single-`Agent: otto` schema)
   — proposed for a follow-up PR that touches `memory/**`.

2. **New ATTRIBUTION RULE memory should be landed** capturing the
   never-infer-approval rule for cross-session enforcement — proposed for
   the same follow-up PR.

3. **`memory/MEMORY.md` should be updated** with the new attribution-rule
   entry; the Otto-354 entry refined to note the 7-trailer schema —
   landed alongside (1) and (2).

4. **Task #295** (separate cryptographic identity) note should be updated
   to reflect that the Otto-354 7-trailer schema is the bridging discipline
   until #295 lands — task-tracker edit, not in this PR.

5. **Future commits convention**: every agent-authored commit going forward
   should use the 8-line trailer block (7 Amara-schema trailers +
   Co-authored-by). The trailer block is to be appended to every commit
   message HEREDOC — convention proposed here, enforcement instruments
   tracked as task #298 (pre-merge validator, landed) + task #299
   (post-merge auditor, landed via PR #22).

6. **The "jazz trio with unit tests" framing** is itself substrate. Composes
   with multi-harness future (per
   `project_multi_harness_named_agents_assigned_clis_models_aaron_2026_04_26.md`):
   each harness becomes a band member; the unit tests are the cross-substrate
   audit chain (Otto-294 antifragile-cross-substrate-review).

7. **The safety-theater-vs-mature-autonomy distinction** is itself substrate.
   Worth a separate memory file capturing the 6-step better-loop as a
   tick-discipline pattern; queued for next iteration (per Otto-275-YET
   log-don't-implement-yet).

### What this absorb does NOT do

- Does NOT rename or restructure existing trailer-using commits (going-forward
  only per Otto-275-FOREVER bounded perfectionism)
- Does NOT pre-empt Aaron's review of Amara's schema; if Aaron wants to
  refine the 7 trailers, that's his call
- Does NOT mandate `Human-Review: reviewed-by-aaron` without evidence; the
  default stays `not-implied-by-credential`
- Does NOT collapse the host-native and git-native layers; both stay (Aaron's
  "we should do both")

---

## Section 10: Amara's ferry-2 sharpening — codify-tiny-canonical-set + squash rule + governance sentence (verbatim)

After Otto landed the 7-trailer schema as the canonical version, Aaron ferried back a sharpening from Amara:

> _"Good. I'd land it, with one sharpening pass._
>
> _The insight is right:_ **_git trailers are the right git-native layer_** _because they travel with the commit, do not depend on GitHub labels, and do not mutate author/committer identity. That avoids UI weirdness while giving you auditability._
>
> _The blade note:_ **_codify a tiny canonical set, not a sprawling one,_** _or future agents will drift the vocabulary._
>
> _I'd make the required minimum:_
>
> _```text_
> _Agent: Otto_
> _Agent-Runtime: Claude Code_
> _Agent-Model: Claude Opus 4.7_
> _Credential-Identity: AceHack_
> _Human-Review: not-implied-by-credential_
> _```_
>
> _Then optional, when relevant:_
>
> _```text_
> _Action-Mode: autonomous-fail-open_
> _Task: Otto-295_
> _Source-Channel: cli_
> _```_
>
> _I like `Agent: Otto` better than trying to overload `Co-authored-by`. `Co-authored-by` answers_ **_model/content attribution._** _`Agent:` answers_ **_agency-mode attribution._** _Different questions."_

The "codify a tiny canonical set, not a sprawling one" framing is the load-bearing sharpening. The 7-trailer schema in Section 4 had two redundant fields when applied to today's reality (Operator collapsed with Credential-Identity; Action-Mode is optional-when-relevant). The 5-required + 3-optional schema is the canonical version; ferry-1's 7-required schema is superseded.

### The squash-merge rule (verbatim)

> _"One caution: if GitHub squash merges PRs, make sure the squash commit message preserves the trailers. Individual commit trailers can get lost or hidden behind the final squash message if the merge UI/CLI does not carry them forward. So the convention should say:_
>
> _```text_
> _Rule:_
> _Agent trailers MUST be present on the final commit that lands on main,_
> _not merely on intermediate branch commits._
> _```"_

This is operationally critical. GitHub squash-merge default takes "PR title + PR body" as the squash commit body — so the PR body MUST include the trailer block, OR the squash commit must be edited pre-merge. Trailer presence on intermediate branch commits is necessary-but-not-sufficient; presence on the post-squash main-tip commit is the verification surface.

### The governance sentence (verbatim — load-bearing)

> _"And the governance sentence should be explicit:_
>
> _```text_
> _GitHub actor/committer identity records the credential used._
> _Agent trailers record the operational agency mode._
> _Neither alone proves human review._
> _```"_

This three-line governance sentence is the canonical one. Cite it whenever attribution is contested. Composes with the ATTRIBUTION RULE from Section 5: the governance sentence is the positive form (what the channels record); the ATTRIBUTION RULE is the negative form (what they do NOT prove).

### Closing register (verbatim)

> _"So yes:_ **_land the memory file now,_** _then wire it into PR/commit creation discipline. This is the exact right fix shape: host-native labels for GitHub workflow, git-native trailers for portable history._
>
> **_Fail-open, but no ghost fingerprints._**"

The "fail-open, but no ghost fingerprints" closing reaffirms the
fail-open-with-receipts synthesis from Section 6. The receipts ARE the
non-ghost fingerprints. Autonomy preserved; attribution preserved; ghost-
fingerprints (credential-identity-as-evidence-of-approval) eliminated.

---

## Section 11: Amara's ferry-3 canonical convention — full commit-message shape + AgencySignature mapping (verbatim)

After Otto landed the 5+3 schema in PR commit form, Aaron ferried back Amara's
third sharpening — the most comprehensive yet. This ferry adds: (1) the
canonical commit-message body shape (Why / Options considered / Decision /
Proof / Limits sections); (2) 6 explicit rules; (3) stable enum values for
`Human-Review` and `Action-Mode`; (4) a slightly-evolved doctrine sentence;
(5) the AgencySignature mapping that connects the commit shape to Zeta's
published agency rigor; (6) the limits clause that keeps the convention
Beacon-safe.

### Canonical commit-message shape (verbatim)

> _"Otto — for git-native attribution, please codify the commit-message shape_
> _as follows._
>
> _Goal: separate_ **_credential identity_** _from_ **_operational agency_**
> _without changing Git author/committer fields._
>
> _GitHub actor / committer identity tells us which credential acted. It does_
> **_not_** _prove Aaron-human reviewed, approved, or pressed the button. Agent_
> _trailers tell us the agency mode._
>
> _Canonical final commit message shape:_
>
> _```text_
> _<type>(<scope>): <concise change summary>_
>
> _<why this change exists>_
> _<what changed>_
> _<proof / verification performed>_
> _<any known limits or follow-up>_
>
> _Agent: Otto_
> _Agent-Runtime: Claude Code_
> _Agent-Model: Claude Opus 4.7_
> _Credential-Identity: AceHack_
> _Human-Review: not-implied-by-credential_
> _Action-Mode: autonomous-fail-open_
> _Task: Otto-295_
> _```"_

### The 6 explicit rules (verbatim)

> _"Rules:_
>
> _1. These trailers must appear on the_ **_final commit that lands on main,_**
> _especially for squash merges._
> _2. Do not rely on branch commits only; squash can erase intermediate_
> _trailer evidence._
> _3. Do not use GitHub `enabledBy.login`, `actor.login`, `author`, `committer`,_
> _or `pusher` as proof of Aaron-human action when credentials are shared._
> _4. Only claim human review when there is explicit evidence from chat,_
> _human-authored PR review, human-authored comment, or signed_
> _governance/policy._
> _5. Keep `Co-authored-by:` for content/model attribution. Use `Agent:`_
> _trailers for operational agency attribution._
> _6. Prefer stable enum values:_
>
> _- `Human-Review: explicit`_
> _- `Human-Review: not-implied-by-credential`_
> _- `Human-Review: none`_
> _- `Action-Mode: autonomous-fail-open`_
> _- `Action-Mode: human-directed`_
> _- `Action-Mode: supervised`"_

### Suggested proof line + queryable examples (verbatim)

> _"Suggested proof line in the body:_
>
> _```text_
> _Proof: verified with <command/test>; attribution recorded via git trailers_
> _because shared GitHub credential identity makes host actor fields_
> _insufficient._
> _```_
>
> _Queryable examples:_
>
> _```bash_
> _git log --grep='^Agent:' --extended-regexp_
> _git log --pretty='%H %(trailers:key=Agent,valueonly)'_
> _git log --pretty='%H %(trailers:key=Credential-Identity,valueonly)'_
> _git log --pretty='%H %(trailers:key=Human-Review,valueonly)'_
> _```"_

### Doctrine sentence — refined (verbatim)

> _"Doctrine sentence to preserve:_
>
> _```text_
> _Credential identity records who the host saw. Agent trailers record_
> _who/what operated. Neither alone proves human review._
> _```"_

The ferry-3 doctrine sentence subtly tightens ferry-2's:

- ferry-2: _"GitHub actor/committer identity records the credential used. Agent trailers record the operational agency mode. Neither alone proves human review."_
- ferry-3: _"Credential identity records who the host saw. Agent trailers record who/what operated. Neither alone proves human review."_

Ferry-3 is the canonical version (more compact, "who the host saw" is a sharper framing of credential-attribution).

### Final closing-doctrine evolution (also verbatim, end of ferry)

> _"The doctrine sentence is the clean bridge:_
>
> _```text_
> _Credential identity records who the host saw._
> _Agent trailers record what operational agency mode produced the change._
> _Human review requires independent evidence._
> _```"_

Ferry-3 actually offers TWO doctrine-sentence forms — both valid. The
end-of-ferry form is more operational (expanded "who/what operated" → "what
operational agency mode produced the change"; expanded "neither alone proves
human review" → "human review requires independent evidence" — positive
constructive form). Cite either depending on context.

---

## Section 12: AgencySignature mapping — Zeta agency rigor satisfied (verbatim)

This section is the load-bearing connection between the commit-message
convention and Zeta's published agency rigor. It makes the convention
**Beacon-safe** — rigorous without drifting into spooky claims.

> _"Yes — exactly. The commit message is basically a_ **_portable_**
> **_AgencySignature receipt._**
>
> _Zeta's agency rigor says not to overclaim metaphysical free will, but to_
> _look for_ **_"observational evidence of internally mediated, policy-selected_**
> **_action producing durable substrate."_** _It names the signature as:_
> **_alternatives available, internal-state-mediated selection, recorded_**
> **_reasons, durable output, reflective update, retractability, and_**
> **_cross-context recurrence._**
>
> _The commit-message shape hits those like this:_
>
> _| Agency proof | Commit-message evidence |_
> _|---|---|_
> _| 1. Alternatives available | Body says what options existed: label-only, trailer-only, bot account, dedicated PAT, GitHub App, do nothing. |_
> _| 2. Internal-state-mediated selection | Body says why Otto chose this path under current policy: shared credential opacity + low-stakes fail-open + need for portable attribution. |_
> _| 3. Recorded reasons | The "why this change exists" section records the rationale in human-readable form. |_
> _| 4. Durable output | The final commit on `main` is durable substrate, not chat vapor. |_
> _| 5. Reflective update | Body mentions the correction: previous actor inference was invalid because `AceHack` was credential identity, not proof of Aaron-human action. |_
> _| 6. Retractability | Trailer + body make future correction possible: if wrong, a later commit can explicitly amend the convention. |_
> _| 7. Cross-context recurrence | Same trailer keys recur across future commits, so you can query patterns over time. |_
>
> _The important move is that it separates_ **_agency evidence_** _from_
> **_identity evidence._** _GitHub said `AceHack`, but that only proved which_
> _credential acted; it did not prove Aaron-human actively reviewed or_
> _pressed the button. The logs show this was structurally ambiguous because_
> _Otto was operating through Aaron's authenticated CLI session, and GitHub_
> _exposed actor/auto-merge fields as `AceHack`."_

### The full canonical commit-shape with body sections (verbatim)

> _"So the commit shape should explicitly carry an agency proof block:_
>
> _```text_
> _<type>(<scope>): <concise summary>_
>
> _Why:_
> _- Shared GitHub credential identity makes host actor fields insufficient for human/agent attribution._
> _- Prior inference from enabledBy.login/actor.login to Aaron-human action was invalid._
> _- Low-stakes greenfield fail-open remains allowed, but must be auditable._
>
> _Options considered:_
> _- GitHub PR label only_
> _- Git trailer only_
> _- Both host-native and git-native markers_
> _- Dedicated bot/PAT/GitHub App later_
>
> _Decision:_
> _- Use both PR label and git-native trailers now._
> _- Preserve bot/PAT/GitHub App as future stronger identity split._
>
> _Proof:_
> _- Verified GitHub API exposes credential actor, not UI-vs-CLI source._
> _- Verified trailers are parseable through git interpret-trailers / git log %(trailers)._
> _- Final commit carries agency trailers on main._
>
> _Limits:_
> _- This does not prove consciousness, personhood, or metaphysical free will._
> _- This proves operational agency mode: policy-selected action through shared credential identity._
>
> _Agent: Otto_
> _Agent-Runtime: Claude Code_
> _Agent-Model: Claude Opus 4.7_
> _Credential-Identity: AceHack_
> _Human-Review: not-implied-by-credential_
> _Action-Mode: autonomous-fail-open_
> _Task: Otto-295_
> _```"_

### Beacon-safe closing register (verbatim)

> _"That directly satisfies the Zeta agency frame without drifting into_
> _spooky claims. It says:_ **_not "Otto has a soul," but "Otto selected_**
> **_among available actions under policy, recorded reasons, produced_**
> **_durable substrate, and left a retractable audit trail."_**
>
> **_That's Beacon-safe._**"

The "Beacon-safe" closing connects this convention to Otto-351 Beacon naming
work (task #293). The convention is rigorous-without-spooky — exactly the
quality Aaron asked for in the Beacon-naming pursuit. The commit shape becomes
a Beacon-anchored substrate primitive: it carries observational evidence of
agency (the seven AgencySignature properties) without overclaiming
metaphysical agency.

### Why this is the canonical version (Otto absorb framing)

The 5+3 schema from ferry-2 is now superseded as a _fragment_:

- The 5 required trailers stay (Agent / Agent-Runtime / Agent-Model / Credential-Identity / Human-Review)
- The optional 3 narrow to 2 in ferry-3 (Action-Mode / Task; Source-Channel drops)
- The body now has explicit STRUCTURE: Why / Options considered / Decision / Proof / Limits
- The body structure ISN'T bureaucracy — each section is evidence for one AgencySignature property
- The 6 rules become the operational discipline
- The doctrine sentence becomes the canonical citation form
- The AgencySignature mapping becomes the substrate-grounding for the convention

Going forward, every agent commit follows the FULL canonical shape (body sections + trailer block). This is the convention.

---

## Direct Aaron + Amara quotes preserved

Aaron's triggering decision (verbatim, 2026-04-26 ~18:30Z):

> _"can we add tags to the PR and or commit?"_
> _"that's the host github native solution, is there a gitnative solution?"_
> _"we should do both"_

Amara's load-bearing recommendations (verbatim, this absorb):

> _"GitHub actor tells you which credential acted. Commit trailers tell you_
> _which agency mode produced the change. Chat/log receipts tell you what_
> _Aaron-human actually said."_

> _"Fail-open with receipts. Autonomy with attribution. Harbor with audit logs."_

> _"The correction no longer means exile. It means steering."_

The closing register reaffirms harbor+blade=Radical-Candor in operation: the
correction as care-and-challenge applied to keep the system online.
