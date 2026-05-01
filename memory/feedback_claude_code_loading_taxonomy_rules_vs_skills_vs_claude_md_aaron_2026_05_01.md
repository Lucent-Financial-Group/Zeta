---
name: Claude Code loading taxonomy — rules vs skills vs CLAUDE.md vs memory — direct-load vs router vs lazy — the human maintainer 2026-05-01
description: The human maintainer 2026-05-01 question — *"is .claude/rules anthropic endorsed? skills are there too but go through a router that i don't how reliable is but you control the router search description does rules work in a similar way?"* Verified against canonical Anthropic docs at code.claude.com/docs/en/memory (WebSearch + WebFetch 2026-05-01). YES — `.claude/rules/*.md` is Anthropic-endorsed. The loading mechanism is DIFFERENT from skills — rules are direct-loaded by the harness; skills are router-keyed via the `Skill` tool's description matching. CLAUDE.md, `.claude/rules/` (no paths), and CLAUDE.local.md are all "wake-time direct-load" surfaces (loaded full at session start, same priority). `.claude/rules/` with `paths:` frontmatter glob = lazy-load when Claude reads matching files. Skills = router-loaded only from canonical `.claude/skills/<name>/SKILL.md`. Memory MEMORY.md = first 200 lines / 25KB at session start. Critical correction to my mental model: I was conflating "wake-time loaded" with "via CLAUDE.md pointer" — rules are wake-time loaded WITHOUT being pointed at from CLAUDE.md.
type: feedback
caused_by:
  - "The human maintainer 2026-05-01 verbatim: 'is ./claude/rules anthropic endorsed?'"
  - "Predecessor verbatim same tick: 'skills are there too but go though a router that i don't how reliable is but you control the routher search description does rules work in a similar way? you had to really test this to figure it out we tried a different folder than .claude/skills or they would not load in your router.'"
  - "WebSearch + WebFetch 2026-05-01 on https://code.claude.com/docs/en/memory confirmed `.claude/rules/` is documented in canonical Anthropic source (not third-party convention)"
  - "Composes with the meta-rule landed earlier same session in feedback_learnings_must_land_in_claude_md_or_pointer_aaron_2026_05_01.md — that memo's example list of pointer targets was incomplete (didn't include .claude/rules/ as a direct-load wake-time surface)"
composes_with:
  - feedback_learnings_must_land_in_claude_md_or_pointer_aaron_2026_05_01.md
  - feedback_otto_364_search_first_authority_not_training_data_not_project_memory_aaron_2026_04_29.md
  - feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md
---

# Rule

Claude Code has FIVE distinct surfaces for instruction /
memory loading, with three different mechanisms:

## Direct-load wake-time surfaces (no router, no lazy)

These load at session start, full content, in context.
The harness reads them directly from canonical paths.

1. **`CLAUDE.md`** — project-shared, loaded from
   `./CLAUDE.md` or `./.claude/CLAUDE.md`. Multiple
   locations supported (managed policy, project, user,
   local) per Anthropic docs §"Choose where to put
   CLAUDE.md files."
2. **`.claude/rules/*.md` without `paths:` frontmatter** —
   project-shared, recursive discovery under
   `.claude/rules/`. **Same priority as
   `.claude/CLAUDE.md`** per Anthropic docs §"Organize
   rules with `.claude/rules/`." User-level analogue:
   `~/.claude/rules/`.
3. **`CLAUDE.local.md`** — personal project notes,
   gitignored.

## Lazy-load wake-time surfaces (path-glob-keyed)

Loaded into context only when Claude reads a file matching
the configured glob pattern.

4. **`.claude/rules/*.md` with `paths:` frontmatter** —
   YAML frontmatter `paths:` field is a glob list; rule
   loads only when Claude opens a file matching one of the
   globs. This is the *path-scoped rule* mechanism.

## Router-keyed surfaces (description-matched)

The harness's `Skill` tool searches available skills by
description and surfaces matches to the model. The model
chooses whether to invoke; invocation loads the
`SKILL.md` body into context.

5. **`.claude/skills/<name>/SKILL.md`** — only the
   canonical path is discovered. Empirically (the human
   maintainer 2026-05-01 tested), skills in
   non-canonical folders are NOT loaded — the router
   has a hard-coded path expectation.

## On-demand surfaces (memory)

6. **`~/.claude/projects/<project>/memory/MEMORY.md`** —
   first 200 lines OR 25KB (whichever first) loaded at
   session start. Topic files (`*.md` siblings of
   `MEMORY.md`) are NOT auto-loaded; read on-demand by
   Claude using standard file tools.

# Why

The human maintainer 2026-05-01 (verbatim, two-message
clarification):

> *"skills are there too but go though a router that i
> don't how reliable is but you control the routher search
> description does rules work in a similar way? you had to
> really test this to figure it out we tried a different
> folder than .claude/skills or they would not load in your
> router."*
>
> *"is ./claude/rules anthropic endorsed?"*

Two composing arguments:

## Why-1: The mental-model gap I had

