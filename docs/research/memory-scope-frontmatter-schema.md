# Memory scope-frontmatter schema — design pass

**Status:** research, round 44. Proposed, not yet adopted.
Requires Aaron / Architect sign-off before CLAUDE.md
auto-memory section is updated (Tier-3 edit — changes
memory-emission behaviour).

**Underlying feature — AutoMemory (Anthropic,
Q1 2026).** The memory system this doc extends
is Anthropic's built-in AutoMemory feature
(`memory/reference_automemory_anthropic_feature.md`),
not a Zeta-local invention. The `scope:` field is
therefore a **factory-overlay optional addition**
— Anthropic's required fields (`name`,
`description`, `type`, `originSessionId`) remain;
`scope:` is added as an extension. Standard YAML
frontmatter semantics (unknown keys tolerated)
mean the factory-overlay approach is compatible
with future Anthropic schema updates. Anthropic-
schema *changes* (renaming or removing a required
field) would need to route through an Anthropic
bug report, not through this ADR.

**Source:** pilot audit at
`docs/research/missing-scope-pilot-2026-04-20.md` found
87% of 105 feedback+project memories lack explicit scope
declarations. This doc designs the absorb-time fix —
add `scope:` to the frontmatter so new memories carry
the tag at landing.

**Memory cross-refs:**
`memory/user_absorb_time_filter_always_wanted.md` (the
"absorb-time for me" register this fix fulfills),
`memory/feedback_scope_audit_skill_gap_human_backlog_resolution.md`
(the row-6 absorb-time scope-audit this extends).

---

## Current frontmatter schema

Anthropic-prescribed (AutoMemory base feature) —
every memory frontmatter block has:

```yaml
---
name: {{memory name}}
description: {{one-line description}}
type: {{user | feedback | project | reference}}
originSessionId: {{UUID, autofilled}}
---
```

`type` already carries *some* scope signal — a `user`
memory is implicitly about Aaron, a `project` memory is
about work items, a `reference` memory points at external
systems. But `type` is the taxonomy *kind*, not the
applicability *scope* — a `feedback` memory can apply
factory-wide or project-only, and today there's no field
that makes that distinction machine-readable.

---

## Proposed field — `scope:`

### Values

Closed enumeration:

| Value | Meaning | Example memory |
|---|---|---|
| `factory` | Applies to any project using this factory kit (universal). | `feedback_honor_those_that_came_before.md` |
| `project: <name>` | Applies only to the named project (currently only `zeta`). | `project_zeta_as_retractable_contract_ledger.md` |
| `user` | About Aaron personally (user-profile memories). | `user_faith_wisdom_and_paths.md` |
| `hybrid` | Spans factory + project (factory rule with project-specific exception). | `feedback_factory_default_scope_unless_db_specific.md` |

### Optional vs mandatory

**Mandatory** for new memories of types `feedback` +
`project`. These are the types the pilot found 87%
under-declared.

**Optional** for `user` + `reference` memories — scope
is implicit in the type:

- `user_*.md` files: implicit `scope: user`. Adding
  explicit `scope: user` is fine but redundant. Skip it
  unless the user memory is *also* a factory rule (rare
  — e.g., a user preference that becomes a universal
  factory constraint).
- `reference_*.md` files: implicit `scope: reference`
  (pointers to external systems are neither factory nor
  project scope). Treat as type-scoped.

### Placement in frontmatter

Immediately after `type`, before `originSessionId`:

```yaml
---
name: Foo
description: Bar
type: feedback
scope: factory
originSessionId: abcd-1234
---
```

Reason for placement: keeps semantic metadata grouped
(name/description/type/scope) and separates session
metadata (originSessionId) as a distinct concern.

---

## Why closed enumeration rather than free-form

