# Kanban + Six Sigma — factory process research

**Status:** research spike, round 44. Proposed, not yet
adopted. Companion to
`docs/research/hygiene-skill-organisation.md` — the
pull-vs-always-on distinction from Kanban feeds the
consolidation decision.

**Source directive:** Aaron 2026-04-20 late:

> *"also khanban is a good practice, i prefer it and
> six sigma, we should have some skills documents
> process factory improvments around that we should
> backlog this research"*

**Memory source:** `user_kanban_six_sigma_process_preference.md`.

---

## Summary of the ask

Aaron's process-improvement preference is explicit:
**Kanban + Six Sigma**. The factory already does
partial versions of both ad-hoc; this research makes
both methodology-explicit, surfaces the gaps, and
recommends the smallest set of skills / docs that
close them without adding ceremony.

Constraint from the memory: **adopt the practices, not
the bureaucracy.** No yellow-belt certs, no ISO-9001
theater. The test for any proposed artifact: "does this
improve how the factory runs, or does it just
document-by-numbers?"

---

## Part 1 — Kanban mapping

### Kanban practices → factory state

| Practice | Factory instance today | Gap? |
|---|---|---|
| Visualise the work | `docs/BACKLOG.md` (P0-P3 lanes), `docs/ROUND-HISTORY.md` (Done ledger) | No visual board (text-only); acceptable |
| WIP limits | Architect-bottleneck per GOVERNANCE §11 is *de facto* WIP-1 on review | **Not explicitly labelled WIP; no per-persona WIP** |
| Pull, not push | Round-cadence pulls from backlog; `/loop` dynamic ticks are pull-based | OK — the pull-cadence is native |
| Continuous delivery | Every round commits + pushes; no big-bang releases | OK |
| Explicit policies | BP-NN rules, GOVERNANCE sections, CLAUDE.md load-bearing rules | OK — well-codified |
| Feedback loops | Retrospective audits (rows 35/36); meta-wins log; `/loop` ticks | OK — multiple instances |
| Evolve experimentally | Skill-tune-up ranker + ADR-gated promotion | OK |

### Kanban gap — WIP limits

The only meaningful Kanban gap is **WIP limits**. The
Architect-bottleneck is the de facto WIP-1 on review,
but:

- It isn't *labelled* as WIP. Agents reach for it
  without knowing the frame.
- **Per-persona WIP** doesn't exist. Daya / Aarav /
  Ilyana can accumulate in-flight findings without a
  visible cap.
- **Per-cadence-slot WIP** doesn't exist. A round can
  bite off more than it can close.

**Proposal:** codify WIP limits as a FACTORY-HYGIENE
row (proposed row 37) rather than a full skill.
Reason: WIP is a discipline that applies to everyone
rather than a trigger-gated procedure. A one-row
rule with a per-persona cap suggestion is cheaper than
a new skill and carries the Kanban vocabulary into
future factory discussions.

### The "pull-triggered vs always-on" criterion

Kanban distinguishes:

- **Pull-triggered work** — flows when capacity is
  free and a trigger fires. Candidate for a **skill**
  (discrete trigger, discrete procedure).
- **Always-on discipline** — lives in every agent's
  posture. Candidate for a **checklist-item** or
  **BP-NN rule** (not a skill).

This is the criterion the hygiene-consolidation
research (§"Criteria for future decisions") was
reaching for without the vocabulary.

Applied to the 36 hygiene rows:

- **Pull-triggered** (skill candidates): 3, 5, 6, 7,
  13, 16, 17, 22, 23, 29, 35, 36 — all have a
  specific trigger (pre-commit, round-close,
  absorb-time, wake-friction observed).
- **Always-on discipline** (checklist / BP): 4, 8, 9,
  11, 12, 18 — apply to every action, not triggered.
- **CI-level** (not a skill): 1, 2.
- **Session-open lightweight checks** (< 10s cap per
  rows 26/28): 21, 26, 28 — live as session-open
  procedure, not skills.
- **Architect procedure** (not a skill, Architect's
  posture): 15, 20, 24, 27.

This classification **matches** the hygiene-consolidation
research's recommendation (`scope-hygiene` skill +
`gap-finders` skill; leave the rest as-is). Kanban
vocabulary **validates** rather than changes the
recommendation. Good news: the two research spikes are
congruent.

---

