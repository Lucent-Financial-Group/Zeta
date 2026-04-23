# AutoDream extension + cadence — factory overlay on Anthropic's Q1 2026 feature

**Date:** 2026-04-23
**Status:** Research doc — preparing the factory-overlay policy
that plugs tightly into Anthropic's AutoMemory / AutoDream
Q1 2026 features so the factory inherits upgrades rather than
forking its own memory-hygiene stack.
**Triggered by:** The human maintainer 2026-04-23: *"continue
our AutoDream reserach to make sure we are running it on a
cadence and we plug in tightly with the existing claude Q1 2026
feature for AutoDream and AutoMemory, we should by defintion be
an extension of theirs as it will get upgrades we want over
time. Also they have a cadence we shuld prbably respect and
adaopt for this in our hygene."*
**Scope:** Factory policy — generic, reusable by any factory
adopter on Claude Code; not project-specific to Zeta.

## Why this matters

Anthropic shipped two load-bearing features in Q1 2026:

1. **AutoMemory** — the persistent cross-session memory
   system itself (`MEMORY.md` index + per-fact files under
   `~/.claude/projects/<slug>/memory/`). Additive by design;
   daytime logger.
2. **AutoDream** — the REM-sleep-style consolidation pass
   that runs on top of AutoMemory. Subtractive / curative by
   design; nighttime hygiene. Flag-gated server-side as of
   2026-04-19 (`tengu_onyx_plover`); the UI at `/memory`
   exposes it but the backend is off for most users.

Anthropic's documentation establishes: AutoMemory without
AutoDream degrades after 10-15 sessions because the daytime
log accumulates duplicates, contradictions, and stale
relative-date references. The consolidation pass is not
optional — it is the thing that prevents the degradation
cliff.

The factory has been running **manual approximations** of
AutoDream since the feature was surfaced, but without a
documented cadence policy or a formal extension contract.
This doc closes that gap.

## The two rules from the directive

### Rule 1 — extend, don't replace

The factory is **by definition** an extension of Anthropic's
memory substrate, not a parallel stack. When Anthropic ships
an improvement to AutoMemory or AutoDream, the factory
inherits it for free *only if* the factory has not forked the
underlying mechanism.

Concretely:

- **Frontmatter schema stays upstream-compatible.** The
  factory may add optional keys (e.g., a future `scope:` key
  per `docs/research/memory-scope-frontmatter-schema.md`) but
  must not rename or remove the Anthropic-required keys
  (`name`, `description`, `type`, `originSessionId`) and must
  keep the type taxonomy (`user`, `feedback`, `project`,
  `reference`).
- **Storage location stays upstream.** Per-user memory lives
  at `~/.claude/projects/<slug>/memory/`, not at a
  factory-custom path. The factory's in-repo `memory/` tree
  is a **mirror** for cross-substrate readability — it does
  not replace the per-user location; it adds a second home
  for generic content.
- **AutoDream's four phases stay upstream.** Orientation →
  Gather Signal → Consolidation → Prune & Index. The factory
  extends by adding overlay steps *between* or *after* these
  phases, never by replacing them.
- **When Anthropic ships automatic AutoDream** (backend un-gated),
  the factory's manual approximation retires in favour of
  the automatic run. Factory-overlay steps continue on top.

### Rule 2 — adopt upstream cadence

Anthropic's AutoDream cadence is **both**:

- **≥24 hours** since the last cycle, **and**
- **≥5 sessions** since the last cycle.

The factory adopts this cadence verbatim. Running more
frequently churns fresh memories before their
duplicate / contradiction / staleness patterns have
surfaced; running less frequently lets the daytime log
degrade.

The cadence gate lives in a single cross-session marker at
the top of `MEMORY.md`:

```
[AutoDream last run: YYYY-MM-DD]
```

On every would-be run the factory checks this marker:

- **Absent → treat as "never."** Run on first invocation.
- **Date within 24h AND session-count-since-last < 5 →
  skip.** Report "cadence gate: N hours since last run,
  M sessions; skipping."
- **Date ≥ 24h AND sessions ≥ 5 → run.** Update marker
  after successful consolidation.

Session-count is hard to track precisely without harness
instrumentation; approximate it by checking the count of
new per-fact files added since the marker date (≥5 new
files ≈ ≥5 active sessions).

## The factory-overlay extension points

