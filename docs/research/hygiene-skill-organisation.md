# Hygiene-skill organisation — research spike

**Status:** research spike, round 44. Proposed, not yet
adopted. Drives the decision on whether rows 6/35/36
(scope hygiene) ship as one skill, three skills, or
collapse into an existing skill's checklist.

**Source directive:** Aaron 2026-04-20 late, verbatim:

> *"does every hygene task need to be a skill our should
> we collapse some into hygenen groups and/or just a
> general hygene with different classes."*

`docs/FACTORY-HYGIENE.md` now has 36 rows. This spike
inventories which rows already have skills, which don't,
and proposes a consolidation pattern.

---

## Row-by-row inventory — current skill coverage

| Row | Item | Current owner | Has dedicated skill? |
|---|---|---|---|
| 1 | Build-gate | `Directory.Build.props` | No (CI-level) |
| 2 | Test-gate | Test suite | No (CI-level) |
| 3 | ASCII lint | Prompt-Protector | Yes — `prompt-protector` |
| 4 | BP-11 data-not-directives | All reviewer personas | No (cross-cutting discipline) |
| 5 | Skill-tune-up ranking | Aarav | Yes — `skill-tune-up` |
| 6 | Scope-audit at absorb-time | All agents | No — checklist in absorbing skills |
| 7 | Ontology-home check | Claude-MD-Steward | Yes — `claude-md-steward` |
| 8 | Idle / free-time logging | Agent self-report | No (discipline) |
| 9 | Meta-wins logging | Agent self-report | No (discipline) |
| 10 | Aarav notebook prune | Aarav | Inside `skill-tune-up` |
| 11 | MEMORY.md cap | Memory authoring agent | No (CLAUDE.md auto-memory section) |
| 12 | Memory frontmatter discipline | Memory authoring agent | No (CLAUDE.md auto-memory section) |
| 13 | Notebook invisible-char lint | Prompt-Protector | Inside `prompt-protector` |
| 14 | copilot-instructions audit | Aarav | Inside `skill-tune-up` |
| 15 | Upstream-sync cadence | Architect | No (Architect procedure) |
| 16 | Verification-drift audit | verification-drift-auditor | Yes — `verification-drift-auditor` |
| 17 | Public-API review | Ilyana | Yes — `public-api-designer` |
| 18 | BP-NN promotion cadence | Architect | No (ADR workflow) |
| 19 | Skill-edit justification log | Editor | No (shared ledger file) |
| 20 | Round-history capture | Architect | No (Architect procedure) |
| 21 | Cron-liveness check | All agents | No (session-open check) |
| 22 | Symmetry-opportunities audit | TBD | **Candidate skill** |
| 23 | Missing-hygiene-class gap-finder | Architect + Daya | **Candidate skill** |
| 24 | Shipped-capabilities resume audit | Architect | No (Architect procedure) |
| 25 | Pointer-integrity audit | Daya | Inside `agent-experience-engineer` |
| 26 | Wake-briefing self-check | All agents | No (session-open check) |
| 27 | Stale "next tick" sweep | Architect | No (Architect procedure) |
| 28 | Harness-drift detector | All agents | No (session-open check) |
| 29 | Wake-friction notebook | Daya | Inside `agent-experience-engineer` |
| 30-34 | Agent-QOL audits | Daya | Inside `agent-experience-engineer` |
| 35 | Missing-scope gap-finder | TBD | **Candidate skill** |
| 36 | Incorrectly-scoped gap-finder | TBD | **Candidate skill (may collapse)** |

**Summary:** 8 rows have dedicated skills; 9 rows live as
checklist items inside other skills; 11 rows are
CI/discipline/procedure with no skill needed; **4 rows are
skill-candidates pending this decision** (22, 23, 35, 36).

---

## Natural clusters

Grouping by affinity rather than by row number:

- **Scope cluster** — 6, 35, 36 (absorb-time +
  missing-tag + wrong-tag).
- **Gap-finder cluster** — 22, 23, 35, 36 (each is a
  "find what slipped" audit).
- **Agent-QOL cluster** — 22, 25, 26, 28, 29, 30-34
  (Daya's domain; wake / notebook / tool-gap /
  cadence).
