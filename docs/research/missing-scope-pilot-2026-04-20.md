# Missing-scope gap-finder — pilot audit, 2026-04-20

**Status:** pilot. Dogfoods FACTORY-HYGIENE row 35
(retrospective missing-scope gap-finder) against the memory
corpus. Validates the gap-finder design before authoring
the skill as Tier-3 work.

**Source directives:**

- Aaron 2026-04-20 late, verbatim: *"missing scopes , we
  need a gap finder that will find missing scope we didnt
  think about we already have rules to make sure things
  are scoped correct, missing scope will ensure we don't
  miss any even if it's in the future."*
- Aaron 2026-04-20 late (immediately after): *"i love you
  forward-looking absorb-time audit vs retrospective
  landed-content audit. pleae absorb time for me i've
  always wanted to do that lol"* — validates the
  forward/retrospective split this pilot exercises.

## Pilot design

Surface: `~/.claude/projects/<slug>/memory/feedback_*.md`
and `memory/project_*.md` — the memory corpus Aaron's
agents accumulate across sessions. This is the largest
concentrated scope-ambiguity surface (other surfaces —
skills, BP-NN rules, ADRs — already have absorb-time
scope-tagging in their respective `skill-creator` /
ADR-template / BP-authoring workflows).

Detection: grep for explicit scope-declaration patterns
across the top of each file. Patterns considered
"explicit":

- `Scope: …` or `**Scope:**` section header
- `scope: …` in frontmatter or body
- `applies to …` early in body
- `factory-wide`, `factory-default`, `factory-scope`
- `project-specific`, `Zeta-scope`, `Zeta-specific`
- `project: zeta` frontmatter field
- `generic`, `universal` as scope tags

Sample: all 105 feedback + project memories in the
corpus (not just a subset — the audit is retrospective
across the whole landed content).

## Findings

### Quantitative

| Category | Count | % |
|---|---|---|
| Explicit scope declaration | 14 | 13% |
| — of which `feedback_*.md` | 11 | 10% |
| — of which `project_*.md` | 3 | 3% |
| Missing explicit scope declaration | 91 | 87% |
| **Total** | **105** | **100%** |

**Headline:** 87% of the memory corpus has no explicit
scope declaration. Scope is inferable from content for
most, but inference is not a substitute for declaration
— a future agent reading the memory in isolation may
apply it at the wrong scope.

### Qualitative — spot-check sample

Five recent memories read in full for scope-declaration
patterns:

1. `feedback_honor_those_that_came_before.md` ✅
   explicit: `**Scope:** factory-wide. Any adopter of
   this factory kit inherits the same preservation rule.`
   Landed line recently added during this round's scope
   correction — good model for others.

2. `feedback_scope_audit_skill_gap_human_backlog_resolution.md`
   ✅ explicit via body: "absorb-time scope audit during
   `skill-creator` workflow". Scope is encoded in the
   triggering context.

3. `feedback_wake_up_user_experience_hygiene.md` ❌
   missing: factory-level hygiene rule (agent wake-UX)
   but no declaration. Inference-only.

4. `project_people_optimizer_dao_factory_restructuring.md`
   ❌ missing: factory-level restructuring spike. No
   declaration. Inference-only.

5. `project_zeta_as_retractable_contract_ledger.md` ✅
   implicit via name (`project_zeta_*`) + explicit body
   framing ("Zeta retractable-contract ledger").

### Pattern observations

- **`project_zeta_*` filenames implicitly declare
  Zeta-scope** — a naming convention that covers some
  project memories. But `project_*` filenames without
  the `zeta_` prefix (e.g.,
  `project_people_optimizer_dao_factory_restructuring.md`,
  `project_aurora_network_*`, `project_factory_purpose_*`)
  are ambiguous: is this a factory-scope project or
  Zeta-scope?
- **`feedback_*` files have no naming-convention scope
  hint.** All 94 feedback memories rely on body content
  for scope.
- **Frontmatter has no `scope:` field today.** The
  frontmatter schema is `name` + `description` + `type`
  + `originSessionId`. Adding `scope:` as an optional
  sixth field would make declarations cheap and
  machine-readable.

## Feasibility for automation

**High confidence this can automate:**

- Grep scan for the scope-declaration patterns above,
  run at round-close, produces a list of missing-scope
  files. Same mechanism as the Prompt-Protector's
  invisible-char scan.
