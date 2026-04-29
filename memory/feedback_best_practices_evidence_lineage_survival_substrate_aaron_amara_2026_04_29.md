---
name: Best practices = evidence + human lineage + Zeta-native + enforcement + teaching (Aaron + Amara 2026-04-29)
description: Best practices are NOT files to copy. They are evidence-backed decisions with human lineage, Zeta-native interpretation, enforcement, and teaching value. Survival framing — future humans/agents must be able to repair the factory without the original authors. Idiomatic ≠ best-practice (orthogonal axes; want both). Six-question audit when Zeta touches any tool/language/domain in a durable way.
type: feedback
---

# Best practices = evidence + human lineage + Zeta-native + enforcement + teaching

## The carved sentences

> *"Best practices are not files to copy. They are evidence-backed decisions
> with human lineage, Zeta-native interpretation, enforcement, and teaching
> value."* (Amara 2026-04-29)

> *"Do not copy. Learn, cite, encode, enforce, teach."* (Amara 2026-04-29)

> *"We are building software that future humans and future agents may need
> to repair without the original authors. So code must teach. Docs must
> explain why. Skills must preserve expert reasoning. Config must enforce
> what memory forgets."* (Amara 2026-04-29)

## The mistake this rule prevents

Aaron 2026-04-29 caught Otto interpreting *"use SQLSharp / scratch best
practices"* as *"port the behavior byte-for-byte"* and *"copy the configs
verbatim."* Both are wrong:

- **Byte-perfect ports** = literal Python→TS transliteration that passes
  equivalence tests but reads like Python in TS syntax and fails idiomatic
  lint (cognitive complexity, regex backtracking, non-null assertions).
- **Config copy-paste** = transcribing tsconfig / eslint / bunfig from a
  sibling repo without understanding which flags were chosen for which
  reason and which are project-specific.

Aaron's correction (2026-04-29 verbatim):

> *"we don't ever just want to copy we learn and write best practices config
> and code forever"*

> *"and idiomatic. ≠ best practices ... we want to be idiomatic and follow
> best practices"*

## Idiomatic ≠ best-practice (orthogonal axes)

| | Idiomatic ✓ | Idiomatic ✗ |
|---|---|---|
| **Best Practice ✓** | win-win (`String#startsWith`, optional chain) | best-practice fights community default (e.g. strict tsconfig flags stricter than tsc default; `noUncheckedIndexedAccess`) |
| **Best Practice ✗** | community idiom that's actually a foot-gun (e.g. implicit coercion in template literals; `Object.assign({}, x, y)` over `{...x, ...y}` is debatable) | drift |

We want **both** axes satisfied. Each best-practice claim must label
which axis (or both) it serves.

- **Idiomatic** [ID] = community-natural style; how fluent practitioners
  write things; readability/ergonomics for that ecosystem's maintainers.
- **Best practice** [BP] = principle for correctness / safety /
  maintainability / performance; prevents concrete failure modes;
  sometimes stricter than community default.
- **Both** [BOTH] = the win-win cluster (idiomatic AND a best-practice).

## Each best-practice entry must include