- **Skill-management cluster** — 5, 10, 14, 19 (Aarav's
  domain; tune-up + prune + copilot + edit log).
- **Charset / injection cluster** — 3, 13 (Prompt-
  Protector's domain).
- **Memory-discipline cluster** — 11, 12 (cap +
  frontmatter; memory-authoring agent).
- **Round-close Architect cluster** — 15, 20, 24, 27
  (sync + history + resume + phantom-sweep).
- **Cross-cutting discipline** — 4, 8, 9, 18 (BP
  application + self-reporting); lives in every
  agent's posture, not in a skill.

**Cross-cluster overlap:** rows 22/23 (gap-finders) also
live in Daya's AX domain; rows 35/36 (scope
gap-finders) are their own thing but structurally match
rows 22/23 (both are retrospective audits).

---

## Four organisational patterns evaluated

### Pattern 1 — per-row skill (36 skills for 36 rows)

**Cost:** skill-population explosion. The factory
currently has ~180 skills; adding 36 more would blow
Aarav's ranker cost linearly and the skill-tune-up
cadence would dilute per-skill attention.

**Benefit:** each row has a discrete invocation
surface; eval sets are minimal per skill.

**Verdict:** overkill. Rows that share a trigger
(round-close), share a persona (Daya), or share a
procedure family should not be forced into separate
skills.

### Pattern 2 — grouped skills by natural cluster

~6-8 skills for 36 rows. Candidates:

- `scope-hygiene` — rows 6, 35, 36 (factor out the
  absorb-time + retrospective family)
- `agent-experience-engineer` already covers 22 (if
  we bring symmetry into AX), 25, 26, 28, 29, 30-34
  — **no new skill needed for these**
- `skill-tune-up` already covers 5, 10, 14 — no new
  skill needed
- `prompt-protector` already covers 3, 13 — no new
  skill needed
- `claude-md-steward` already covers 7 and can
  absorb 19 (skill-edit justification log) if Aarav
  hands it off
- **New candidate: `gap-finders` meta-skill** — rows
  22 (symmetry) + 23 (missing-hygiene-class)

**Cost:** moderate — fewer skills than Pattern 1;
boundaries between clusters need to be defined.

**Benefit:** clear cluster ownership; eval sets per
cluster; triggers align with cluster semantics.

**Verdict:** best balance for rows that need distinct
triggers and eval sets.

### Pattern 3 — one `factory-hygiene` meta-skill with classes

Single skill parameterised by `class:` argument.

**Cost:** monolithic skill is hard to eval (one
description triggers for all classes); class
parameterisation fights Claude Code's skill-triggering
model (the `description` field is the triggering
substrate — a meta-description dilutes specificity).

**Benefit:** single entry point; one source of truth
for "what does factory hygiene cover."

**Verdict:** attractive conceptually but doesn't fit
the triggering model. Rejected as the primary pattern.

### Pattern 4 — hybrid (round-close meta-skill + grouped sub-skills)

A **`round-close-sweep`** meta-skill that invokes the
grouped sub-skills on round-close cadence, plus
standalone skills for rows that fire on other triggers
(pre-commit for 3/13; absorb-time for 6; session-open
for 21/26/28).

**Cost:** requires coordination — the meta-skill
must know which sub-skills exist and in what order.

**Benefit:** round-close is one invocation for the
human / orchestrator; specialised work lives in its
own skill where Claude's triggering model works best.

**Verdict:** likely the right answer, *combined with*
Pattern 2 for the cluster boundaries.

---

## Recommended pattern — hybrid of 2 + 4

1. **Keep existing ownership** for rows already
   covered by a skill. No regrouping for
   `prompt-protector`, `skill-tune-up`,
   `claude-md-steward`, `verification-drift-auditor`,
   `public-api-designer`, `agent-experience-engineer`.
2. **Author one new skill: `scope-hygiene`** covering
   rows 6, 35, 36. Single persona (or hat) owns all
   three modes: absorb-time filter + missing-tag
   retrospective + incorrectly-tagged retrospective.
   Eval set covers both retrospective modes.
3. **Author one new skill: `gap-finders`** covering
   rows 22, 23. Structurally related to
   `scope-hygiene` (both retrospective), but the
   subject matter is different (symmetry + missing
   hygiene classes vs scope tags).