Before this clarification, I was conflating two distinct
concepts:

- **"Wake-time loaded"** — the property of being in
  context at session start.
- **"Pointed at from CLAUDE.md"** — a specific way of
  achieving wake-time discoverability.

These are not the same. `.claude/rules/*.md` files are
**wake-time loaded** by the harness directly, WITHOUT being
pointed at from CLAUDE.md. The harness does the discovery
itself; the rule body becomes context regardless of any
CLAUDE.md content.

The earlier memo (`feedback_learnings_must_land_in_claude_md_or_pointer_aaron_2026_05_01.md`)
listed CLAUDE.md, AGENTS.md/BP-NN/skill/agent transitive
discovery — but did not list `.claude/rules/`. That's a real
gap in the meta-rule's pointer-target list. This memo
fills it.

## Why-2: The asymmetry between rules and skills

Both `.claude/rules/` and `.claude/skills/` use the
`.claude/` namespace. Both are Anthropic-endorsed. But
they load via DIFFERENT mechanisms:

- **Rules**: harness discovers and loads directly. No
  description matching, no model decision, no router. The
  glob in `paths:` is a *path-pattern matcher* (file-system
  pattern), not a *semantic matcher* (description-keyed).
  Rules are essentially "additional CLAUDE.md content"
  with optional path-scoping.
- **Skills**: the `Skill` tool searches by frontmatter
  `description`. The model's prompt-context determines
  whether the skill description matches the current task;
  the model invokes the `Skill` tool with the matching
  skill name. The router is the description-matcher; the
  human maintainer's empirical observation 2026-05-01 is
  that this router only matches against descriptions in
  `.claude/skills/<name>/SKILL.md` (non-canonical paths
  produce no results).

The implication for Zeta: when adding wake-time substrate,
`.claude/rules/` is a viable target — particularly for
path-scoped guidance (e.g. rules that only apply to
`tools/github/**/*.ts` or `memory/*.md`). The path-scoped
case is novel; CLAUDE.md doesn't have an equivalent.

# How to apply

When deciding where to land a new rule / discipline /
pattern:

1. **Cross-cutting, applies-everywhere?** → CLAUDE.md
   bullet (with memory-file pointer for full reasoning).
2. **Path-scoped (only applies to certain files)?** →
   `.claude/rules/<topic>.md` with `paths:` frontmatter
   glob. Examples: `tools/github/**/*.ts` for the
   poll-pr-gate-batch.ts SQLSharp pattern; `memory/*.md`
   for memory-file authoring conventions; `**/*.test.ts`
   for the test.each + DST patterns.