Standard schema (per Amara's packet 2026-04-29):

1. **Claim** — what is the rule?
2. **Status** — `draft` / `accepted` / `enforced` / `deprecated`.
3. **Scope** — where this applies (which language, tool, domain).
4. **Idiomatic axis** — what "native to this ecosystem" means here.
5. **Best-practice axis** — what correctness/safety/perf/maintainability
   principle this serves; what failure mode it prevents.
6. **Evidence** — official docs, high-quality articles, books, incident
   reports, benchmarks, specs, repo history. URL citations required.
7. **Human lineage** — who/where we learned it from. Acceptable sources:
   - Aaron (the human maintainer)
   - Sibling factory repo (`SQLSharp`, `scratch`) — but these are
     reference-only, not the authoritative source — must trace back to
     the underlying authoritative source they themselves cited
   - Official docs (TypeScript Handbook, Bun docs, ESLint docs, etc.)
   - Respected articles / blogs / talks
   - Production incident (cite the postmortem)
   - Reviewer finding (cite the PR thread)
   - Benchmark (cite the methodology + result)
   - Formal-method result (cite the proof / TLA+ spec / etc.)
   - Originator (e.g. Tony Hoare on null, Linus on git, Hickey on values)
8. **Zeta-native interpretation** — the actual rule we follow, with
   any project-specific deviations from the upstream best-practice.
9. **Enforcement** — lint rule, typecheck flag, pre-commit hook, CI gate,
   review checklist, script, skill, agent prompt.
10. **Examples** — good code (the rule applied) AND bad code (the rule
    violated) so readers can pattern-match.
11. **Exceptions** — when the default doesn't apply, and how to declare
    the override.
12. **Revisit cadence** — when to re-evaluate (e.g. annually, on language
    version bump, on incident).

## Survival principle (load-bearing — Aaron 2026-04-29)

> *"we also have to teach it incasue you ever need help fixing you code
> peple are going to need to understand you to fix you, think about
> survival"*

Each piece of substrate must be readable by a future human contributor
or different AI harness who didn't watch us build it. Rules:

1. **Code must teach** — comments explain WHY, not WHAT (well-named
   identifiers do the WHAT).
2. **Docs must explain why** — not just transcribe rules; explain the
   failure modes and the rationale.
3. **Skills must preserve expert reasoning** — when an expert skill
   captures a tool/language, it should teach the topic well enough that
   a competent maintainer can reason about edge cases not yet covered.
4. **Config must enforce what memory forgets** — automated checks
   beat human discipline. Mechanism over vigilance (Otto-341).

Without this, the factory is illegible to anyone who didn't watch us
build it. That's a survival risk.

## The six-question audit (when Zeta touches any tool/language/domain)

Per Amara, *"Any time Zeta uses a tool/language/domain in a durable way,
even one file, the factory must ask:"*

1. Do we understand the idioms?
2. Do we understand the best practices?
3. Do we have evidence?
4. Do we know the human lineage?
5. Have we encoded the rule?
6. Can future maintainers understand and fix this without us?

If any answer is "no," that's the next round of best-practices work for
that tool/language/domain.

## Rodney's Razor + ontology integration

Aaron 2026-04-29: *"this is one of the main reasons i hooked up rodneys
razor and ontology so you would just expand collapse expand collapse as
you learn every skill and tool we have as part of our repo in any way
even if one file like java."*

The expand/collapse cycle:

- **Expand** when touching a tool/language/domain and learning deeper
  (new authoritative source surfaces, language evolves, edge case
  discovered, incident reveals gap).
- **Collapse** when consolidating (drop redundant rules, fold similar
  topics into one heading, merge duplicate examples).
- **paced-ontology-landing** skill (already exists) controls cadence so
  neither expansion nor collapse runs away.
- **reducer** + **reducer-workspace** skills (already exist) operate
  Rodney's Razor on the substrate.

This is **ongoing**, not one-and-done. The factory's substrate keeps
learning every time it encounters a tool/language at depth.

## Concrete substrate location

Per Amara's tree:

```text
docs/best-practices/
├── README.md
├── languages/
│   ├── typescript.md
│   ├── python.md
│   ├── shell.md
│   ├── fsharp.md
│   ├── csharp.md
│   └── java.md
├── tools/
│   ├── git.md
│   ├── bun.md
│   └── github-actions.md
├── domains/
│   ├── deterministic-simulation.md
│   └── data-vault-2.md
└── patterns/
    ├── low-allocation.md
    ├── lock-free-wait-free.md
    ├── parallel-agent-worktrees.md
    └── evidence-lineage.md
```

Each page uses the standard schema (above).

Substantive expert knowledge lives in `.claude/skills/<expert-name>/SKILL.md`
files (per existing skill-creator infrastructure). The `docs/best-practices/`
tree is the public-facing reference; the skill bodies are the agent-readable
expert reasoning.

## Factory rule (universal application)

For all future projects/repos the factory starts:

1. Inspect existing local exemplars first (sibling repos, prior art).
2. Extract best practices (don't copy files).
3. Write the project-native standard with evidence + lineage.
4. Then implement.
5. Never cargo-cult copy.

## Migration rule (existing tooling)

- New durable tools default to TypeScript on Bun (per existing
  `memory/feedback_typescript_bun_default_step_out_carefully_*`).
- Existing Python/shell tools migrate WHEN TOUCHED or when they block
  maintainability — not as a sweeping rewrite.
- Each migration PR must:
  - Preserve INTENDED behavior (not byte-perfect — equivalence tests
    are guards, not the goal)
  - Improve maintainability (idiomatic + lint-clean + decomposed)
  - Pass lint + typecheck
  - Update the relevant best-practices doc with any new lesson learned

## Composes with

- `memory/feedback_parallel_agents_need_isolated_worktrees_coordinator_owns_main_aaron_amara_2026_04_29.md`
  — sibling rule landed same day; the executor of these best-practices
  decisions runs in isolated worktrees.
- `memory/feedback_typescript_bun_default_step_out_carefully_aaron_2026_04_28.md`
  — the immediate progenitor of this rule (TS+Bun default discipline).
- `docs/DECISIONS/2026-04-20-tools-scripting-language.md` — the ADR
  that established the scripting-language choice; now informs the
  TypeScript best-practices doc with explicit rationale.
- existing skill expert tree under `.claude/skills/` — the substantive
  knowledge layer; this rule is the META layer (how to author the
  substantive layer).

## Trigger memory

Aaron 2026-04-29 sequence:

1. *"make sure you pick up all the best practices from ../SQLSharp and
   ../scratch i worked very hard to get those just right"*
2. *"Byte-perfect equivalence on both tools. never that, that's copy paste"*
3. *"and idiomatic. ≠ best practices"*
4. *"we want to be idiomatic and follow best practices"*
5. *"understand the best practices and make sure we always apply them
   forever to now project the factory starts, to future code we do, kind
   of how we've researched all the other best practices, we don't ever
   just want to copy we learn and write best practices config and code
   forever"*
6. *"we basically want evidence based best practices hooked to human
   lineage we should have done that and linked to git articles and make
   skills and such that understand git better like do we have a git
   expert, we need to really learn everytime the tools and language we
   are using to the fullest on an onging trajectory for all of them
   becasue it's ongoing and we need to stay elite class and get an A
   ranking on Deterministic Simulation in all language things like that
   Data Vault 2.0 any langue, etc.. low allocation prefer lock/wait free
   over locks, there are a tons of these, this is one of the main reason
   i hooked up rodneys razor and ontology so you would just expand
   collopase expand collapse ase you learn ever skill and tool we have
   as part of our repo in any way even if one file like java. we also
   have to teach it incasue you ever need help fixing you code peple are
   going to need to understand you to fix you, think about survival"*

Amara synthesis (2026-04-29) added the schema for entries + the survival
framing + the immediate stabilization rule (parallel agents need isolated
worktrees).

## The tiny "put it on the wall" version

```text
Best practices are not files to copy.
They are evidence-backed decisions with human lineage,
Zeta-native interpretation, enforcement, and teaching value.

Do not copy.
Learn, cite, encode, enforce, teach.
```