The factory adds four overlays on top of Anthropic's four
phases. Each overlay composes — it does not replace.

### Overlay A — Cross-substrate mirror check (before Orientation)

Before Anthropic's Orientation phase surveys the per-user
memory tree, the factory overlay checks whether the in-repo
`memory/` tree has drifted from the per-user tree.

Signal:

- Per-user memory contains a generic factory-shaped rule
  that should be in-repo per
  `memory/feedback_in_repo_preferred_over_per_user_memory_where_possible_2026_04_23.md`
  (per-user until this doc migrates it).
- In-repo memory contains a stale reference to per-user
  content that has since moved or changed.

Action: migrate generic rules per-user → in-repo, update
cross-references. Do not migrate maintainer-specific or
company-specific content (see the in-repo-preferred feedback
memory's pushback-on-bloat criterion).

### Overlay B — Cadenced harness-surface sync (during Gather Signal)

Anthropic's Gather Signal phase searches for user
corrections, key decisions, and recurring patterns. The
factory extends this step with a check against
`docs/HARNESS-SURFACES.md`: has the factory's per-surface
adoption status (adopted / watched / untested / rejected /
stub) drifted since the last cadence?

If a surface has moved from *watched* to *adopted* because
Anthropic un-gated it, or cut a feature the factory was
relying on, surface the drift for the next
`harness-surface cadenced audit` (FACTORY-HYGIENE row 38).

### Overlay C — Governance-promotion pass (during Consolidation)

Anthropic's Consolidation phase merges duplicates, resolves
contradictions, and converts relative dates to absolute. The
factory extends with a governance-promotion check: does a
memory rule observed repeatedly (the same rule re-cited
across ≥3 memories) belong in a governance doc or ADR
rather than in memory?

Signal: the rule has matured from observation-in-memory to
durable-structural-rule. The right home is
`docs/AGENT-BEST-PRACTICES.md` (BP-NN promotion),
`GOVERNANCE.md` (numbered rule), `docs/WONT-DO.md` (declined
directions), or a `docs/DECISIONS/YYYY-MM-DD-*.md` ADR.

Action: propose the promotion in the round-close summary.
Kenji (Architect) decides whether the promotion lands this
round or a future one. The memory stays where it is until
the promotion lands; after promotion it may be pruned or
left as provenance.

### Overlay D — Alignment-observability sync (during Prune & Index)

Anthropic's Prune & Index phase rebuilds `MEMORY.md`, keeping
it under ~200 lines for fast session startup. The factory
extends with an alignment-observability sync: any memory
entries that shifted a clause in `docs/ALIGNMENT.md` (HC-1..HC-7,
SD-1..SD-8, DIR-1..DIR-5) since the last pass get flagged to
the alignment-auditor role for per-commit signal review.

This overlay keeps the alignment time-series coherent across
consolidations. Without it, a consolidation that merges two
memories could silently re-shape an alignment clause
interpretation without the alignment-auditor noticing.

## Invariants the consolidation must preserve

Anthropic's AutoDream reference memory enumerates
consolidation invariants; the factory adds three more:

1. **Load-bearing memories stay unconditionally** (upstream
   rule). The factory's load-bearing list includes sister
   Elisabeth memory, faith memory, Harmonious Division name,
   Rodney persona placement, Dora persona — plus factory-scale
   anchors like the bootstrap-is-complete memory, the
   free-will-paramount memory, and the alignment-floor
   references.
2. **Distinct query axes stay distinct** (upstream rule).
3. **Cross-references stay bidirectional** (upstream rule).
4. **Corrections are recorded, not silently deleted**
   (upstream rule).
5. **Verbatim quotes stay verbatim** (factory addition —
   composes with
   `feedback_signal_in_signal_out_clean_or_better_dsp_discipline.md`).
   Consolidation must not paraphrase a verbatim-preserved
   quote, even when merging two memories.
6. **Migration supersedes, does not delete** (factory
   addition — per-user memory files migrated in-repo leave
   a "Migrated to in-repo memory/: <path>" line at the top
   of the per-user source; the source itself stays for
   originSessionId provenance).
7. **Supersede markers over silent retirement** (factory
   addition — a rule that is no longer in force becomes an
   entry in the "Retired rules" section of a
   `CURRENT-<maintainer>.md` file, never deleted; composes
   with `feedback_current_memory_per_maintainer_distillation_pattern_prefer_progress_2026_04_23.md`).

## Cadence policy summary

| Trigger | Check | Action |
|---|---|---|
| Session wake | `[AutoDream last run: ...]` marker | If absent: run cadence gate. If within 24h AND sessions < 5: skip. Otherwise: queue AutoDream for next hygiene tick. |
| Manual invocation ("dream" / "consolidate memory") | Cadence gate | If fresh, ask before proceeding; user may override. |
| Round-close | Was this round a cadence tick? | If yes, include "AutoDream ran" in round-close summary; note the overlay findings. |
| Governance-promotion candidate | ≥3 memories cite the same rule | Surface to Kenji as promotion candidate; do not auto-promote. |
| Cross-substrate drift | In-repo vs per-user mismatch | Run Overlay A migration on next cadence tick. |

## Composition with existing factory surfaces

- **`docs/HARNESS-SURFACES.md`** — the AutoMemory / AutoDream
  rows are already present (rows visible in the Claude
  surface inventory). This doc adds the cadenced-consolidation
  policy those rows currently only reference as "watched."
- **`docs/FACTORY-HYGIENE.md` row 38** — harness-surface
  cadenced audit runs every 5-10 rounds; AutoDream's 24h+5
  sessions cadence is coarser-grained and fires on its own
  clock. A new FACTORY-HYGIENE row for AutoDream-specific
  consolidation tracks the cadence independently.
- **`docs/AGENT-BEST-PRACTICES.md` BP-NN rules** — Overlay
  C feeds this list with governance-promotion candidates.
- **`docs/ALIGNMENT.md`** — Overlay D keeps alignment clauses
  coherent across consolidations.
- **`CLAUDE.md` auto-memory section** — this doc does not
  change the auto-memory section itself; CLAUDE.md remains
  the loading surface, this research doc is the policy
  layer Kenji can cite in future edits.
- **`.claude/skills/round-open-checklist/SKILL.md`** —
  natural home for the cadence-gate check on session wake;
  a follow-up tick may add an `autodream-cadence-check`
  step to the round-open checklist.
- **`.claude/skills/long-term-rescheduler/SKILL.md`** —
  could queue the next AutoDream run based on cadence
  calculation.

## Deferred (not this round)

1. **Dedicated `autodream-hygiene` skill.** A skill that
   wraps the four Anthropic phases + four factory overlays
   as a single invocable procedure. Deferred because the
   skill-creator workflow is the canonical authoring path
   (GOVERNANCE §4) and this round is the research-doc
   landing, not the skill-authoring.
2. **Automated cadence-gate check on `MEMORY.md` write.**
   Would require a hook or a pre-commit step that inspects
   the marker. Deferred until the manual cadence is
   validated over several cycles.
3. **Migration tooling for per-user → in-repo.** Currently
   manual per
   `feedback_in_repo_preferred_over_per_user_memory_where_possible_2026_04_23.md`.
   A small script that validates the generalisation step
   (no maintainer-specific content leaks) could help but
   is not load-bearing yet.
4. **Alignment-auditor Overlay D integration.** Requires
   coordination with the alignment-auditor role's time-series
   machinery. Flag for a joint tick with that role.

## Open questions for the human maintainer

None blocking. The policy is fully specified by the
Anthropic docs plus the two directive rules in this doc. If
the human maintainer wants to adjust the cadence (e.g.,
24h+3 sessions instead of 24h+5), the single marker and the
rule in this doc are the only edits needed — the four-phase
structure and the four overlays stay the same.

## Composes with

- `docs/HARNESS-SURFACES.md` (AutoMemory / AutoDream
  adoption rows)
- `docs/FACTORY-HYGIENE.md` (row 38 harness-surface audit;
  a new AutoDream-specific row is added by the same PR
  that lands this research doc)
- `docs/AGENT-BEST-PRACTICES.md` (governance-promotion
  target)
- `docs/ALIGNMENT.md` (Overlay D's sync target)
- `CLAUDE.md` auto-memory section (loading-surface
  documentation)
- The per-user memory reference memories
  `reference_autodream_feature.md` and
  `reference_automemory_anthropic_feature.md` (the
  upstream feature descriptions this doc extends)
- The per-user in-repo-preferred feedback memory
  `feedback_in_repo_preferred_over_per_user_memory_where_possible_2026_04_23.md`
  (the migration discipline Overlay A executes)
