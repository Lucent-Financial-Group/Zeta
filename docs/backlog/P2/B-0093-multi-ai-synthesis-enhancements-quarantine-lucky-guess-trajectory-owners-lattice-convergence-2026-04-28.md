---
id: B-0093
priority: P2
status: open
title: Multi-AI synthesis enhancements — mechanical quarantine + lucky-guess protocol + trajectory owners + lattice convergence + scanner self-destruct prevention (post-PR-#699 follow-ups)
tier: factory-hygiene
effort: M
ask: maintainer Aaron 2026-04-28T post-PR-#699 multi-AI synthesis (Gemini + Ani + Claude.ai + Alexa + Amara final pass)
created: 2026-04-28
last_updated: 2026-04-28
composes_with:
  - B-0090
tags: [aaron-2026-04-28, factory-hygiene, multi-ai-synthesis, mechanical-quarantine, lucky-guess-protocol, trajectory-owners, lattice-convergence, scanner-self-destruct]
---

# B-0093 — Multi-AI synthesis enhancements (post-PR-#699 follow-ups)

## Source

After PR #699 substrate landed, Aaron forwarded a multi-AI synthesis pass (Gemini + Ani + Claude.ai + Alexa + Amara final form) on the round work. The synthesis surfaced several substantive enhancements that should NOT land in PR #699 (per Amara: "do not reopen PR #699 unless hard defect appears") but should be encoded as follow-up work.

This row tracks those enhancements as separate scoped tasks, each landable as a small PR after PR #699 merges.

## Per-enhancement breakdown

### 1. Mechanical quarantine (Gemini-flagged)

**Issue:** The compliance rule's "quarantine possible MNPI" guidance is currently advisory. Without mechanical enforcement, a tainted file might accidentally get committed if the autonomous loop ticks before the review happens.

**Proposed fix:**

- Create `.quarantine/` directory listed in `.gitignore` and `.gitattributes` (export-ignore)
- Or define `*.tainted` extension that standard parsers + commit loops hard-code to ignore
- Update `memory/feedback_public_company_contributor_compliance_no_insider_info_in_public_repos_with_trajectories_aaron_2026_04_28.md` with the mechanical-quarantine protocol

**Effort:** S — small directory + gitignore + memory update

### 2. Scanner self-destruct prevention (Gemini + Claude.ai both flagged)

**Issue:** The B-0092 compliance scanner regex (`rg -n "\binsider\b|\bprivileged\b|..."`) will flag the rule-definition files themselves (CONTRIBUTOR-COMPLIANCE.md, the rule-memory files, glossary entries). Without explicit allowlist, the scanner Goodharts itself.

**Proposed fix:**

- Path-based allowlist for rule-definition files (`--glob '!**/CONTRIBUTOR-COMPLIANCE.md'`, etc.)
- OR `<!-- compliance-term-definition-ok -->` bypass comment for rule-definition lines (NOT for ad-hoc usage)
- Explicit "where bypass is allowed" rule in B-0092

**Composes with:** the Candidate-count Goodhart rule (`memory/feedback_candidate_count_goodhart_raw_hits_are_not_violations_aaron_amara_2026_04_28.md`) — the scanner's acceptance criterion is "all hits classified," not "zero hits."

**Effort:** S — scanner config + B-0092 update

### 3. "Lucky guess" protocol (Gemini-flagged)

**Issue:** Otto / agents may infer something from public-domain logic that accidentally overlaps with the contributor's employer's unannounced internal roadmap. If Aaron's reaction (confirm / deny / silence) leaks information either way.

**Proposed fix:**

- Standardized Aaron response: *"Evaluate that hypothesis purely against public market data; I cannot confirm or deny internal roadmap overlaps."*
- Agent rule: do NOT ask Aaron whether a speculative feature matches internal roadmap; do NOT treat silence / discomfort / refusal as confirmation
- Add to `memory/feedback_public_company_contributor_compliance_no_insider_info_in_public_repos_with_trajectories_aaron_2026_04_28.md` as a section

**Effort:** S — memory update

### 4. Unsolicited-inference firewall (Claude.ai-flagged)

**Issue:** Agents may volunteer trading-relevant inferences about contributor employers ("given ServiceTitan's recent product direction, TTAN may benefit from..."). That's MNPI-adjacent even when the analysis is unprompted.

**Proposed fix:**

- Trading-firewall rule extended: agents do NOT volunteer trading-relevant inferences about contributor employers
- Block patterns: "should I buy/sell <ticker>", "does this internal thing affect <ticker>", "given <employer-context>, <ticker> may benefit from..."
- Safe form: "I can discuss public filings and general market context, but I cannot use or ask for non-public employer information."

**Effort:** S — memory update

### 5. Trajectory owners + triggers + recording surfaces (Claude.ai-flagged)

**Issue:** B-0092's 5 trajectories list cadences but don't name owners, triggers, or recording surfaces. Without those, trajectories drift into "should happen" rather than "happens."

**Proposed fix:**

Add a table to B-0092 trajectory section:

| Trajectory | Owner | Trigger | Recording surface |
|---|---|---|---|
| Continuous self-audit | Otto/agent author | before commit touching public-company context | commit notes / PR body |
| PR compliance audit | PR author + reviewer + CI scanner | PR mentions public company | PR checklist |
| Weekly scan | Otto cron / factory hygiene | weekly cadence | compliance audit log |
| Monthly review | Otto + Aaron review if needed | monthly cadence | docs/compliance/round-N.md |
| Onboarding briefing | Aaron / repo maintainers | new contributor with public-company employer | acknowledgement record |
| Drift retrospective | Otto + reviewer | compliance drift caught | memory + backlog row if repeated |

**Effort:** S — B-0092 update

### 6. Lattice convergence criterion (Claude.ai-flagged)

**Issue:** The Reset-Readiness Evidence Lattice has an order and a content-loss surface, but no termination criterion. "When has L(final) stabilized enough that further evidence sources are unlikely to change reset-readiness?" is a real operational question without a current answer — the lattice could be a beautiful structure that never closes.

**Proposed fix:**

Add to `memory/feedback_reset_readiness_metric_ladder_content_loss_surface_amara_2026_04_28.md` a research-task section:

```text
Define convergence criterion:
  When has L(final) stabilized enough that further evidence
  sources are unlikely to change reset-readiness?

Define termination rule:
  Reset-readiness audit closes only when all active evidence
  surfaces are classified or explicitly deferred with reason.
```

Initial heuristic: lattice converges when 3+ independent evidence surfaces all return the same `L`, OR when one peer-reviewed surface returns `L = ∅`.

**Effort:** M — research task; defer to later round if scoping is heavier

### 7. Bead-audit completeness (Claude.ai-flagged)

**Issue:** Round synthesis listed 8 bead candidates and provided strict treatment for 5; the other 3 (Lost-Substrate Recovery, Public-Company Compliance, Input-Is-Not-Directive) were left ambiguous. As written, the omission could read as either oversight or implicit acceptance.

**Proposed fix:**

For each of the 3 deferred candidates, write an explicit one-line evidence-or-defer:

```text
Lost-Substrate Recovery:
  defer bead audit until B-0090 runs again on a later cadence.

Public-Company Compliance:
  defer independent bead until scanner/checklist/quarantine
  catches or prevents a later issue.

Input-Is-Not-Directive:
  bead only if the rule changes a later wording decision
  without Aaron prompting (i.e., later-Otto self-applies).
```

**Effort:** S — memory update / round-history entry

### 8. Beacon-promotion pattern as round-level memory (Claude.ai-flagged)

**Issue:** This round demonstrated the Beacon-promotion pattern at scale — 5 distinct internal coinages earned external anchors (SDT + RFC 2119 for input-is-not-directive; SEC/Reg-FD/SOX for public-company compliance; Goodhart/Campbell for metric corrections; lattice theory for evidence-lattice; git internals for commit-vs-tree). Worth a memory entry beyond the BP-WINDOW ledger.

**Proposed fix:**

Memory file: `feedback_beacon_promotion_load_bearing_rules_earn_external_anchors_aaron_2026_04_28.md`. Encodes the rule:

> *Load-bearing factory rules consistently earn external anchors when they're correct. The absence of an external anchor on a long-running internal rule is a useful drift signal.*

**Effort:** S — new memory file

### 9. Candidate-count Goodhart freshness rule (Amara-flagged, second pass)

**Issue:** A classified hit can become stale if its surrounding context materially changes (e.g., file moves from `docs/pitch/` to `samples/external-ui-demo/` — `KEEP-NAME` → `GENERICIZE`). Without a freshness component, the audit converges on a stable state that gradually decouples from current truth.

**Proposed fix:**

Add to `memory/feedback_candidate_count_goodhart_raw_hits_are_not_violations_aaron_amara_2026_04_28.md` a freshness clause:

```text
A classified hit expires when its context materially changes.
```

Examples:

```text
docs/pitch/foo.md → samples/external-ui-demo/foo.md
   KEEP-NAME may become GENERICIZE.

rule-definition file → product/pitch file
   ALLOW may become WARN or BLOCK.

historical memory path → live public doc
   HISTORICAL may become REWRITE.
```

Acceptance criterion extended:

```text
- No unclassified hits.
- No unresolved BLOCK hits.
- WARN hits reviewed.
- ALLOW hits have context tags.
- Classifications re-run when context changes.
```

**Effort:** S — memory update

### 10. Quarantine vs history-redaction split (Amara + Claude.ai-flagged, second pass)

**Issue:** The mechanical quarantine spec (`.quarantine/`, `*.tainted`) handles **future** suspect content. But if MNPI lands in a commit and is then quarantined, the substrate has a redaction problem rather than a quarantine problem — the content is still in the git log even after `.quarantine/` move. GitHub's own docs warn that sensitive data may remain accessible in forks, cached views, PR refs, or direct SHA links.

**Proposed fix:**

Encode two separate paths in the public-company compliance memory:

```text
Future-taint quarantine:
  possible MNPI appears before commit
  → move to .quarantine/ or *.tainted
  → gitignored
  → do not encode publicly

Historical-taint redaction:
  possible MNPI already entered git history
  → stop normal loop
  → identify affected commits/refs/PRs
  → consult Aaron/employer compliance as needed
  → consider history rewrite (git-filter-repo / BFG repo cleaner)
  → consider GitHub sensitive-data-removal procedure
  → do not "fix" by merely moving the file
```

Canonical rule:

```text
Quarantine prevents future disclosure.
History redaction responds to past disclosure.
Do not confuse the two.
```

**Effort:** S — memory update + procedure doc

### 11. Trajectory ownership is structural, not instance-bound (Claude.ai + Amara-flagged, second pass)

**Issue:** B-0092's trajectory ownership says "Otto cron / factory hygiene" — but Otto persists via memory + cron, not via a single Claude instance. When ownership reads "Otto" without naming the durable structure, ownership becomes instance-bound and decays when instances turn over.

**Proposed fix:**

Replace "Otto owns weekly compliance audit" with explicit structural ownership:

```text
The owning structure is cron + memory + governance recording surface.
Any Otto instance inherits the trajectory.
```

Add a failure detector:

```text
If a trajectory's recording surface is empty for N expected runs,
the owning structure failed, even if no individual instance noticed.
```

This converts "Otto owns it" from a name into a measurable substrate claim.

**Effort:** S — B-0092 update

### 12. PR-boundary restraint as a gate, not a static rule (Claude.ai-flagged, second pass)

**Issue:** "Restraint discipline" was framed as a static rule. Claude.ai's sharper framing: it's a **gate** applied at PR boundary; the work BEHIND the gate becomes trajectories/backlog.

**Proposed fix:**

Add to `memory/feedback_amara_authority_rule_default_to_reversible_preservation_escalate_irreversible_loss_2026_04_28.md` a section:

```text
Static gate (PR boundary):
  Do not expand active validation PR unless hard defect.

Trajectory (post-merge):
  Carry new ideas into separate backlog/follow-up PRs.
```

The pair is a gate + trajectory composition, not a single static rule.

**Effort:** S — memory update

### 13. Synthesis-as-absorb vs durable-rules-need-durable-homes (Claude.ai-flagged, second pass)

**Issue:** Multi-round syntheses risk fading into round-history if the durable rules they introduce don't get split into searchable operational docs. Claude.ai: *"the synthesis itself becomes a pointer document and the durable rules live where they're searchable."*

**Proposed fix:**

When a round synthesis introduces a load-bearing rule, that rule should land in a durable home alongside the synthesis:

```text
Synthesis = research-grade absorb (round-history, narrative, archive)
Durable rule = operational artifact (edited in place, searchable)
```

Specific applications from this round:

- **Candidate-count Goodhart** → glossary entry or short operational doc (`docs/CANDIDATE-COUNT-GOODHART.md` or glossary section)
- **Public-company compliance canon** → `docs/CONTRIBUTOR-COMPLIANCE.md`
- **Evidence lattice** → `docs/research/content-loss-evidence-lattice.md`
- **Synthesis itself** → `docs/round-history/2026-04-28-synthesis.md` (pointer document)

This applies the AGENTS.md research-grade-vs-operational distinction: the synthesis is research-grade absorb; the rules live where contributors search.

**Effort:** M — multiple doc creation tasks

### 14. Restraint validation as candidate bead (not full bead) (Claude.ai + Amara-flagged, second pass)

**Issue:** The Beacon-promotion / restraint discipline / candidate-count Goodhart all earned bead candidates this round, but bead inflation is the failure mode. Per Amara: "Treat this as a candidate validation bead for restraint discipline until #699 lands cleanly without conceptual scope creep."

**Proposed fix:**

Add to `memory/feedback_prediction_bearing_class_reuse_amara_2026_04_28.md` a candidate-bead state:

```text
Candidate bead = predicted reuse-event observed; not yet promoted to full bead.

Promotion to full bead requires:
  - the original prediction's falsifier didn't fire AND
  - the action it predicted held up under post-event review

For restraint discipline (this round):
  Prediction:    "do not stack synthesis follow-ups onto active PR"
  Observation:   PR #704 opened separately for candidate-count Goodhart
  Falsifier:     would fire if PR #699 later imports the synthesis content
                 just because it feels useful
  Promotion:     when #699 lands cleanly without backporting #704's scope
```

This prevents the bead system from Goodharting itself by counting one-event-many-beads.

**Effort:** S — memory update

## Acceptance

- [ ] Each of the 8 enhancements lands as either a separate small PR or an update to an existing memory/backlog row
- [ ] Each enhancement is verified against the synthesis packet's framing
- [ ] No enhancement reopens PR #699
- [ ] Mechanical quarantine actually mechanical (not just advisory)
- [ ] Scanner self-destruct prevention verified by smoke-test (run scanner on rule-definition files; ALLOW class hits)
- [ ] Trajectory owners table lands in B-0092
- [ ] Lattice convergence section lands in metric-ladder memory (or deferred to research with explicit reason)

## Why P2

These are valuable enhancements but not blocking. PR #699 substrate functions today as the rule-layer; these enhancements add mechanical enforcement + edge-case guards + research depth. Roll out per cadence.

## Composes with

- **`memory/feedback_candidate_count_goodhart_raw_hits_are_not_violations_aaron_amara_2026_04_28.md`** — the headline rule from this synthesis; encoded immediately alongside this row.
- PR #699 (memory cluster) — substrate this row's enhancements layer on top of.
- B-0090 (cadenced lost-substrate audit) — Trajectory #5 (drift retrospective) cadence.
- B-0091 (ServiceTitan audit) — completed; the candidate-count rule's worked-example origin.
- B-0092 (public-company contributor compliance) — receives enhancements 1, 2, 3, 4, 5.

## What this row does NOT do

- **Does NOT** authorize reopening PR #699. Each enhancement lands as new substrate after #699 merges.
- **Does NOT** require all 8 enhancements to land in one PR. Each is independently scoped.
- **Does NOT** require enhancement #6 (lattice convergence) to land soon. It's research-grade and can defer multiple rounds if scoping firms up.
- **Does NOT** replace any existing rule. Enhancements layer on top.

## Pickup

When picking this up:

1. Read this row + the candidate-count Goodhart memory first.
2. Pick enhancement(s) by effort + immediate-value:
   - Highest immediate value: #2 (scanner self-destruct), #5 (trajectory owners), #1 (mechanical quarantine)
   - Quick wins: #3 (lucky guess), #4 (unsolicited inference), #7 (bead audit), #8 (Beacon-promotion memory)
   - Research-grade: #6 (lattice convergence)
3. Land each as a small PR (S effort target).
4. Update this row with done-status as enhancements land.