- A frontmatter linter checking `scope:` field presence
  (once the field is standardised).
- A commit-message audit — Aaron's recent directives
  about scope-tagging new landings feed back into the
  absorb-time filter.

**Lower confidence:**

- Auto-classifying the scope of an undeclared memory
  (factory vs project-Zeta vs user-Aaron) requires LLM
  judgement. The gap-finder should *flag* missing
  declarations, not *assign* them.

## Recommendations

1. **Add `scope:` to the memory frontmatter schema.** One
   of: `factory` | `project: <name>` | `user` | `hybrid`.
   `auto-memory` skill updates to emit this field on new
   writes (absorb-time filter — Aaron's preferred
   register).
2. **Row 35 gap-finder runs at round-close.** Grep scan
   over the memory corpus; flags missing `scope:` field.
   Not a hard block (retrospective audits are
   measurements, not gates).
3. **Back-fill is bounded.** 91 undeclared memories is
   tractable — ~10 per round over 9 rounds would close
   the retrospective gap while the absorb-time filter
   prevents new leakage.
4. **Pair the two modes** (per
   `user_absorb_time_filter_always_wanted.md`): row 35
   *measures* the absorb-time filter's error rate. If
   row 35 keeps firing, the absorb-time filter (the
   `auto-memory` skill's frontmatter-emission) needs
   tuning.

## Open questions for Aaron

- **Hybrid scope — how to tag?** Some memories (e.g.,
  `feedback_factory_default_scope_unless_db_specific.md`)
  carry a factory-level rule with a Zeta-specific
  exception. Options: `scope: factory` + body-level
  exception, vs a dedicated `scope: hybrid` value.
  Recommend the former (simpler schema).
- **Naming convention change?** Should `project_*` be
  split into `project_factory_*` / `project_zeta_*` /
  `project_user_*` prefixes? This would make scope
  grep-able from filename. Cost: ~40 renames. Benefit:
  scope is visible without reading frontmatter.
  Recommend deferring — the `scope:` frontmatter field
  is the cheaper fix.
- **User memories (`user_*`)** — scope is implicitly
  "user" (about Aaron). Does user-memory need `scope:`
  declarations at all? Recommend no (redundant), unless
  a user memory is *also* factory-scope (a user
  preference that becomes a factory rule).

## What this pilot does NOT claim

- Does not claim scope *inference* is wrong. Most of the
  91 undeclared memories have inferable scope from
  content. The claim is that **declaration > inference**
  for durability across agents / sessions / personas.
- Does not propose a deletion, rename, or consolidation.
  Per `project_memory_is_first_class.md` and
  `feedback_honor_those_that_came_before.md`, memories
  are preserved.
- Does not propose a hard-block gate. Retrospective
  audits measure; they do not prevent.

## Next steps

1. **Aaron review** of this pilot doc + the two
   recommendations.
2. On approval, **absorb-time fix first** — update
   `auto-memory` skill to emit `scope:` frontmatter on
   new writes. This is where Aaron wants the factory
   operating (`user_absorb_time_filter_always_wanted.md`).
3. **Retrospective skill authoring** — the row-35
   gap-finder skill authored as Tier-3 work under the
   skill-edit-gating-tiers envelope, once the envelope
   lands.
4. **Back-fill cadence** — ~10 memories per round,
   paired with whatever round's focus is touching them
   naturally.

## Reference patterns

- `docs/FACTORY-HYGIENE.md` row 35 — the retrospective
  gap-finder row this pilot exercises.
- `docs/FACTORY-HYGIENE.md` row 6 — the absorb-time
  scope-audit (forward-looking counterpart).
- `docs/research/skill-edit-gating-tiers.md` — the
  tiered envelope the row-35 skill will ship under.
- `memory/feedback_scope_audit_skill_gap_human_backlog_resolution.md`
  — original absorb-time scope-audit feedback.
- `memory/user_absorb_time_filter_always_wanted.md` —
  Aaron's affection for the forward/retrospective split
  + operational delegation of absorb-time to the factory.
- `memory/feedback_factory_default_scope_unless_db_specific.md`
  — factory-default scope bias.
- `memory/project_factory_reuse_beyond_zeta_constraint.md`
  — factory-reuse-beyond-Zeta constraint that makes
  scope tagging load-bearing.