**Rejected alternative:** allow free-form scope
declarations ("scope: factory + zeta but not for
external adopters" — any free text).

**Rejected because:**

1. **Grep-ability.** Row 35/36 retrospective audits need
   to pattern-match scope declarations cheaply. Closed
   enumeration makes the grep trivial; free-form
   requires an LLM pass per audit.
2. **Drift.** Free-form would grow ~100 variants over
   time (factory, factories, Factory, universal, global,
   everyone, all-projects, …) — each a distinct grep
   pattern. Closed enumeration stays bounded.
3. **Kanban's "explicit policies" practice**
   (`docs/FACTORY-METHODOLOGIES.md`) — the enumeration
   itself *is* the explicit policy.

**Handling genuinely complex cases** (e.g., a factory
rule with a documented exception for one project):

- Use `scope: hybrid` + body paragraph at the top of
  the memory naming the exception explicitly.
- The body paragraph is still grep-able by the
  retrospective audit (it reads `scope: hybrid` and
  flags for manual review of the exception body).

---

## Interaction with type taxonomy

The scope field **does not replace** `type`; it
**composes** with it:

| `type:` | `scope:` | Common combinations |
|---|---|---|
| `user` | (implicit user) | All user memories |
| `feedback` | `factory` | Most feedback memories (rules, discipline) |
| `feedback` | `project: zeta` | Feedback about Zeta-specific workflow |
| `feedback` | `hybrid` | Factory rule with Zeta-specific exception |
| `project` | `factory` | Factory-level project work (org design, methodology) |
| `project` | `project: zeta` | Zeta-specific project work (SQL frontend, operator impl) |
| `reference` | (implicit reference) | External-system pointers |

The composition makes the audit surface richer — `row 35
gap-finder` flags feedback/project memories without
`scope:`; `row 36` flags mis-tagged ones (e.g.,
`feedback` + `scope: project: zeta` when the content is
factory-universal).

---

## Absorb-time emission plan

Who emits the field?

### Option A — agent writes the field on new memory creation

Every agent invoking memory-write behaviour fills
`scope:` based on the content. This is the cheapest
option and matches current practice (agents fill the
other frontmatter fields today).

**Fallback for uncertainty:** if an agent cannot
confidently assign scope, they emit `scope: TBD` and
flag to HUMAN-BACKLOG as a `scope-clarification` row
(same pattern as the existing absorb-time scope audit
per
`memory/feedback_scope_audit_skill_gap_human_backlog_resolution.md`).

**Recommended.** Closest to current auto-memory flow;
no new machinery.

### Option B — auto-infer from type + filename

Derive scope from `type` + `filename pattern` without
agent input.

**Rejected because:** filename patterns don't cover
enough cases. `feedback_*.md` can be factory or project
scope indistinguishably from the filename.

### Option C — auto-infer from content via LLM

Run an LLM pass on the memory body to assign scope.

**Rejected because:** expensive, adds another LLM call
per memory emission, and reduplicates agent reasoning
(the agent already understands the content they're
writing).

**Decision:** Option A.

---

## Retrospective back-fill plan

The 91 under-declared memories from the pilot need
back-fill. Plan:

1. **Cadence:** ~10 memories per round, piggy-backed on
   whatever round's focus is touching them naturally
   (e.g., a scope-related round touches scope memories).
2. **Batching:** do not attempt a single-round bulk
   back-fill — that's ceremony with no flow benefit.
3. **Source-of-authority rule:** the author agent or
   the agent with strongest corpus-context on the
   memory body fills the tag. If ambiguous, flag to
   `scope-clarification` HUMAN-BACKLOG row.
4. **Duration:** ~9 rounds of 10-per-round back-fill
   closes the 91-row gap while absorb-time prevents new
   leakage.
5. **Measurement:** row 35 retrospective audit at each
   round-close measures the remaining gap; when
   remaining drops below 5%, declare the back-fill
   complete and reduce row 35 cadence to every 10
   rounds (Six Sigma Control phase locked in).

---

## What this change touches

1. **CLAUDE.md auto-memory section** — documents the
   new field + mandatory-vs-optional rules. **Tier-3
   edit** (changes memory-emission behaviour).
2. **Row 35 FACTORY-HYGIENE** — updated to cite the
   closed-enumeration values. Tier-1.
3. **Row 36 FACTORY-HYGIENE** — updated likewise.
4. **Row 6 FACTORY-HYGIENE** (absorb-time scope audit)
   — updated to cite the field. Tier-1.
5. **`docs/research/missing-scope-pilot-2026-04-20.md`**
   — updated with the schema decision. Tier-1.

Bundled rollout: the CLAUDE.md edit is the Tier-3 blocker;
the four Tier-1 edits can ship in the same commit once
Aaron / Architect approves the schema.

---

## Open questions

- **`project: <name>` value format** — lowercase, exact
  match to the project root folder name? Current
  convention in persona `project:` frontmatter field
  is lowercase (`project: zeta`). Recommend: same
  convention.
- **Multi-project adopters** (the factory running in
  more than one project concurrently — a future
  scenario per
  `memory/project_factory_reuse_beyond_zeta_constraint.md`)
  — does `scope: project: zeta, aurora` (list form)
  land cleanly? Recommend: defer until the multi-project
  case is real; start with single-project scalar.
- **`scope: TBD` review cadence** — who reviews
  HUMAN-BACKLOG `scope-clarification` rows?
  Recommend: Aaron, since scope ambiguity often surfaces
  an unstated constraint only Aaron can resolve.

---

## Reference patterns

- `memory/reference_automemory_anthropic_feature.md` —
  AutoMemory (the Anthropic-provided base feature
  this overlay extends).
- `memory/reference_autodream_feature.md` — AutoDream
  (the consolidation feature that runs on top of
  AutoMemory; distinct surface).
- `docs/research/missing-scope-pilot-2026-04-20.md` —
  the pilot audit that surfaced the 87% gap.
- `docs/FACTORY-METHODOLOGIES.md` — Kanban explicit
  policies + Six Sigma Control phase.
- `docs/FACTORY-HYGIENE.md` rows 6 / 35 / 36 — the
  three scope-audit rows that together form the
  absorb-time + retrospective pairing.
- `memory/user_absorb_time_filter_always_wanted.md` —
  Aaron's delegation of absorb-time filtering to the
  factory.
- `memory/feedback_scope_audit_skill_gap_human_backlog_resolution.md`
  — original absorb-time audit.
- `memory/feedback_factory_default_scope_unless_db_specific.md`
  — factory-default scope bias.
- `memory/project_factory_reuse_beyond_zeta_constraint.md`
  — multi-project future that makes scope tagging
  load-bearing.
- `CLAUDE.md` auto-memory section — where the Tier-3
  landing edit goes.
