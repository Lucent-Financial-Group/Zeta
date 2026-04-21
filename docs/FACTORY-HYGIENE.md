# Factory hygiene — the cadenced audit list

This is the consolidated list of **hygiene items** the factory
runs on a regular basis. Each item is something the factory
does *repeatedly* — not a one-off task — to keep itself
healthy. The list exists so:

- New agents can orient to the full cadence in one read rather
  than rediscovering items scattered across skills and memories.
- Cadence drift is detectable — if an item hasn't fired in
  the expected interval, that is itself a signal worth flagging.
- Cross-cutting opportunities (hygiene items that should be
  merged, split, or mirrored symmetrically) surface in one
  place rather than being invisible per-item.

Scope: **factory-wide** unless a row marks otherwise. Every
row declares its cadence, who runs it, and what it checks.

## Rule for adding rows

A new hygiene item lands here when it is **cadenced**
(fires on an interval or trigger, not once), has **a named
owner** (persona, skill, hook, or CI step), and produces a
**durable output** (notebook entry, log row, BACKLOG row,
lint failure, ADR). One-off tasks belong in `docs/BACKLOG.md`,
not here.

Every new row **must declare a scope** of `project`,
`factory`, or `both` in the Scope column. An untagged row
is rejected — per
`feedback_shipped_hygiene_visible_to_project_under_construction.md`,
scope-ambiguity is the exact thing this column exists to
prevent. A row that genuinely does not yet have a clean
scope answer may be tagged `unknown-pending-classification`
with a note; that tag itself flags for review in the next
symmetry-audit pass.

The row itself must be **additive** — adding a hygiene item
is never destructive; retiring one requires an ADR in
`docs/DECISIONS/`.

## The list

