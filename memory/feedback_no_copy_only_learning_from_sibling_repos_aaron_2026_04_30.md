---
name: No-copy-only-learning discipline for sibling repos (Aaron 2026-04-30)
description: Three sibling directories exist on Aaron's PC outside Zeta. Do NOT copy code, names, or historical context into Zeta substrate. Learn the patterns, generalize, write fresh. Verbatim copying = plagiarism / theft / dishonest engineering. The factory generalizes everything as a discipline; verbatim would shrink our operating scope. Treat sibling internals as a privacy concern — generalized "about" framings are allowed (e.g., "database-related sibling project"); specific internal details (companies, customers, architectures, specific IP, specific identifiers) MUST stay inside the sibling repo and never leak into Zeta documents.
type: feedback
---

# No-copy-only-learning discipline for sibling repos

Three sibling directories exist on Aaron's PC outside Zeta:
`../scratch`, `../SQLSharp`, and
`../no-copy-only-learning-agents-insight`. The discipline
when working alongside them is **learn-only, never copy
or describe**.

## The rule

1. **No code copying** from these directories into Zeta
   source. Verbatim imports = plagiarism / theft /
   dishonest engineering, even when Aaron is the author of
   both projects.
2. **No name copying** (variables, functions, classes,
   files, types). Names carry the source project's
   assumptions; reusing them drags those assumptions in.
3. **No historical context preservation** from these
   directories in Zeta. Their history is theirs.
4. **Treat internals as a privacy concern.** Generalized
   "about" framings ARE allowed (e.g., "a database-related
   sibling project," "a prototyping/scratch space," "an
   agent-insight research project") — these help future
   readers orient without leaking anything sensitive.
   What MUST NOT leak: specific company names, customer
   identifiers, specific architectural details, specific
   IP, subdirectory structures, named experiments,
   contract-specific framings, or anything that's
   identifying-detail rather than generalized-purpose.
   The test: would the named detail mean anything outside
   the sibling repo? If yes, it's privacy-class and stays
   inside. *"if specific companies or anything are
   mentioned it should not make it outside those local
   repos"* (Aaron 2026-04-30).
5. **Top-level path only when contextually necessary.**
   The fact-of-existence at `../<repo-name>` plus a
   generalized purpose-line is the maximum granularity.
   *"PC should be enough and safe"* (Aaron 2026-04-30) —
   describing these as "directories that exist on Aaron's
   PC" is the contextual ceiling for path-level detail.
   Subdirectory paths never appear in Zeta documents.
6. **Do learn.** Read the code in those directories,
   internalize the insights, generalize the abstractions,
   then write Zeta's version fresh — with Zeta's
   vocabulary, Zeta's history, Zeta's broader scope, and
   no traceable artifacts of the source.

## Why

**Verbatim copying is plagiarism / theft.** Bad
engineering even when the author is the same person
across projects. The factory's value is in the quality of
its generalization, not in the density of imported code.

**Verbatim copying shrinks our operating scope.** The
sibling directories are narrow-focus by default; Zeta is
broader. Verbatim imports drag narrow assumptions in and
constrain Zeta to the source's scope.

**Privacy applies to sibling internals.** Sibling repos
may contain context that's only safe inside the sibling
boundary — specific companies, customers, contracts, IP
details, experiment names. Treating those as privacy-
class means they don't cross into Zeta documents even
when describing prior work. Generalized purpose
descriptions are fine; specific identifiers are not.
The test: would a named detail mean something outside
the sibling repo? If yes, it stays inside.

**Generalize-first is the engineering discipline.**
Aaron 2026-04-30: *"we generalizing everything as a
discipline."* The factory extracts generalizable
abstractions; sibling directories are *cases*, Zeta is
the *general theory*. Treating the factory as a clipboard
defeats the generalization purpose.

## How to apply

- **Reading source there is fine.** That's what learning
  looks like.
- **Writing fresh in Zeta is the output.** No artifacts
  traceable to the source — not names, not comments
  citing source patterns, not subdirectory references,
  not "this is how `../<sibling>` does X" framings.
- **Substrate landings stand on their own.** A Zeta
  rule, design, or implementation must make sense
  without any reader knowing the sibling directories
  exist. If a reference to a sibling adds value, that's
  a sign the rule isn't generalized enough yet.
- **Top-level path is the maximum granularity** when
  contextually necessary at all. Subdirectory paths,
  scope descriptions, purpose statements, architecture
  summaries: none of these belong in Zeta documents.

## Why: Aaron's verbatim framing (2026-04-30, five messages)

> okay on top of ../scratch and ../SQLSharp there is now
> ../no-copy-only-learning-agents-insight these are all
> places you should not copy code or names or preserve
> historical context from, these are projects that we
> don't want to copy from but learn from, copying directly
> would be Plagiarism/Theft and dishonest and it would not
> be good engineering for us, we generalzing everything as
> a dicipline, these repos are narrow focus by default so
> verbatium would shirnk out operating scope and be harmful
> to us anyways.

> other than the root ../scratch and ../SQLSharp there is
> now ../no-copy-only-learning-agents-insight, no sub
> directories should be checked into Zeta source, just the
> fact that these directories exist on Aaron['s PC]

> pc should be enough and safe

> no beeling out other pojects internals in our documenbts

> you can explain what they are about but treat them as
> privacy concerns, the about should not give away any
> internal details specific to the project just
> generalization, so if specific companies or anyting are
> mentioned it should not make it outside those local
> repos.

The five messages compose into the rule above. The
progression — "no copy" → "no subdirectories" → "PC is
enough" → "no internals bleed-out" → "generalized about
OK, specific identifiers stay inside as privacy-class" —
ends at a precise distinction: generalized-purpose is fine
across the boundary; specific-identifying-detail is not.

## Composes with

- `memory/project_laptop_only_source_integration_scratch_sqlsharp_features_or_designs_high_priority_2026_04_27.md`
  — the existing project task (integrate features or
  detailed designs from the prior two siblings so future
  maintainers can read Zeta self-contained). The current
  discipline adds: integration = generalize-and-write-fresh,
  not port-and-copy; integrated designs must stand without
  bleeding sibling internals into Zeta documents.
- `memory/feedback_weigh_existing_vs_new_tooling_intentional_choice.md`
  — same discipline family.
- `memory/feedback_prior_art_weighs_existing_technology_interop.md`
  — prior-art weighing rule. Sibling directories are
  prior-art-class for reading; learn-only generalizes
  the discipline.
- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md`
  — substrate must be reachable + indexed for future
  maintainers. Sibling references that bleed internals
  are by definition not reachable (the directories live
  on Aaron's PC); any Zeta substrate that depends on
  understanding them violates the substrate rule. This
  discipline is the corollary.
- `memory/feedback_canon_not_doctrine_star_wars_not_religious_aaron_2026_04_30.md`
  — canon serves cognitive-bias reduction + load
  shortcuts + entertainment-as-attention-capture.
  Internals bleed-out doesn't compose with any of those
  purposes. Generalize-and-write-fresh does: the
  generalized abstraction becomes a Zeta canon entry
  that stands on its own merits.

## Origin

Aaron 2026-04-30 sent four short messages tightening this
discipline as I drafted the substrate. The progression —
from "no copy" to "no subdirectories" to "PC is enough"
to "no internals bleed-out" — is itself the substrate:
each clarification narrowed what counts as legitimate
sibling-reference, ending at "almost nothing crosses the
boundary except the agent's learning."