## Part 2 — Six Sigma mapping

### DMAIC → factory state

| DMAIC phase | Factory instance today | Gap? |
|---|---|---|
| **Define** | BACKLOG row + ADR proposal stage | OK |
| **Measure** | DORA 2025 metrics + 4 Golden Signals + RED + USE | Partial — DORA mapping not yet tied to specific factory improvements |
| **Analyze** | Meta-wins log (`docs/research/meta-wins-log.md`) + harsh-critic reviews | OK |
| **Improve** | ADR implementation + round commits | OK |
| **Control** | FACTORY-HYGIENE cadenced rows + BP-NN rules | OK |

### Six Sigma gap — explicit DMAIC walkthrough

Meta-wins are captured but the full DMAIC cycle
(Define → Measure → Analyze → Improve → Control) is
implicit. When a factory improvement proposal lands,
there's no template that forces the proposer to
answer:

- **Define** — what exact problem does this address?
- **Measure** — what is the current-state baseline?
  How will we know the fix worked?
- **Analyze** — what root-cause analysis justifies
  this intervention over alternatives?
- **Improve** — what's the fix + its expected
  quantitative impact?
- **Control** — what cadenced hygiene row or BP-NN
  rule prevents regression?

**Proposal:** template document at
`docs/templates/DMAIC-proposal-template.md` that
factory-improvement ADRs inherit. Not a skill — a
template. Reason: the cognitive cost of filling the
template is the Six Sigma discipline; a skill would
wrap the template in triggering logic, which isn't
needed (Aaron / Architect invoke the template
manually when an improvement is proposed).

### The "Control phase = FACTORY-HYGIENE row" mapping

Six Sigma's Control phase is exactly what
`docs/FACTORY-HYGIENE.md` is for: codified cadenced
checks that prevent a fixed defect from returning.
This means:

- **Every new hygiene row should cite the Measure
  phase evidence** that motivated it (what variance
  / defect did we observe?).
- **Every new hygiene row should have an Analyze
  statement** (why is this the right Control?).