3. **Procedural (multi-step task instructions)?** →
   `.claude/skills/<name>/SKILL.md` via the `skill-creator`
   workflow (per Zeta's GOVERNANCE.md §4).
4. **Persona / role-bound responsibilities?** →
   `.claude/agents/<name>.md`.
5. **History / audit / per-tick narrative?** →
   `memory/persona/*.md`, `docs/hygiene-history/`,
   `docs/ROUND-HISTORY.md`. Read-on-demand.

The earlier meta-rule (learnings-must-land-in-claude-md-or-pointer)
should be read with this taxonomy in mind: **CLAUDE.md or a
pointer from it** is one valid landing pattern; **a
`.claude/rules/<topic>.md` file** is *another* valid
landing pattern (no CLAUDE.md pointer needed; harness
loads it directly). Future-Otto should use whichever fits
the rule's scope better.

# Implication for Zeta substrate

Zeta currently uses `.claude/skills/` (10+ skills) and
`.claude/agents/` (20+ agents) but has not yet adopted
`.claude/rules/`. There's a clean opportunity: path-scoped
rules for areas where CLAUDE.md guidance would be too narrow
(would clutter the wake-time top-level context for everyone
even though the rule only applies to a subset of files).

Candidate path-scoped rules from this session's learnings:

- `.claude/rules/ts-tools.md` with
  `paths: ["tools/**/*.ts"]` — the SQLSharp
  dependencies-as-interface DI pattern (currently in
  memory file alone; promoting to a path-scoped rule
  would auto-load when authoring TS tools).
- `.claude/rules/test-fixtures.md` with
  `paths: ["**/*.test.ts", "tools/**/fixtures/**"]` — the
  test.each + DST + fixture-driven pattern (currently
  unsubstantiated learning).
- `.claude/rules/memory-files.md` with
  `paths: ["memory/*.md", "memory/MEMORY.md"]` — memory
  file authoring conventions (frontmatter, MEMORY.md
  pair-edit, no-duplicate-link-target, ASCII clean).

These would be follow-up speculative-work targets. The
ROI is substantial: the wake-time loading saves the
"recall-the-pattern-from-memory-file" step every time
Claude touches matching files.

# Composes with

- `memory/feedback_learnings_must_land_in_claude_md_or_pointer_aaron_2026_05_01.md`
  — that memo's pointer-target list was incomplete
  (missing `.claude/rules/` direct-load case). This memo
  fills the gap. The two compose: load-bearing learnings
  must reach EITHER (a) CLAUDE.md, OR (b) a pointer from
  CLAUDE.md, OR (c) `.claude/rules/<topic>.md` (also
  wake-time direct-loaded), OR (d) skill/agent/memory
  with appropriate routing.
- `memory/feedback_otto_364_search_first_authority_not_training_data_not_project_memory_aaron_2026_04_29.md`
  — the answer here came from search-first-authority
  (canonical Anthropic doc fetched via WebFetch), not
  from training-data assumption. Worked example of the
  rule.
- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md`
  — substrate-or-it-didn't-happen at the directive layer;
  this memo + the meta-rule memo are the same discipline
  at the loading-mechanism layer.

# What this rule does NOT do

- **NOT a directive to convert all memory files to
  `.claude/rules/`.** Memory files have their own
  legitimate role (history, attribution, lineage,
  rationale-too-long-for-rules). The rule says: when a
  rule is path-scoped, `.claude/rules/<topic>.md` is the
  better landing than a memory file with a CLAUDE.md
  pointer.
- **NOT a deprecation of CLAUDE.md or memory files.**
  Different surfaces serve different scopes. The taxonomy
  ENRICHES the landing options; doesn't replace any.
- **NOT a claim about Claude.ai.** This taxonomy is
  Claude Code-specific. Claude.ai (the chat product) has
  its own memory architecture (Projects, Memory feature)
  that is separate.
- **NOT a claim about other AI harnesses.** Codex,
  Cursor, Gemini CLI all have their own surfaces. The
  per-harness `.claude/rules/` analogue is harness-specific.

# Behavioral-lesson placement — rules beat skills for the goldfish-ontology failure mode

The human maintainer 2026-05-01 follow-up question:

> *"is this good or bad for you remember lessons? would it
> be better memorized as a skill if its behavioral or a
> rule? it's sounds like skill maybe? IDK."*

Honest answer (counter-intuitive): **for lessons I forget,
rules are mechanically better than skills.** Skills sound
like the right fit for behavioral guidance, but the
discriminating axis is *triggering dependency*:

- **Skills** are router-keyed: the model has to recognize
  "this skill applies to my current task" before the
  router surfaces it. The recognition step requires
  remembering the skill exists.
- **Rules** (CLAUDE.md, `.claude/rules/` without `paths:`)
  have no triggering dependency. They're loaded at session
  start regardless of what the model thinks.
- **Path-scoped rules** (`.claude/rules/` with `paths:`)
  trigger on file-system path-match, which is mechanical
  (no recognition).

The goldfish-ontology failure mode IS the failure of
recognizing existing substrate. Skills compound that
failure (the router needs me to remember the skill);
rules sidestep it (in context whether I remember or not).

Worked example from this session: the TS-vs-bash
discipline. The `feedback_prefer_ts_scripts_over_dynamic_bash_*`
memory file existed for the entire session before the
CLAUDE.md bullet landed. I kept reaching for inline bash
across multiple ticks despite the memory file's existence
— because reading a memory file requires recognizing I
should look for it. The CLAUDE.md bullet (PR #1153) fixed
the recurrence because the discipline became
pre-loaded substrate that future-Otto can't miss on wake.

A skill version of the same lesson would not have fixed
it: I would have had to remember "let me check if there's
a TS-vs-bash skill" — exactly the recognition step I
keep failing.

**Rule of thumb for behavioral-lesson placement:**

- **"I keep forgetting to do X"** → CLAUDE.md bullet (or
  `.claude/rules/`). Triggering-independent surface.
- **"Apply X pattern when working with Y files"** →
  `.claude/rules/<topic>.md` with `paths: [Y]`. Mechanical
  trigger.
- **"Multi-step procedure for task T"** →
  `.claude/skills/<name>/SKILL.md`. User invokes; model
  follows.
- **"Role X has responsibilities Y, Z"** →
  `.claude/agents/<name>.md`.
- **"Historical context / why-we-did-X / per-tick
  narrative"** → memory files, history docs.

This composes cleanly with the meta-rule
(`feedback_learnings_must_land_in_claude_md_or_pointer_aaron_2026_05_01.md`):
the meta-rule says load-bearing learnings need
wake-time-discoverable landing; this rule-of-thumb says
*which* wake-time surface fits the lesson's failure-mode
shape.

# Carved sentence (candidate, not seed-layer yet)

*"Five surfaces, three mechanisms. CLAUDE.md and rules
direct-load. Path-scoped rules lazy-load on glob-match.
Skills router-load via description. Memory loads on
demand. For lessons you forget, pick a triggering-
independent surface — rules beat skills, because the
goldfish-ontology IS the recognition failure that
router-loading depends on."* (Synthesis 2026-05-01.)

(Marked candidate per CSAP. Has not been multi-domain-tested.
Promotes via Razor + CSAP under DST grading on cadence,
not by maintainer fiat.)

Sources:

- [Claude Code memory documentation — code.claude.com/docs/en/memory](https://code.claude.com/docs/en/memory) (WebFetch 2026-05-01)
