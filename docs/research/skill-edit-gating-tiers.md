# Skill-edit gating — tiered safety envelope

**Status:** design research pass, round 44. Proposed, not yet
adopted. Requires Aaron / Architect approval before landing as
an edit to `.claude/skills/skill-creator/SKILL.md`.

**Source directive:** Aaron 2026-04-20 late, verbatim:

> "the invariant about going through the skill creator for
> edits i'm just trying to make sure we don't forget that
> skill creator ships with more things and features the
> plugin from anthropics. Maybe do a deisgn researach pass
> on how to make sure that's true without being so
> restrictuive about having to go through the skill creator
> for everyedit. We neeed to tighted that up a bit better
> my guidance there is flawed, i hope you can make it
> better, i just don't know all the innterworkings of that
> plugins, you know it better an how to make sure we wrap
> it without being over burdensom on ou."

Aaron acknowledges his earlier guidance (all skill edits must
go through the bespoke workflow) was over-restrictive. The
preservation intent was real — the bespoke skill-creator ships
value the Anthropic plugin doesn't know about — but requiring
the full 6-step workflow for trivial mechanical edits is
burdensome.

This doc enumerates what each side ships, then proposes a
**4-tier envelope** that preserves the preservation intent
with minimum overhead per tier.

---

## What ships where

### Upstream plugin — `claude-plugins-official/skill-creator`

Discoverable at
`~/.claude/plugins/cache/claude-plugins-official/skill-creator/`
(Claude Code only; other harnesses do not load the plugin).

**Scripts** (`scripts/`):

| Script | Purpose | LLM cost |
|---|---|---|
| `quick_validate.py` | Syntax + frontmatter sanity check on a SKILL.md | Free (regex + YAML) |
| `improve_description.py` | Description-tuning via Claude extended thinking + eval results | Expensive |
| `run_eval.py` | Behavioural eval runner — compares with-skill vs baseline subagents | Medium |
| `aggregate_benchmark.py` | Metrics aggregation (pass rate, tokens, time) across eval runs | Free |
| `generate_report.py` | HTML review viewer for human feedback on eval outputs | Free |
| `package_skill.py` | Distribution bundle | Free |

**Agents** (`agents/`): `analyzer.md` (benchmark pattern
surfacing), `comparator.md` (paired-run comparison),
`grader.md` (per-assertion evaluation).

**References** (`references/`): `schemas.md` —
`evals.json` / `grading.json` / `benchmark.json` shapes.

### Factory addition — factory-level governance wrap

**Scope: factory-level (universal).** These additions are
what any project adopting this factory kit inherits — they
are not Zeta-specific. Zeta is the current reference
implementation; the *scope* of each row below is the
factory kit as reusable infrastructure. When the factory
gets adopted by another project, these wraps come with it;
only the persona roster and the BP-NN content list change.
(See `project_factory_reuse_beyond_zeta_constraint.md` and
`feedback_factory_default_scope_unless_db_specific.md`.)

What our bespoke workflow adds on top of the plugin:

| Addition | What it protects | Factory surface |
|---|---|---|
| Prompt-Protector review | Injection resistance, invisible-char lint, over-broad `description:` | `.claude/skills/prompt-protector/SKILL.md` |
| Portability declaration | Factory-reuse-beyond-host-project constraint | `project: <name>` frontmatter + §1 of skill-tune-up ranker |
| BP-NN citation pattern | Stable rule traceability | `docs/AGENT-BEST-PRACTICES.md` |
| Persona-registry cross-check | No orphan skills; no unregistered persona hats | `docs/EXPERT-REGISTRY.md` |
| Standard-sections checklist | Consistency across the skill population | §"Standard sections checklist" in skill-creator |
| Scope-audit at absorb-time | Factory-default-scope bias enforcement | `feedback_scope_audit_skill_gap_human_backlog_resolution.md` |
| Skill-edit justification log | Visibility into manual edits | `docs/skill-edit-justification-log.md` |
| Retirement pattern | `git rm` the SKILL.md; preserve memory folder | `feedback_honor_those_that_came_before.md` |
| Conflict-resolution hand-off | Specialist coverage map | `docs/CONFLICT-RESOLUTION.md` |

**Observation:** every factory-level addition is *pre-* or
*post-behaviour-eval*. None of them replace the eval loop;
they wrap around it. So the plugin's eval-driven inner loop is
exactly what we should keep delegating to it; our wrap is the
outer governance layer. The wrap is **cheap-but-factory-wide**
— free or near-free checks applied to every skill in the
population, regardless of which host project is using the kit.