- **Absorb-time audit vs retrospective audit**
  (Aaron's preferred split,
  `user_absorb_time_filter_always_wanted.md`) maps
  to Control (absorb-time prevents) + Measure
  (retrospective measures prevention's error rate).
  **Six Sigma's DMAIC is structurally Aaron's split
  without the vocabulary.**

This is a strong alignment signal: Aaron's native
process intuition matches Six Sigma's explicit
framework. The research should surface this rather
than teach from scratch.

---

## Part 3 — Recommended artifacts

### Artifact 1 — `docs/FACTORY-METHODOLOGIES.md`

One-page summary naming Kanban + Six Sigma as the
factory's methodologies of record, with links to:

- Kanban practices + factory mappings (from Part 1).
- DMAIC cycle + factory mappings (from Part 2).
- The pull-vs-always-on criterion for skill-or-checklist
  decisions.
- Absorb-time-as-Control + retrospective-as-Measure
  mapping to Aaron's preferred split.

Factory-scope (universal — every adopter inherits).

**Why a doc not a skill:** methodology naming is
reference material read once per onboarding, not
triggered procedure.

### Artifact 2 — `docs/templates/DMAIC-proposal-template.md`

Fillable template for factory-improvement proposals.
Five sections (D/M/A/I/C), each with prompts. ADRs
proposing a new cadenced hygiene row or a new BP-NN
rule fill the template before the ADR lands.

Factory-scope.

### Artifact 3 — FACTORY-HYGIENE row 37: WIP-limit discipline

New row codifying Kanban WIP as factory discipline:

```
| 37 | WIP-limit discipline | Round open + per-persona session-open | All agents (self-administered) + Architect for cross-persona | factory | Agents track in-flight findings / proposals per persona (suggested cap 3); Architect tracks cross-persona WIP (suggested cap 7); flag over-cap to HUMAN-BACKLOG `wip-pressure` row | Inline self-report; notebook tally column | `user_kanban_six_sigma_process_preference.md` |
```

Factory-scope, always-on discipline (per Part 1's
criterion — not a skill).

### Artifacts explicitly **not** proposed

- **No `kanban-flow` skill.** Kanban's practices are
  either codified elsewhere (BACKLOG tiers, round
  cadence) or always-on discipline (WIP limits).
  Neither is skill-shaped. Rejected — the earlier
  BACKLOG sketch was over-built.
- **No `six-sigma-dmaic` skill.** DMAIC is a
  template-driven cognitive process, not a
  triggered procedure. The template (Artifact 2) is
  the right artifact shape. Rejected — same reason.
- **No methodology-police skill.** Aaron's
  "adopt the practices, not the bureaucracy"
  constraint rejects any skill that audits
  methodology compliance.

---

## Part 4 — Implementation sequencing

Ordering that respects dependencies and Aaron's
"adopt practices, not ceremony" constraint:

1. **Land Artifact 1** (`FACTORY-METHODOLOGIES.md`) —
   one-page doc, Tier-1 work. Gives every subsequent
   factory improvement a vocabulary to cite.
2. **Land Artifact 2** (`DMAIC-proposal-template.md`)
   — template file, Tier-1 work. Cited by future ADRs.
3. **Land Artifact 3** (FACTORY-HYGIENE row 37) —
   one-row edit, Tier-1 work.
4. **Revise consolidation research** to cite the
   pull-vs-always-on criterion from Part 1, under
   Kanban vocabulary. Tier-1 edit to
   `docs/research/hygiene-skill-organisation.md`.
5. **Back-update BACKLOG row** for Kanban + Six Sigma
   to cite this research doc + mark the proposed
   skills rejected (only artifacts 1-3 land).

All five items are small-effort (S), bounded by the
factory's existing machinery. No new skill-authoring
required. **Total skill count delta from this
research: 0.**

---

## Part 5 — Anti-patterns guarded against

Explicitly rejected per Aaron's constraint:

- **Belt-certification hierarchy** (green / black /
  master black belt) — status-reverence, not
  practice. Rejected by
  `user_no_reverence_only_wonder.md`.
- **ISO-9001 documentation theater** — paperwork that
  doesn't predict failure. Rejected by Rodney's Razor.
- **Standup ceremony** — Kanban doesn't require daily
  standups; the factory's round-cadence + `/loop`
  ticks are the inspection rhythm.
- **Control charts + Cpk / Cp indices** — statistical
  process control belongs in manufacturing. The
  factory's "defects" are not numerically continuous;
  they're discrete agent-errors / drift events.
  Reject quantitative SPC in favour of qualitative
  retrospective audits (which we already have).
- **Kanban software tooling** (Jira, Trello, LeanKit).
  `docs/BACKLOG.md` + `git` are the visible board.
  Additional tooling would dilute the single-source-
  of-truth posture.

---

## Open questions

- **WIP-limit numbers (cap 3 per persona, cap 7
  cross-persona)** — these are sketches, not measured.
  Should land as suggestions with a note to tune
  after 5-10 rounds of observation (Six Sigma's
  Measure → Improve loop applied to the new rule).
- **Does `FACTORY-METHODOLOGIES.md` live in `docs/`
  root or under `docs/research/`?** Root, probably —
  it's reference material, not a research product.
- **Does the DMAIC template apply to every ADR or
  only to factory-improvement ADRs?** Only factory-
  improvement (new hygiene row, new BP-NN, process
  change). Feature-ADRs keep the existing format.

---

## Reference patterns

- `memory/user_kanban_six_sigma_process_preference.md`
  — source memory; the ask.
- `memory/user_absorb_time_filter_always_wanted.md`
  — forward/retrospective split = DMAIC Control +
  Measure.
- `memory/feedback_dora_is_measurement_starting_point.md`
  — DORA 2025 = Six Sigma Measure substrate.
- `memory/reference_dora_2025_reports.md` — 7-capability
  Zeta mapping.
- `memory/feedback_data_driven_cadence_not_prescribed.md`
  — instrument + observe + tune = DMAIC iteration.
- `memory/feedback_meta_wins_tracked_separately.md` —
  Analyze + Improve record.
- `memory/feedback_runtime_observability_starting_points.md`
  — 4 Golden Signals + RED + USE = Measure phase.
- `memory/user_no_reverence_only_wonder.md` — the
  constraint rejecting belt-certs + ISO theater.
- `docs/research/hygiene-skill-organisation.md` —
  the consolidation research this spike validates
  via the pull-vs-always-on criterion.
- `docs/FACTORY-HYGIENE.md` — 36 rows (row 37 proposed
  here).
- `docs/BACKLOG.md` — P0-P3 Kanban priority lanes.
