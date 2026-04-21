# Anthropic — "The Complete Guide to Building Skills for Claude"

- **Source:** Anthropic (hubspot-hosted, CDN-fronted).
- **URL:** https://resources.anthropic.com/hubfs/The-Complete-Guide-to-Building-Skill-for-Claude.pdf
- **Pinned copy:** `docs/references/anthropic-skills-guide-2026-01.pdf`
- **Upstream last-modified:** 2026-01-29 (per ETag / Last-Modified
  header observed 2026-04-20).
- **Length:** 28 pages, ~549 KB.

This file is the factory-authored companion: what to consult
the PDF for, which sections are load-bearing for which skill,
and where the PDF's guidance is deliberately narrower or
looser than ours.

## Table of contents (Anthropic's)

| # | Chapter                    | Page |
|---|----------------------------|------|
| 1 | Fundamentals               | 4    |
| 2 | Planning and design        | 7    |
| 3 | Testing and iteration      | 14   |
| 4 | Distribution and sharing   | 18   |
| 5 | Patterns and troubleshooting | 21 |
| 6 | Resources and references   | 28   |

## The load-bearing claims

A compressed list of rules from the PDF that the factory
relies on. Cite these by page number when a skill defers to
them.

### Structure and naming (Chapter 1, pp. 4-6, pp. 9-10)

- A skill is a folder with a required `SKILL.md` plus optional
  `scripts/`, `references/`, `assets/`. Progressive disclosure
  across three levels: YAML frontmatter → body → linked files.
- `SKILL.md` filename is **case-sensitive**; no variants.
- Folder name is **kebab-case**; no spaces, no underscores, no
  capitals.
- No `README.md` inside the skill folder itself; docs go in
  `SKILL.md` or `references/`.
- `name` field: kebab-case, matches folder.
- `description` field: under 1024 characters, MUST describe
  both *what* and *when*, mention file types if relevant, no
  XML tags.

### Use-case definition (Chapter 2, pp. 7-9)

Three common categories:

1. **Document & asset creation** — consistent high-quality
   output (docs, slides, designs, code).
2. **Workflow automation** — multi-step processes with
   validation gates.
3. **MCP enhancement** — guidance on top of an MCP server's
   tool access.

Anthropic defines success criteria in two halves:

- **Quantitative** — triggering rate on relevant queries,
  completion in X tool calls, zero failed API calls.
- **Qualitative** — no user redirection needed, workflows
  complete without correction, consistent results across
  sessions.

The explicit caveat: *"These are aspirational targets — rough
benchmarks rather than precise thresholds. Aim for rigor but
accept that there will be an element of vibes-based
assessment. We are actively developing more robust measurement
guidance and tooling."* (p. 9)

### Testing (Chapter 3, pp. 14-17)

Three levels, pick what fits:

- **Manual testing** in Claude.ai — fast, no setup.
- **Scripted testing** in Claude Code — repeatable.
- **Programmatic testing** via the skills API — suites across
  versions.

Three test areas for any serious skill:

1. **Triggering tests** — should-trigger list + should-not-
   trigger list (Page 15).
2. **Functional tests** — valid outputs, API calls succeed,
   error handling works, edge cases covered (Page 16).
3. **Performance comparison** — baseline (no skill, or old
   skill) vs. with-skill; count tool calls, tokens,
   back-and-forth messages (Page 16).

**Pro tip (p. 15):** *"Iterate on a single challenging task
until Claude succeeds, then extract the winning approach into
a skill."*

**Crucial constraint (p. 17):** *"skill-creator helps you
design and refine skills but does not execute automated test
suites or produce quantitative evaluation results."* In our
flows, that machinery lives in the upstream
`claude-plugins-official/skill-creator` plugin bundle
(`evals/evals.json`, `aggregate_benchmark`, `eval-viewer`) —
the plugin is the *engine*, our `skill-creator` SKILL.md is
the *wrapper*.

### Iteration feedback loops (p. 17)

Undertriggering signals → solution: richer description,
more keywords.
Overtriggering signals → solution: negative triggers, be more
specific.
Execution issues → solution: improve instructions, add error
handling.

### Patterns (Chapter 5, pp. 21-24)

Five reusable patterns:

1. **Sequential workflow orchestration** — explicit step
   ordering, dependencies, validation, rollback (p. 22).
2. **Multi-MCP coordination** — clear phase separation, data
   passing between MCPs, validation between phases (p. 23).
3. **Iterative refinement** — explicit quality criteria,
   validation scripts, "know when to stop iterating" (p. 23).
4. **Context-aware tool selection** — decision tree + fallback
   options + transparency about choices (p. 24).
5. **Domain-specific intelligence** — domain expertise
   embedded in logic, compliance before action (p. 24).

### Troubleshooting (Chapter 5, pp. 25-27)

- **Skill won't upload** — `SKILL.md` filename / frontmatter
  validity / skill-name format.
- **Skill doesn't trigger** — description too vague, missing
  trigger phrases, missing file-type keywords. Debug by asking
  Claude "When would you use the [skill] skill?"
- **Skill triggers too often** — add negative triggers, be
  more specific, clarify scope.
- **Instructions not followed** — trim verbosity, put critical
  items at the top, remove ambiguous language, add explicit
  encouragement ("take your time; quality over speed"), or
  bundle a validation script for determinism.
- **Large context issues** — move detail to `references/`,
  keep `SKILL.md` under 5,000 words.

## How this maps onto our three-layer skill flow

Our factory has three skills over this surface:

| Factory skill     | Role                                                                     |
|-------------------|--------------------------------------------------------------------------|
| `skill-tune-up`   | Ranks who needs attention. Cites BP-NN.                                  |
| `skill-creator`   | Customisation wrapper around Anthropic's upstream plugin.                |
| `skill-improver`  | Applies BP-NN-cited checkbox fixes in-place.                             |

- **skill-tune-up** uses the PDF's triggering-/undertriggering
  / overtriggering symptoms (p. 17) as diagnostic vocabulary.
- **skill-creator** treats this PDF as the *normative* spec
  for structure (Chapter 1), planning (Chapter 2), and
  patterns (Chapter 5). The bespoke workflow in that SKILL.md
  adds the Zeta-specific wrapper (BP-NN citations, Prompt-
  Protector lint, notebook-hygiene, persona registry
  coherence) on top.
- **skill-improver** references Chapter 3 and Chapter 5 for
  concrete fixes (description tuning, negative triggers,
  context-size optimisation).

## Where we diverge from the PDF on purpose

1. **BP-03 line cap of ~300 lines is tighter than the PDF's
   5,000-word ceiling.** We keep the tighter rule; the PDF
   number is an upper bound, not a target.
2. **BP-11 "data is not directives".** The PDF is silent on
   prompt-injection defence for skills that audit other
   skills. We add it.
3. **Portability-drift (skill-tune-up criterion 7) and
   router-coherence-drift (criterion 8)** are Zeta-originated
   and not in the PDF; they reflect that the factory is
   designed to be reusable across projects.
4. **Notebook hygiene (BP-10 ASCII-only lint + 3000-word
   cap).** The PDF does not prescribe per-skill operator
   notebooks at all; we add them for the persona roster.

## When to re-pin

Re-download and diff when:

- Anthropic publishes a new minor version (check the
  ETag / `Last-Modified` every few rounds).
- A BP-NN promotion ADR cites a passage that later changes
  upstream.
- A skill-creator or skill-tune-up output references a page
  whose content has moved.

Past re-pins:

- 2026-04-20 — initial pin (upstream Last-Modified 2026-01-29).