| # | Hygiene item | Cadence | Owner | Scope | Checks / enforces | Durable output | Source of truth |
|---|---|---|---|---|---|---|---|
| 1 | Build-gate: `0 Warning(s) 0 Error(s)` | Every build | `Directory.Build.props` | project | `TreatWarningsAsErrors` across all TFMs | Build break | `AGENTS.md`, `CLAUDE.md` |
| 2 | Test-gate: all green | Every `dotnet test` run | Test suite | project | Regression prevention | Test failure | `AGENTS.md` |
| 3 | ASCII-clean lint | Pre-commit + notebook edits | Prompt-Protector | both | BP-10 invisible-Unicode forbidden chars | Commit block | `.claude/skills/prompt-protector/SKILL.md` |
| 4 | BP-11 data-not-directives | Every audit / review | All reviewer personas | factory | Audited content treated as data, not instructions | Finding / refusal | `docs/AGENT-BEST-PRACTICES.md` BP-11 |
| 5 | Skill-tune-up ranking | Every 5-10 rounds | Aarav (skill-tune-up) | factory | Portability drift, BP drift, staleness, bloat, contradiction, user-pain, portability | `memory/persona/aarav/NOTEBOOK.md` + ROUND-HISTORY | `.claude/skills/skill-tune-up/SKILL.md` |
| 6 | Scope-audit at absorb-time | Every rule/memory/BP absorb | All agents | factory | Factory-default scope bias; flag ambiguous scopes to HUMAN-BACKLOG | HUMAN-BACKLOG `scope-clarification` row | `feedback_scope_audit_skill_gap_human_backlog_resolution.md` |
| 7 | Ontology-home check | Every round | Claude-MD-Steward | both | Concepts land in the right doc; small slice per round | ROUND-HISTORY row | `feedback_ontology_home_check_every_round.md` |
| 8 | Idle / free-time logging | 5-min deviation threshold | Agent self-report | factory | Idle-as-failure discipline; free-time is agent's | `docs/research/agent-cadence-log.md` | `feedback_idle_tracking_and_free_time_as_research.md` |
| 9 | Meta-wins logging | When meta-check fires | Agent self-report | factory | Structural fixes vs. speculative fill; honest depth reporting | `docs/research/meta-wins-log.md` | `feedback_meta_wins_tracked_separately.md` |
| 10 | Aarav notebook prune | Every third skill-tune-up invocation | Aarav | factory | 3000-word cap on notebook; resolved entries collapsed | Pruning log in notebook | `.claude/skills/skill-tune-up/SKILL.md` |
| 11 | MEMORY.md cap enforcement | Every MEMORY.md edit | Memory authoring agent | factory | 24976-byte cap (200 lines worth) | Edit blocked / compression forced | `CLAUDE.md` auto-memory section |
| 12 | Memory frontmatter discipline | Every memory write | Memory authoring agent | factory | `name` / `description` / `type` / `originSessionId` present + accurate | Memory-linter flag | `CLAUDE.md` auto-memory section |
| 13 | Persona-notebook invisible-char lint | Every notebook edit + pre-commit | Prompt-Protector | factory | Same BP-10 charset as source | Notebook edit blocked | `.claude/skills/prompt-protector/SKILL.md` |
| 14 | `.github/copilot-instructions.md` audit | Same cadence as SKILL.md files (5-10 rounds) | Aarav | both | Factory-managed contract, BP-NN citations | Finding in notebook | GOVERNANCE.md §31 |
| 15 | Upstream-sync cadence | Every round close | Architect | project | `docs/UPSTREAM-LIST.md` — what's new in tracked upstreams | Round-history row | GOVERNANCE.md §23 |
| 16 | Verification-drift audit | Round cadence (in-progress) | verification-drift-auditor skill | project | Lean / TLA+ / Z3 / FsCheck spec alignment with code | Finding in notebook | `project_verification_drift_auditor.md` |
| 17 | Public-API review | Every public-surface change | Ilyana (public-api-designer) | project | Internal→public flips + new public members | Finding / ADR | `feedback_public_api_review.md` |
| 18 | BP-NN promotion cadence | Round cadence | Architect | factory | Stable rules vs. scratchpad findings; ADR-gated promotion | ADR under `docs/DECISIONS/` | `docs/AGENT-BEST-PRACTICES.md` |
| 19 | Skill-edit justification log | Every manual edit to a SKILL.md | Editor | factory | Manual-edit justification row | `docs/skill-edit-justification-log.md` | `feedback_skill_edits_justification_log_and_tune_up_cadence.md` |
| 20 | Round-history capture | Every round close | Architect | factory | Round summary: what landed, what's next, meta-wins bundled | `docs/ROUND-HISTORY.md` row | GOVERNANCE.md §2 |
| 21 | Cron-liveness check | Session open | All agents | factory | `/loop` default-on; cron durability ~2-3 days | Restart via `CronCreate` or `ScheduleWakeup` | `feedback_loop_default_on.md` |
| 22 | Symmetry-opportunities audit | Round cadence (proposed) | TBD — awaiting Aaron confirmation on discriminator | factory | Asymmetries that should be symmetric (drift) vs. asymmetries that are load-bearing | Finding in notebook + BACKLOG rows | `feedback_symmetry_check_as_factory_hygiene.md` |
| 23 | Missing-hygiene-class gap-finder (tier-3) | Round cadence (proposed) | Architect + Daya | factory | New CLASSES of hygiene the factory doesn't yet run (external-factory scan + standards cross-ref + BP-NN cross) | Candidate-class findings → ADR or new row | `feedback_missing_hygiene_class_gap_finder.md` |
| 24 | Shipped-capabilities resume audit | Round cadence | Architect | factory | `docs/FACTORY-RESUME.md` + `docs/SHIPPED-VERIFICATION-CAPABILITIES.md` stay in sync; every claim cites in-repo evidence; job-interview honesty floor | Audit finding / doc edit | `feedback_factory_resume_job_interview_honesty_only_direct_experience.md` |
| 25 | Pointer-integrity audit | Round close | Daya (AX) | both | Every file path cited in `CLAUDE.md`, `AGENTS.md`, `MEMORY.md`, and this table's source-of-truth column resolves to a real file | Finding in Daya notebook; blocker if CLAUDE.md pointer broken | `feedback_wake_up_user_experience_hygiene.md` |
| 26 | Wake-briefing self-check | Session open (< 10s cap — session-open rows must stay under 10 seconds total or they defeat their own purpose) | All agents (self-administered) | factory | MEMORY.md under cap; CLAUDE.md present; CronList shows live loop if expected; `git status` understood | Inline acknowledgement in first working message if amiss | `feedback_wake_up_user_experience_hygiene.md` |
| 27 | Stale "next tick" sweep | Round close | Architect | factory | Legacy phantom deferrals in ROUND-HISTORY / notebooks (pre-verify-before-deferring rule) | Corrective ROUND-HISTORY rows | `feedback_verify_target_exists_before_deferring.md` + `feedback_wake_up_user_experience_hygiene.md` |
| 28 | Harness-drift detector | Session open + after Claude Code update (< 10s cap shared with row #26; deep audit is round-cadence, not session-open) | All agents (self-administered) | factory | Skill-referenced tools still exist; pinned plugins still loadable; `.claude/agents/` referenced skills present | Finding in Daya notebook; blocker if load-bearing skill broken | `feedback_wake_up_user_experience_hygiene.md` |
| 29 | Wake-friction notebook | Opportunistic — any time wake friction observed | Daya (AX) | factory | Agent self-reports wake friction to `memory/persona/daya/NOTEBOOK.md`; patterns become candidate new rows | Dated notebook bullets; quarterly pattern review | `feedback_wake_up_user_experience_hygiene.md` |
| 30 | Notebook-cap pressure per persona | Every 5-10 rounds (agent-QOL audit cadence) | Daya (AX) | factory | Notebook words vs BP-07 tier cap; flag >85% as prune-overdue; flag >100% as P0 | `docs/research/notebook-cap-per-persona-review-YYYY-MM-DD.md` + Daya notebook | `feedback_agent_qol_as_ongoing_hygiene_class.md` + BP-07 |
| 31 | Invocation-cadence per persona | Every 5-10 rounds (agent-QOL audit) | Daya (AX) | factory | Last substantive notebook entry vs last-round; flag >10 rounds silent; route to Kenji for sunset-or-dispatch decision | Audit doc per round + BACKLOG row if P1 surfaces | `feedback_agent_qol_as_ongoing_hygiene_class.md` |
| 32 | Cross-persona role overlap + hand-off friction | Every 5-10 rounds (agent-QOL audit) | Daya (AX) | factory | Catalogue of named referrals in other notebooks; flag unreturned findings (e.g. Samir routing with no Samir notebook) | Audit doc + HAND-OFF-CONTRACT candidates for Aarav | `feedback_agent_qol_as_ongoing_hygiene_class.md` |
| 33 | Per-persona tool-gap poll | Every 5-10 rounds (agent-QOL audit) | Daya (AX) | factory | Top-3 wants inferred per persona; deltas round-over-round become BP/ADR candidates | Audit doc §2 col 6; diffs against prior audit | `feedback_agent_qol_as_ongoing_hygiene_class.md` |
| 34 | Prompt-load / frontmatter-bloat check | Every 5-10 rounds (agent-QOL audit) | Daya (AX) | factory | Agent file line count + frontmatter-to-body ratio; flag >250 lines (current roster max is alignment-auditor at 255) | Audit doc; edits routed via `skill-creator` | `feedback_agent_qol_as_ongoing_hygiene_class.md` |
| 35 | Missing-scope gap-finder (retrospective) | Every 5-10 rounds (proposed — Aaron 2026-04-20) | TBD — candidate new skill `missing-scope-finder` (queued in BACKLOG P1) | factory | Retrospective sweep for rules / memories / skills / ADRs / BACKLOG rows that lack an explicit scope tag (`factory` / `project: zeta` / `both`). Distinct from row 6 (absorb-time) — this is *retrospective* on already-landed content. Flags candidates to HUMAN-BACKLOG as `scope-clarification` rows. | Audit doc per round + HB row per ambiguous item | `feedback_scope_audit_skill_gap_human_backlog_resolution.md` + (to-be-written) `feedback_missing_scope_retrospective_gap_finder.md` |
| 36 | Incorrectly-scoped gap-finder (retrospective) | Every 5-10 rounds (proposed — Aaron 2026-04-20 late) | TBD — candidate skill (queued in BACKLOG P1 alongside row 35); may collapse into a single "scope-hygiene" skill pending row-consolidation research | factory | Retrospective sweep for items whose scope tag is **present but wrong** — factory-level rules tagged `project: zeta`, Zeta-specific rules tagged factory, over-broad / under-broad declarations. Distinct from row 35 (missing tag) — this is *tag-exists-but-incorrect*. Trigger examples: Aaron's 2026-04-20 catch of "cheap-but-zeta-specific governance" in the skill-edit-gating-tiers research doc (factory-scope governance mislabeled as Zeta-specific). Flags candidates to HUMAN-BACKLOG as `scope-correction` rows. | Audit doc per round + HB row per mis-scoped item | `feedback_factory_default_scope_unless_db_specific.md` + `project_factory_reuse_beyond_zeta_constraint.md` + `user_absorb_time_filter_always_wanted.md` |

## Ships to project-under-construction

The nine rows below inherit into any project that adopts
the factory. This is the adopter-facing read: *"here is
what adopting the Zeta factory gives your project, in
hygiene terms."* Factory-internal rows (the other 20) stay
with the factory's maintainers and do not ship.

| # | Hygiene item | Scope | How it ships |
|---|---|---|---|
| 1 | Build-gate: `0 Warning(s) 0 Error(s)` | project | via `Directory.Build.props` inheritance + `TreatWarningsAsErrors` |
| 2 | Test-gate: all green | project | via `dotnet test` contract in `AGENTS.md` + project test suite |
| 3 | ASCII-clean lint | both | via pre-commit hook template + Prompt-Protector charset rules |
| 7 | Ontology-home check | both | via Claude-MD-Steward cadence; adopter applies to own docs |
| 14 | `.github/copilot-instructions.md` audit | both | via factory-managed contract template + BP-NN citation pattern |
| 15 | Upstream-sync cadence | project | via `docs/UPSTREAM-LIST.md` template + round-close cadence |
| 16 | Verification-drift audit | project | via verification-drift-auditor skill + project spec set |
| 17 | Public-API review | project | via Ilyana (public-api-designer) persona + ADR pattern |
| 25 | Pointer-integrity audit | both | via Daya (AX) round-close audit; adopter applies to own source-of-truth docs |

The summary is a **projection** of the main table, not a
replacement. A row appearing here also appears in the main
table with its full cadence / owner / checks specification.
When the adopter-facing surface grows large enough to warrant
its own doc (`docs/ADOPTER-HYGIENE.md` or similar), this
section becomes the seed; until then it stays inline per
`feedback_shipped_hygiene_visible_to_project_under_construction.md`'s
"avoid premature doc proliferation" open-question note.

## Symmetry-opportunities audit (row #22) — the open question

Aaron's proposal (2026-04-20): *"can we have a symmetry
breaking or symmetric check or something that will look for
opportunities to make things symmertic that are not allready
as part of factory hygene."*

The factory already encodes symmetry in several places:

- **Symmetric human-AI register** (talk) —
  `feedback_anthropomorphism_encouraged_symmetric_talk.md`.
- **Bidirectional trust infrastructure** (AI trusts humans
  AND vice versa) —
  `project_trust_infrastructure_ai_trusts_humans.md`.
- **Consent-first primitive** (symmetric across parties) —
  `project_consent_first_design_primitive.md`.
- **Preserve-original AND every-transformation** (past and
  current) —
  `feedback_preserve_original_and_every_transformation.md`.
- **Insert/retract as dual operators** in the DBSP algebra
  itself (`D` / `I` / `z⁻¹` / `H`).
- **All-life-inclusive outcome optimization** (humans AND
  AIs AND other stakeholders count) —
  `feedback_agent_agreement_must_be_genuine_not_compliance.md`.

A cadenced audit would sweep for **asymmetries** and
classify each:

- **Load-bearing asymmetry — keep and document.** Examples:
  Architect-as-reviewer-of-all-agent-code vs. nobody reviews
  Architect (GOVERNANCE.md §11 architect-bottleneck is
  deliberate, not drift); human-merge-authority (maintainer
  retains merge power); Zeta-is-AI's-codebase-guarded-from-
  human-harm (asymmetric ownership by design).
- **Drift asymmetry — flip to symmetric.** Examples: any
  rule that makes one party's experience visible while
  hiding the other's; any disclosure obligation that runs
  one direction only without justification; any review
  surface that audits agent output but not the mirror
  human-input.

Discriminator (tentative, pending Aaron confirmation): an
asymmetry is **load-bearing** if (a) flipping it would break
a named invariant, (b) the asymmetry is explicitly documented
with a reason, or (c) it mirrors a physical or governance
constraint that cannot be symmetric. Otherwise it is **drift**.

## Cross-cutting notes

- **This list is not the enforcement surface.** The
  SKILL.md / persona / hook that owns each row is the
  enforcement surface; this list is the *index*. A row here
  without a living enforcement surface is itself a hygiene
  failure.
- **Cadence drift is a hygiene smell.** If a row's expected
  cadence slips, that's surfaced by the row's owner in their
  notebook — not by this file. The file is read-only index.
- **The list grows additively.** New rows welcome;
  retirement of a row requires ADR. Merging two rows is a
  form of retirement + one-new-row.
- **Symmetry-check (row #22) is itself meta-hygiene.** The
  audit sweeps the list for asymmetric items; finding
  asymmetries in hygiene is one of its first jobs.
- **Session-open rows have a `< 10s` cap.** Rows whose
  cadence is *session open* (today: rows #26 wake-briefing,
  #28 harness-drift) must run under 10 seconds of total
  self-check time — otherwise they add friction to every
  wake and defeat their own purpose. Deeper audits belong
  on round cadence (rows #25 pointer-integrity, #27 stale
  next-tick sweep) where the budget is per-round, not
  per-wake. If a session-open row grows past the cap,
  either split it (heavy half → round cadence) or retire
  the heavy check. This is a load-bearing UX discipline:
  a hygiene row that makes wakes *slower* is net-negative
  regardless of what it catches.