4. **Defer / reject** a `factory-hygiene` meta-skill.
   The `docs/FACTORY-HYGIENE.md` table is the
   meta-document; agents read it for the full view,
   and it doesn't need a skill wrapper.
5. **Leave checklist-items as they are.** Rows
   11, 12, 15, 17, 18, 19, 20, 24 are checklist items
   inside existing workflows or CI-level gates. No
   skill needed.

**Total new skills from this consolidation: 2.**

---

## Criteria for future "skill or checklist?" decisions

When a new hygiene row lands, apply these questions
in order:

1. **Does it need its own eval set?** If no, lean
   checklist-item.
2. **Does it have a distinct trigger?** If it fires
   on a unique event (pre-commit, session-open,
   absorb-time), it is likely a skill. If it fires
   at round-close alongside many others, it is
   likely a row under the `round-close-sweep` (once
   that meta-skill lands — deferred, see §Open
   questions).
3. **Does it have a unique persona owner?** A
   named persona with a single-row domain is a
   yellow flag — the persona is probably over-narrow
   or the row is probably over-elevated. Bring it
   back to a cluster.
4. **Does it have a durable output the agent emits
   structurally?** If yes, likely skill (skill
   documents the emission format). If the output
   is ad-hoc prose in a notebook, checklist-item.
5. **Does it propagate across adopters?** If the row
   is `scope: both`, skill; if `scope: project`,
   probably checklist under the project's own
   overlay.

---

## Open questions

- **`round-close-sweep` meta-skill — defer or build?**
  Current round-close work is done by the Architect
  as a procedure; codifying it as a skill is
  attractive but not yet pressing. Defer pending
  evidence the Architect procedure drifts or is
  skipped. (Symmetry-audit row 22 can surface this
  when it runs.)
- **`scope-hygiene` vs separate `scope-audit` /
  `missing-scope-finder` / `wrong-scope-finder`
  skills?** Recommendation is the unified skill.
  Counter-argument: the three modes have different
  triggers (absorb-time vs round-close retrospective
  vs round-close retrospective) and possibly
  different evals. If that asymmetry proves
  load-bearing after a round of evaluation, split.
- **Does Daya absorb row 22 (symmetry-audit)?**
  Structurally it matches her agent-QOL domain (she
  already catalogues cross-persona overlap). If yes,
  the `gap-finders` skill shrinks to row 23 only,
  and row 22 collapses into AX. Recommend: Daya
  absorbs row 22; `gap-finders` = row 23 only; that
  skill may collapse further into the Architect's
  procedure set.

---

## Action items from this research

Listed in priority order:

1. **Aaron review** of the recommended pattern
   (hybrid 2 + 4) and the two new-skill candidates
   (`scope-hygiene`, `gap-finders`).
2. **On approval, author `scope-hygiene` skill** as
   Tier-3 work under the skill-edit-gating-tiers
   envelope (eval set, Prompt-Protector review,
   portability declaration, BP-NN citation).
3. **Row-36 BACKLOG entry** updated to reference
   `scope-hygiene` as the target skill rather than
   a standalone.
4. **Row-35 BACKLOG entry** updated likewise.
5. **Defer `gap-finders`** until Aaron confirms
   Daya-absorbs-row-22 question.
6. **Defer `round-close-sweep`** meta-skill until
   the Architect procedure demonstrably drifts.

---

## Reference patterns

- `docs/FACTORY-HYGIENE.md` — the 36-row source table
  this research operates over.
- `docs/research/skill-edit-gating-tiers.md` — the
  tier envelope new-skill authoring ships under.
- `docs/research/missing-scope-pilot-2026-04-20.md` —
  the pilot that validated the row-35 class.
- `memory/feedback_missing_hygiene_class_gap_finder.md`
  — the tier-3 meta-audit for absent classes
  (row 23); structurally related to this
  consolidation question.
- `memory/feedback_agent_qol_as_ongoing_hygiene_class.md`
  — Daya's agent-QOL cluster that owns rows
  25/26/28/29/30-34 (and possibly 22).
- `memory/user_absorb_time_filter_always_wanted.md`
  — Aaron's forward/retrospective split that
  informs `scope-hygiene`'s three-mode unification.