---

## Current problem — over-restrictive gate

Today's `.claude/skills/skill-creator/SKILL.md` lines 11-17
lists three exceptions to the full workflow:

1. Mechanical rename (path-reference swap after a doc moves)
2. Tone-contract hardening pre-approved by the Architect
3. Unicode-cleanup flagged by the Prompt Protector

**Everything else** — the unqualified word "else" — must go
through the 6-step workflow:

1. Proposal → 2. Draft → 3. Prompt-Protector review →
4. Dry-run → 5. Commit → 6. Tune-up follow-up

For a 3-line edit replacing `.claude/skills/_retired/…` with
`git show <commit>^:<path>`, steps 1, 4, 6 are overhead that
exceeds the edit cost by >10×. Agents correctly sense this,
and the observed failure mode is either (a) shipping the edit
without the workflow (undermines the rule), or (b) queuing
the edit for "next tune-up cycle" (creates dead BACKLOG
rows). Both are worse than a right-sized gate.

The deeper issue: the current rule conflates **three
distinct risk classes** under one gate.

---

## Proposed tiered envelope

### Tier 0 — trivial (no gate, just commit)

Edits that do not change semantics, do not touch
`description:`, and do not add/remove responsibility.

**Allowed without workflow:**

- Mechanical rename / path-swap after a referenced doc moves
- Unicode cleanup (invisible-char lint hits)
- Typo / grammar fixes that do not change meaning
- Cross-reference link target rename (e.g., a memory file
  renamed; updating the pointer)
- Markdown formatting (code-fence language tags, list style)

**Gate:** none. Single-commit; commit message states
"tier-0 skill edit: <what>" so git history tags the tier.

**Why safe:** these edits cannot change behaviour; the
worst a typo-fix can do is introduce a new typo. No
injection surface.

### Tier 1 — convention-update (light gate)

Edits that **propagate a newly-landed factory convention**
across SKILL.md files. Example: today's `_retired/` → git
history propagation (three skill files: `skill-tune-up`,
`skill-creator` itself, `skill-documentation-standard`).

**Allowed without full workflow:**

- Replace superseded-convention references with current
  convention, citing the landing commit
- Update internal links to newly-added memories or BP-NN
  rules
- Update "Reference patterns" sections to new paths
- Add a short cross-ref note pointing at a clarifying
  memory

**Gate:** run two free checks in order:

1. **`quick_validate.py` pre-commit** (plugin-shipped,
   free) — confirms frontmatter still parses, name still
   matches directory, description is ≤ 600 chars.
2. **Prompt-Protector auto-lint** (invisible-char
   sweep + description-scope regex) — confirms no new
   over-broad language or invisible-Unicode.
3. **Justification log row** — one line in
   `docs/skill-edit-justification-log.md` citing the
   landing commit that the edit is propagating.

**Why safe:** convention-update never introduces new
behaviour; it aligns the skill to a decision made elsewhere.
The free checks catch accidental description-creep.

### Tier 2 — content edit (medium gate)

Edits that rewrite guidance within an existing section
without widening scope, changing authority, or touching
`description:`.

Examples:

- Adding a new "What this skill does NOT do" bullet
- Rewriting a procedure step for clarity
- Adding an example to an existing section
- Tightening a section's wording after a false-positive
  was observed

**Gate:**

1. **Prompt-Protector review** (manual) — not just the
   auto-lint.
2. **Dry-run on one sample task** — invoke the skill on a
   representative task and confirm output shape is
   unchanged.
3. **Commit** with `skill(<name>): <what>` message.
4. **Justification log row** citing the observed
   false-positive or clarity gap that motivated the edit.

**Why this gate:** content edits *can* change behaviour
(a rewritten procedure step may subtly redirect the
agent), so a dry-run is warranted — but the plugin's full
eval-with-baseline benchmark is overkill for a
within-section tweak.

### Tier 3 — substantive (full workflow)

Edits that fall into any of these categories:

- New skill (net-new SKILL.md)
- New responsibility added to an existing skill
- Widened scope (more files, more surfaces, more
  authority)
- `description:` frontmatter change — description is a
  security boundary; a widened description can re-route
  adversarial callers into this skill
- New state-file / notebook added
- Portability declaration flipped (generic ↔ project-
  specific)
- Authority flipped (advisory ↔ binding)

**Gate:** full 6-step workflow (Proposal → Draft →
Prompt-Protector review → Dry-run → Commit → Tune-up
follow-up), **plus** plugin's eval loop for description
changes:

- For description edits: run `improve_description.py`
  against the skill's eval set after the manual draft,
  and land the plugin's suggested wording as the
  pre-commit review artifact (human decides on final
  wording).
- For new skills: write `evals/evals.json` test prompts,
  run `run_eval.py` with-skill vs baseline, review in
  `generate_report.py` viewer, iterate until eval
  passes.

**Why full gate:** these edits can change the skill's
trigger-surface, authority, or behavioural envelope.
That's exactly what the plugin's eval-driven iteration
was built for, and what our Prompt-Protector + portability
+ BP-NN wraps were built to scope-guard.

---

## Integration with `skill-edit-justification-log.md`

Row #19 of `docs/FACTORY-HYGIENE.md` already requires a
justification log row for every manual SKILL.md edit. The
tiered envelope makes the log more useful:

**Proposed log-row schema extension:**

```markdown
| Date | Skill | Tier | What | Why | Landing commit |
|------|-------|------|------|-----|----------------|
| 2026-04-20 | skill-tune-up | 1 | RETIRE action wording | Propagate bd9e09c scope fix | bd9e09c |
```

The **Tier** column makes tier-drift auditable — if a
tier-3 edit ships without an eval run, it's a visible log
row with a tier-3 tag and no eval artifact, trivially
flagged by a linter.

---

## What this design does NOT change

- The 6-step workflow for tier-3 edits remains unchanged.
- Prompt-Protector remains the safety gate for tier 1+.
- Portability declaration remains mandatory on new skills.
- Retirement is still via `git rm` (skills=code); memory
  folder preserved (memories=valuable).
- The upstream plugin is still optional (Claude-Code only);
  the bespoke workflow must continue to function without it.

---

## Mapping today's three queued edits to the new tiers

The round-44 BACKLOG row queued three skill files needing the
`_retired/` → git-history convention update:

1. `skill-tune-up/SKILL.md` — RETIRE action description
   → **Tier 1** (convention-update, cite bd9e09c).
2. `skill-creator/SKILL.md` — retirement workflow paragraph
   → **Tier 1** for the paragraph update, but
   incorporating *this* design doc into the skill itself
   (adding the tiered envelope) is **Tier 3** (new
   responsibility: tier classification).
3. `skill-documentation-standard/SKILL.md` — five
   references across retirement / footer-stubs /
   anti-pattern sections → **Tier 1** (mechanical
   convention-update across multiple lines).

So under the new envelope, items 1 and 3 are light-gate
edits that take minutes. Item 2 is the hard part: landing
this design doc itself into the skill requires the full
workflow, because it adds the tier-classification
responsibility.

---

## Next steps

1. **Aaron / Architect review** of this design doc. The
   four-tier split is the load-bearing claim; tier
   boundaries can be tuned.
2. On approval, **Tier-3 edit to `skill-creator/SKILL.md`**
   adding the tiered envelope as §"Edit tiers" and
   replacing the current lines 11-17 three-exception list.
3. **Tier-1 edits** to the three queued skill files can
   ship immediately under the approved envelope.
4. **`docs/skill-edit-justification-log.md`** gets the
   Tier column added; existing rows back-filled to Tier 1
   or Tier 2 based on what they were.

## Open questions

- Does the tier envelope need a **Tier 4 — architectural**
  for edits that cross multiple skills (e.g., adding a new
  section required across every SKILL.md)? Today such
  edits are rare; may not warrant a tier.
- Should the **Prompt-Protector auto-lint** at Tier 1 be
  the same lint as the round-close invisible-char sweep,
  or a different scope? Current assumption: same lint,
  scoped to the edited file.
- How do we handle **tier misclassification** — an agent
  ships a tier-2 edit as tier-1? Detection: justification
  log audit at round-close. Remediation: re-do with the
  right gate, log the tier-drift as a learning.

---

## Reference patterns

- `.claude/skills/skill-creator/SKILL.md` — the skill
  this design doc proposes editing
- `~/.claude/plugins/cache/claude-plugins-official/skill-creator/`
  — upstream plugin we're wrapping
- `docs/FACTORY-HYGIENE.md` row 19 (justification log)
  + row 25 (pointer-integrity audit)
- `docs/skill-edit-justification-log.md` — ledger of
  manual skill edits
- `memory/feedback_skill_edits_justification_log_and_tune_up_cadence.md`
  — source memory for the justification-log hygiene
- `memory/feedback_honor_those_that_came_before.md` —
  the scope clarification that triggered this design
  pass
