# Vision → Research → Crystallize → Backlog — Convergent Feedback Loop

**Status:** research spike, round 44. Source directives are
Aaron 2026-04-21 verbatim (see "Source quotes" below).
Proposes a three-skill feedback loop, a swim-lane reorganization
for `docs/BACKLOG.md`, and a new factory invariant:
**forward-progress-guarantee per lane, each round**.

> **Nomenclature correction (2026-04-22, Aaron):** this document
> initially framed the flow as a "pipeline" — a one-way stream.
> Aaron's subsequent directive reframed it as a **convergent
> feedback loop with residue**. *"cryalitize should also update
> the original vision it was based on and add to the backlog,
> its like a loop with resdiue each time lol or whatever, the
> backlog and factory uptates that comes out of this will also
> speed up the whole proces so the next vission crystalize
> process is even faster, you should notice this converging over
> time to a very clar and precice vision and roadmap, you have
> become the cartographer"*.
>
> The correction is structural, not cosmetic. See "Feedback-loop
> reframe (2026-04-22)" section below for the full rewrite of
> the shape.

Companion to:

- `docs/research/kanban-six-sigma-factory-process.md` — the
  Kanban+Six Sigma adoption research that already landed
  WIP-limit hygiene; this doc extends the Kanban line with
  swim-lane organization.
- `docs/research/hygiene-skill-organisation.md` — the
  pull-triggered vs always-on distinction used to classify
  which pipeline steps become skills.

---

## Source quotes (verbatim)

Aaron 2026-04-21 (first message):

> *"backlog kanban fill skill, the vision is DENSE very very
> dense, expand the vsison with research so maybe a resarch
> vision skill to and use that resarh to then fill the backlog
> we probalby need a priortize backlog, i don't really have
> priorties right now, i much try to move each part forward at
> the same time just don't leave anyting not making progess
> over time, we kind of need different lanes i think they
> might call this swim lanes to keep view of the diffeer
> scopes backlog, we probalby also need a like sharpen vision
> that will take vision reserach and make the visoin more
> clear based on the new knowledge, we are building a
> blade!!! our knife is will be the sharpest."*

Aaron 2026-04-21 (clarification two messages later):

> *"maybe crystalize vision?"*

Typos decoded per
`user_typing_style_typos_expected_asterisk_correction.md`:
"vsison / visoin" = vision; "resarch / reserach" = research;
"probalby" = probably; "priortize / priorties" = prioritize /
priorities; "much" = most likely "must try" or "am trying to
much" (I'm trying to most); "anyting" = anything; "progess" =
progress; "differ / diffeer" = different; "crystalize" =
crystallize.

The verbatim "building a blade!!! our knife is will be the
sharpest" is the outer factory metaphor; "crystalize" supplants
"sharpen" for the vision-update step per Aaron's followup.

---

## The blade metaphor — what's actually being described

Full metaphor chain (**blade → forge → crystallize → diamond
→ materia**) and the per-step mapping (vision = edge
geometry; research = whetstone; crystallize = phase change;
backlog-fill = cutting work; diamond = the output artifact;
materia = skill library the diamonds feed) is captured in
`memory/feedback_kanban_factory_metaphor_blade_crystallize_materia_pipeline.md`
plus `memory/feedback_crystallize_everything_lossless_compression_except_memory.md`.

**Why "crystallize" beat "sharpen" as the inner verb:**
phase-change semantics fit "research absorbed → precipitates
as structure" better than iterative edge-abrasion.
Crystallize creates new structure from saturated solution;
sharpen refines an existing edge. The vision-update step is
the former.

---

## The loop

```
┌─────────────────┐
│  VISION.md      │◀──────────────────────────┐
│  (edge geometry)│                           │
└────────┬────────┘                           │
         │                                    │
         ▼                                    │
┌─────────────────────┐                       │
│ research-vision     │ expert skill          │
│ SKILL — goes out    │                       │
│ to papers, upstream │                       │
│ state-of-the-art,   │                       │
│ adjacent fields;    │                       │
│ produces a dated    │                       │
│ research report     │                       │
└────────┬────────────┘                       │
         │                                    │
         ▼                                    │
┌─────────────────────┐                       │
│ docs/research/      │                       │
│ vision-research-    │                       │
│ <topic>-<date>.md   │ dissolved content     │
└────────┬────────────┘                       │
         │                                    │
         ▼                                    │
┌─────────────────────┐                       │
│ crystallize-vision  │ capability skill      │
│ SKILL — precipitates│                       │
│ the research into   │                       │
│ named vision facets │                       │
└────────┬────────────┘                       │
         │                                    │
         ├────────────────────────────────────┘
         │ updates VISION.md (section added,
         │ claim tightened, scope renamed)
         │
         ▼
┌─────────────────────┐
│ backlog-kanban-fill │ capability skill
│ SKILL — files       │
│ actionable rows per │
│ swim lane from the  │
│ crystallized vision │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│ BACKLOG.md          │
│ (swim-lane Kanban,  │
│  forward-progress-  │
│   guarantee rule)   │
└─────────────────────┘
```

## Three skills — shapes

### 1. `research-vision` — expert skill (pull-triggered)

**Trigger:** a named vision surface has drifted, gone silent,
or a fresh external signal landed (paper, upstream release,
adjacent field advance).

**Scope:** the skill takes a **vision scope tag** (see swim
lanes below) and runs a 3-5 query external research sweep
focused on that scope, producing a dated research report
under `docs/research/vision-research-<scope>-<YYYY-MM-DD>.md`.

**Cadence:** event-driven, not calendar. Runs when a
crystallize pass produces an empty delta twice in a row on
the same scope (signal: the vision is already caught up
with current research), OR when a new external signal fires.

**Owner:** `product-visionary` persona when spawned; until
then, Architect (Kenji) with hand-off to the research doc
format already established under `docs/research/**`.

**Inputs:**

- The specific vision scope tag.
- The current `docs/VISION.md` content on that scope.
- External search permission (not restricted to Anthropic
  surfaces; this is outward-facing research).

**Outputs:**

- `docs/research/vision-research-<scope>-<date>.md` —
  literature review, state-of-the-art summary, open
  questions, candidate new vision claims, candidate claim
  tightenings, dissents from the current vision (rare but
  important).

**What this skill does NOT do:**

- Does not edit `docs/VISION.md`. That's
  `crystallize-vision`'s job.
- Does not file BACKLOG rows. That's
  `backlog-kanban-fill`'s job.
- Does not summarise factory-internal work — external
  research only. Internal summaries belong in
  `docs/ROUND-HISTORY.md`.

### 2. `crystallize-vision` — capability skill (pull-triggered)

**Trigger:** one or more
`docs/research/vision-research-*.md` reports exist in
status "uncrystallized" (a frontmatter flag). Alternative:
Aaron verbally calls for a crystallize pass on a specific
scope.

**Scope:** the skill reads the uncrystallized research
report(s) for a given scope, proposes a diff to
`docs/VISION.md` (new section, tightened claim, renamed
scope, retracted claim), and commits the diff only after
passing through:

1. A **self-audit** — does the proposed diff match a claim
   supported by the research? Does it contradict an
   existing vision claim; if so, is the contradiction
   explicit and justified?
2. An **Aaron sign-off gate** for any vision edit classified
   as a direction-shift (vs refinement). Direction-shift
   criteria live in the skill body.

**Cadence:** event-driven; runs when research reports
accumulate past a threshold (proposed: 1 uncrystallized
report per scope is enough — do not let reports accrete).

**Owner:** `product-visionary` when spawned; until then,
Architect (Kenji) with Aaron gate for direction-shifts.

**Inputs:**

- The uncrystallized research report(s).
- Current `docs/VISION.md`.
- Aaron sign-off channel for direction-shifts.

**Outputs:**

- A VISION.md edit (diff committed directly).
- The research report frontmatter flipped from
  "uncrystallized" to "crystallized-YYYY-MM-DD".
- An entry in a new **crystallization ledger**
  (`docs/VISION-CRYSTALLIZATION-LOG.md`?) recording which
  facets crystallized from which research, when, and
  whether Aaron signed off for direction-shifts. Ledger
  design TBD below.

**What this skill does NOT do:**

- Does not do fresh research. It operates on already-landed
  research reports only.
- Does not file BACKLOG rows. Backlog-fill is downstream.
- Does not retract prior VISION.md claims silently. Every
  retraction leaves a trail in the crystallization ledger.

### 3. `backlog-kanban-fill` — capability skill (pull-triggered)

**Trigger:** `docs/VISION.md` has been updated by a
crystallize pass, AND at least one swim lane has zero
in-progress rows OR has not seen a commit in N rounds
(N tuning is BACKLOG-wide policy — proposed N=2).

**Scope:** the skill reads the vision-delta from the
crystallization ledger, identifies which swim lane(s) the
new facet maps to, and drafts candidate BACKLOG rows for
each lane. Rows are always P1 by default (the factory
biases against P0 for freshly-crystallized work — it needs
to prove its priority by surviving one cycle).

**Cadence:** on every crystallize pass; also on every
round-close if the **forward-progress-guarantee** rule
shows any lane stagnant (no commits in the round).

**Owner:** `product-visionary` when spawned; until then,
Architect (Kenji). Cross-check with `next-steps` skill
(they coordinate: `next-steps` picks from BACKLOG, this
skill fills BACKLOG).

**Inputs:**

- The latest crystallization-ledger entry.
- The current `docs/BACKLOG.md` organized by swim lane.
- The forward-progress audit (which lanes are stagnant).

**Outputs:**

- One or more BACKLOG rows per lane, filed newest-first
  under the lane's header.
- A **forward-progress audit note** appended to the
  crystallization ledger entry: which lanes gained rows,
  which lanes were already healthy, which lanes remain
  stagnant even after filling (escalation signal).

**What this skill does NOT do:**

- Does not edit VISION.md. One-direction flow.
- Does not prioritize. P1 default; Aaron or Architect
  escalates to P0 on a separate pass.
- Does not run the cutting work — it fills rows; other
  personas pull them.

---

## Swim-lane structure for `docs/BACKLOG.md`

Aaron's ask: "different lanes … to keep view of the diffeer
scopes backlog". Drawing from `docs/VISION.md` and the
known factory/product surface, the proposed lanes are:

### Lane 1 — `factory/`

The AI-directed software factory kit itself. Skills,
personas, hooks, harness surfaces, agent best practices,
governance, memory schema, cron durability, round hygiene,
alignment observability, evaluation harnesses. This lane's
blade is *the machine that makes blades*.

Examples of existing work this lane absorbs: hygiene rows,
skill-tune-up cadence, BP-NN additions, CLAUDE.md-load
rules, multi-harness integration, AutoMemory/AutoDream
overlays, agent-cadence telemetry, meta-wins log.

### Lane 2 — `seed/` (microkernel)

The Seed microkernel — operator algebra, types, plugin
lifecycle, `ace` dependency manager. Small, conservative,
deepest verification. Public-API changes gated by Ilyana.

Examples: retraction-safe-recursion, operator-algebra spec
evolution, plugin surface design, `PluginOp<'TIn, 'TOut>`,
Cayley-Dickson dimensional-expansion notes affecting the
kernel boundary.

### Lane 3 — `zeta/` (database product)

Zeta-the-DB at the product layer. SQL frontend, LINQ, EF
Core provider, F# DSL, wire-protocol layer, multi-node
consensus, storage substrate, sketches, CRDT layer,
bitemporal/time-travel, Reaqtor-shaped .NET stored
procedures, both event-sourcing + regular-DB modes,
columnar storage, caching layer, first-class event system,
cross-API GraphQL.

Examples: `BloomFilter.fs` Adopt-graduation, SQL PostgreSQL
dialect, EF provider features, multi-node control plane
design, retraction-aware quantile sketches.

### Lane 4 — `research/`

Papers, formal verification (TLA+, Alloy, Lean, Z3, FsCheck),
research reports, conjectures, publication-worthy findings.
This lane is cadence-driven not deadline-driven; its blade
sharpens by *publication*.

Examples: chain-rule proof log, LiquidF# evaluation,
Stainback conjecture work, Witness-Durable Commit protocol,
retraction-aware HyperBitBit, info-theoretic sharder, DBSP
paper-worthy findings.

### Lane 5 — `ecosystem/`

External consumers, plugins, `ace` bootstrap, wire protocol
PostgreSQL/MySQL/Zeta-native, upstream-contribution
workflow, downstream-consumer onboarding, NuGet packaging,
the Reaqtor-shaped niche once it ships, Aurora co-products,
Lucent adjacency.

Examples: NuGet README improvements, consumer-facing
error messages, Aurora pitch readiness, `ace`-as-plugin
bootstrap, upstream-PR queue.

### Lane 6 — `operations/`

Security, SLSA, signing, supply-chain, CVEs, threat model,
SLSA ladder, HSM rotation, reproducible builds, incident
response, CI runner pinning, GitHub Actions policy.

Examples: Nadia threat-model refreshes, Mateo CVE scouting,
Aminata red-team reviews, Nazar incident runbooks, CI
workflow pinning, SLSA graduation steps.

### Lane 7 — `human-channel/`

Items blocked on Aaron or another human: decisions, external
comms, credentials, naming, legal review. Already has a
dedicated artifact (`docs/HUMAN-BACKLOG.md`) so this lane
in BACKLOG.md is a **pointer lane** — no rows live here,
but it preserves the shape symmetry (every lane has a row
slot even if empty).

### Lane count — seven, probably too many

Seven is the upper bound. Aaron can collapse. Likely
collapses:

- **Seed + Zeta** could merge if the kernel/product
  boundary becomes a sub-structure rather than a lane.
  Risk: Seed gets lost inside Zeta discussions.
- **Ecosystem + Operations** could merge into "External".
  Risk: security posture gets diluted with consumer UX.

**Proposed default: six lanes** — merge `human-channel/`
as a pointer only (it has its own file). Re-evaluate after
two crystallize passes; if any lane has stayed empty for
6 rounds, collapse.

### Lane-header format proposal

In `docs/BACKLOG.md`, swim lanes replace the flat
"P0/P1/P2/P3" top-level structure with a two-level
structure — lane first, tier within each lane.

```markdown
# Zeta.Core Unified Backlog

Swim-lane organized. See
`docs/research/crystallization-loop.md` §swim-lanes for
the loop rationale.

## Forward-progress guarantee

Every lane sees at least one commit per round. A lane
with zero commits at round-close is an escalation signal,
not an acceptable state. See "Forward-progress audit"
below.

## Legend (unchanged)

- **P0** = ship-blocker, next round
- **P1** = within 2-3 rounds
- **P2** = research-grade, stars-align
- **P3** = note-taking, explicitly deferred

---

## Lane: `factory/`

### P0 — factory
- [ ] ...

### P1 — factory
- [ ] ...

### P2 — factory
- [ ] ...

### P3 — factory
- [ ] ...

---

## Lane: `seed/`

### P0 — seed
...

---

... (repeat for each lane)
```

---

## Forward-progress guarantee — the invariant

**Rule:** every swim lane sees at least one commit per
round. Zero commits in a lane at round-close is an
escalation signal, logged in `docs/ROUND-HISTORY.md` as a
**stagnant-lane marker**.

**Why:** Aaron 2026-04-21 verbatim: *"don't leave anyting
not making progess over time"*. Parallel-streams beats
priority-ordering because priority-ordering starves the
cold lanes; swim-lane guarantees heat every lane.

**How to apply:**

1. **Round-close sweep** — a new factory-hygiene row
   (candidate row 39) walks `git log` for the round and
   maps commits to lanes via prefix convention (commit
   titles prefixed `factory:`, `seed:`, `zeta:`,
   `research:`, `ecosystem:`, `operations:`) or via
   file-path heuristic (files touched → lane inferred).
2. **Stagnant-lane handling** — a lane with zero commits
   for ≥ 2 rounds consecutive fires a `stagnant-lane-alert`
   log entry AND automatically unlocks a `backlog-kanban-
   fill` pass targeted at that lane, pulling the freshest
   uncrystallized research for the lane as the next BACKLOG
   rows.
3. **Exception handling** — some rounds are legitimately
   narrow (bug-fix rounds, emergency security rounds).
   The round-close narrative can mark lanes "explicitly
   paused this round" with a reason; paused lanes do not
   fire the alert until the pause is lifted.

**Tuning:** N=2 consecutive stagnant rounds as the alert
threshold is a first-guess. Data-driven cadence adjustment
per
`feedback_data_driven_cadence_not_prescribed.md`: instrument,
observe, tune. If stagnant alerts fire too often, widen N.
If lanes quietly rot for months, tighten N.

---

## Interaction with existing factory structures

### With `docs/VISION.md`

Vision is the single source of truth for factory direction;
crystallize-vision is the only skill that writes to it
after this pipeline lands. Ad-hoc edits by Aaron remain
allowed at any time without ceremony (per existing vision
revision-cadence policy).

### With `docs/BACKLOG.md`

Structural reorganization is a **big surgery** — 5957 lines,
many cross-references, years of row-provenance. Proposal:

1. Lands as a **parallel new file** first,
   `docs/BACKLOG-SWIM.md`, populated by the first
   `backlog-kanban-fill` pass only.
2. Existing `docs/BACKLOG.md` rows get migrated to lanes
   incrementally across 3-5 rounds, not in one big-bang.
3. Cut-over when `BACKLOG-SWIM.md` has caught up with
   `BACKLOG.md`; original file deletes with pointer-only
   retention.

This is the "incremental migration" pattern for large docs.
Do not reorganize 5957 lines in one commit.

### With `docs/ROUND-HISTORY.md`

Round-close narrative gains a **swim-lane summary** —
which lanes saw which commits, which lanes were stagnant,
which lanes crystallized new vision facets this round.

### With `docs/WONT-DO.md`

Unchanged. Declined items still live there; the swim-lane
organization doesn't change what's in or out of scope.

### With `docs/HUMAN-BACKLOG.md`

Unchanged. The `human-channel/` lane in BACKLOG.md is a
pointer to this file; items themselves live in
HUMAN-BACKLOG.md because the shape is different (row-IDs,
resolution protocol, multi-user semantics).

### With `next-steps` skill

`next-steps` reads from `BACKLOG.md` today; under swim-lane
organization, `next-steps` reads lane-first then tier-second.
The top-3 in a round-close next-steps should come from 2-3
different lanes by default — monoculture next-steps
indicates priority-ordering has re-asserted itself against
the lane-parallelism rule.

### With `skill-tune-up`

A new criterion: **lane-coverage drift**. If any lane has
zero skills that trigger for it, flag as a skill-gap signal.
Over time, each lane should accrete the skills it needs
(e.g., `seed/` needs operator-algebra / public-API /
formal-verification skills; `zeta/` needs DB-specific;
`research/` needs paper-peer-review / verification-drift;
`factory/` needs agent-QOL / memory-hygiene / hygiene rows).

---

## Crystallization ledger — format proposal

`docs/VISION-CRYSTALLIZATION-LOG.md` is the append-only
record of which research → which vision changes.

| Date | Research source | Scope | Vision facet | Delta type | Aaron sign-off | Follow-up BACKLOG rows |
|---|---|---|---|---|---|---|
| 2026-04-21 | docs/research/vision-research-zeta-wire-proto-2026-04-21.md | zeta/wire-protocol | §Wire-protocol plugins — MySQL-first rationale | refinement | not required (refinement) | zeta/wire-protocol-mysql-first-plugin |

Delta types:

- **refinement** — tightened existing claim, named existing
  scope, added concrete example. No sign-off needed.
- **new facet** — added a new section/claim to VISION.md
  that doesn't contradict existing scope. Sign-off
  required for any cross-scope implication.
- **direction-shift** — retracted a prior claim, renamed
  a scope, changed a load-bearing stance. Sign-off ALWAYS
  required; Aaron gate is mandatory.

Ledger is append-only; retractions of past entries are new
entries referring back.

---

## Practices-not-ceremony check

Memory `feedback_practices_not_ceremony_decision_shape_confirmed.md`
says: reject over-built skills mid-research; 3 artifacts
beats 2 skills. Apply to this pipeline:

- **3 skills vs 3 artifacts:** the three skills each have
  distinct triggers, distinct inputs, distinct outputs, and
  cannot trivially be merged. `research-vision` is outward-
  facing external research; `crystallize-vision` is
  inward-facing document synthesis; `backlog-kanban-fill`
  is action-filing. Each has a different reviewer gate
  (none / Aaron-for-direction-shifts / P-escalation).
  Collapsing them would blur responsibilities and make the
  Aaron-gate hard to apply cleanly.
- **Artifacts needed regardless:**
  `docs/VISION-CRYSTALLIZATION-LOG.md` (ledger),
  `docs/BACKLOG-SWIM.md` (staging migration), revised
  `docs/ROUND-HISTORY.md` round-close narrative, new
  `FACTORY-HYGIENE` row for forward-progress audit.
  Five artifacts.
- **Honest verdict:** this is a 3-skill + 5-artifact
  change. Not over-built — the skills are sparse and
  distinct; the artifacts each pull their weight. The
  practices-not-ceremony check passes.

---

## Risks and open questions

- **Who owns the skills until `product-visionary` is
  spawned?** Architect (Kenji) is the interim owner. But
  Kenji already shoulders architect-bottleneck per
  GOVERNANCE §11. Loading three more cadence skills on
  Kenji is a WIP-overflow risk. Proposed mitigation:
  `product-visionary` spawn rises to P0 once the first
  crystallize pass lands. BACKLOG row already exists;
  this doc bumps its urgency implicitly.
- **Does `backlog-kanban-fill` conflict with
  `skill-gap-finder`?** They look adjacent. Distinction:
  `skill-gap-finder` (Aarav's remit) looks for missing
  skills; `backlog-kanban-fill` generates ANY backlog
  row from crystallized vision, not only skill-gap rows.
  Hand-off contract: `backlog-kanban-fill` files rows in
  the lane's appropriate tier; `skill-gap-finder` reads
  the backlog and audits for missing skill rows as a
  later pass.
- **How do existing P0 rows map to lanes?** Many existing
  P0 rows are cross-lane (OpenSpec coverage backfill
  spans `seed/` and `zeta/`). Staging migration to
  `BACKLOG-SWIM.md` uses a primary-lane + secondary-lane
  convention. If a row primarily advances `zeta/` but
  also lifts `seed/`, file under `zeta/` with a tag
  `(also-lifts: seed/)`.
- **What if `research-vision` runs 3-5 external queries
  on every scope every round?** External-search budget
  matters (API cost, cadence discipline). Mitigation:
  `research-vision` is event-driven, not round-driven. No
  round triggers it automatically; only stagnant-lane
  alerts or explicit Aaron invocation.
- **What if the vision is already "dense enough"?** Aaron
  said the vision is "DENSE very very dense" — suggesting
  it's already information-rich. Crystallize passes may
  produce diffs that REMOVE content (prune, tighten,
  compress) rather than add. Ledger should accept
  negative-delta entries.

---

## Cross-references

- `docs/VISION.md` — the edge geometry being sharpened /
  crystallized.
- `docs/BACKLOG.md` — the current flat backlog; migration
  target.
- `docs/ROUND-HISTORY.md` — round narratives; gains a
  swim-lane summary per round under this proposal.
- `docs/WONT-DO.md` — declined items; unchanged.
- `docs/HUMAN-BACKLOG.md` — human-channel; pointer-lane only.
- `docs/FACTORY-HYGIENE.md` — a new row (candidate 39)
  for the forward-progress audit.
- `docs/research/kanban-six-sigma-factory-process.md` — the
  Kanban+Six Sigma adoption research (sibling).
- `docs/research/hygiene-skill-organisation.md` — the
  pull-triggered vs always-on classification (sibling).
- `docs/research/meta-wins-log.md` — this proposal lands as
  a meta-win row (see "Meta-win classification" below).
- `memory/feedback_kanban_factory_metaphor_blade_crystallize_pipeline.md`
  (new this round) — durable policy capture.
- `next-steps` skill — coordinates with `backlog-kanban-
  fill` on pull-side.

---

## Meta-win classification (prospective)

Trigger: Aaron's directive. Not agent-initiated, so by the
strict definition from
`feedback_never_idle_speculative_work_over_waiting.md`
this is a user-correction not a meta-win. However — same
as the `copilot-split` row — the LATENT consequence is
structural: converts ad-hoc backlog-management into a
directed pipeline with forward-progress-guarantee, bumps
the `product-visionary` role spawn priority, and surfaces
a new factory invariant (per-lane progress). Candidate:
**partial meta-win depth-2** pending the first crystallize
pass landing cleanly in a later round — upgrades to
**clean meta-win depth-3** if:

1. First crystallize pass completes without Aaron
   correction,
2. First `backlog-kanban-fill` produces rows in ≥ 3 lanes,
3. First round-close forward-progress audit shows all
   lanes committed.

Failure mode: if Aaron significantly rewrites the pipeline
shape during implementation, retrospective stays at
partial-meta-win. If the pipeline is dropped entirely,
retrospective becomes **false meta-win**.

---

## Next steps

1. Save durable feedback memory capturing the blade
   metaphor + crystallize verb + forward-progress
   invariant.
2. File three P1 BACKLOG rows (Matrix-mode) for the three
   skills, tagged in the proposed lane structure.
3. Log the meta-win row for this landing.
4. On the next round (or next ScheduleWakeup tick if
   Aaron approves direction), run the first
   `research-vision` pass on the densest VISION.md scope
   — candidate scopes: Seed microkernel, the Reaqtor-
   shaped niche, wire-protocol plugins, multi-node
   consensus (biggest-research-surface by line-count in
   current VISION).
5. First crystallize pass follows. Direction-shifts vs
   refinements surface Aaron gates.
6. First `backlog-kanban-fill` produces actionable
   rows, and the forward-progress audit begins as a
   round-close procedure.

---

## Addendum (2026-04-21) — FF7 Materia reframe

Immediately after this doc landed, Aaron refined the
pipeline through five rapid messages (verbatim):

> *"we are building mataria FF7"*
> *"LFG@@"*
> *"that's the skills really"*
> *"crystalize the vission and use that to forge the
> skills/materia which get upgraded over time by
> experinces"*
> *"We are basically a role playing game now"*

The reframe is **structural, not cosmetic**, and it
does not require new infrastructure. It names
mechanisms the factory already has:

### Mapping

| RPG concept        | Factory surface                              |
|--------------------|----------------------------------------------|
| Materia            | `.claude/skills/<name>/SKILL.md`             |
| Forge              | `skill-creator` workflow                     |
| AP (experience)    | eval-harness runs + runtime invocations      |
| Level-up mechanism | `skill-improver` (Yara) applying BP-NN fixes |
| Status-effect scan | `skill-tune-up` (Aarav) ranker               |
| Party members      | personas under `.claude/agents/`             |
| Classes            | persona roles (reviewer / expert / steward)  |
| Quests             | BACKLOG rows                                 |
| Regions            | swim lanes                                   |
| Chapters           | rounds                                       |
| Battle system      | the eval-harness (`evals/evals.json`)        |
| Whetstone          | research (the crystallize-vision input)      |
| Blade              | Zeta + the factory (the outer artifact)      |

### What changes in the pipeline

The three-skill pipeline already drafted above is
compatible; the materia reframe adds two things:

1. **Crystallize-vision feeds `skill-creator`
   explicitly.** The forge step is *already* the
   `skill-creator` workflow. The crystallize-vision
   output that becomes a `new facet` in VISION.md may
   also become the **source material for a new
   materia**. Record this trace in the crystallization
   ledger so we can later answer "which materia was
   forged from which vision crystallization?".
2. **AP accumulation is observable.** Every eval
   iteration on an existing skill is a level-up
   event. The `skill-tune-up` cadence already runs
   every 5-10 rounds per
   `.claude/skills/skill-tune-up/SKILL.md`; adding a
   terse "AP log" column (count of eval-runs +
   invocation-count) to the existing ranker output
   surfaces which materia are levelling and which are
   dormant.

### What does NOT change

- **No new skills needed** beyond the three already
  proposed (research-vision, crystallize-vision,
  backlog-kanban-fill).
- **No new files needed** beyond the crystallization
  ledger.
- **No new persona needed** — Yara is the materia-
  leveller, Aarav is the status-scanner, the roster
  already covers the roles.
- **No renaming of existing skills** — the materia
  metaphor is overlay vocabulary, not a directory
  restructure. Existing skills are *already* materia;
  they just didn't know it.

### Why the metaphor is load-bearing

Aaron's gaming substrate
(`user_gaming_roots_ff7_dnd_mmorpg_arg_medieval_and_xbl_acehack00.md`)
gives him **native vocabulary for distributed agent
systems**. The FF7 materia system in particular is
a well-matched model: orbs (self-contained capsules)
that slot into equipment (agents), confer abilities
(capabilities), and level up through experience
(usage + evals). The mapping is not metaphor-for-
narrative; it is metaphor-as-compression of the
factory's actual mechanics.

When Aaron says *"We are basically a role playing
game now"*, the factual content is: the factory has
finally matched the cognitive resolution of Aaron's
native model. The RPG framing is how he already
thinks about distributed systems; the factory
previously spoke a different dialect.

### Inner / outer metaphor coexistence

- **Outer:** the blade. The factory is forging a
  weapon. Vision = edge geometry. Research =
  whetstone. Crystallize = temper. Skills =
  cutting surfaces.
- **Inner:** the materia. Inside the forge, each
  skill orb accumulates power through use.
  Eval-runs = AP. `skill-improver` = level-up.

Both frames are true simultaneously. The blade is
**forged from materia**; the materia **level up in
the course of cutting work**.

### Practices-not-ceremony check

Does the materia framing add ceremony? No — it adds
**vocabulary**. The underlying mechanics
(skill-creator, skill-improver, skill-tune-up,
eval-harness) all exist and are active. The
addendum's only concrete new artifact is the
**crystallization ledger** (a single append-only
file), and even that was already proposed in §4.

### Cross-reference for this addendum

- `~/.claude/projects/-Users-acehack-Documents-src-repos-Zeta/memory/feedback_kanban_factory_metaphor_blade_crystallize_materia_pipeline.md`
  — the durable policy memory capturing Aaron's
  verbatim quotes and the full mapping.
- `user_gaming_roots_ff7_dnd_mmorpg_arg_medieval_and_xbl_acehack00.md`
  — the cognitive substrate the metaphor draws from.
- `.claude/skills/skill-creator/SKILL.md` — the
  forge.
- `.claude/skills/skill-improver/SKILL.md` — the
  materia-leveller.
- `.claude/skills/skill-tune-up/SKILL.md` — the
  status-effect scanner.

---

## Feedback-loop reframe (2026-04-22) — "you have become the cartographer"

Aaron's second-round correction is structural:

> *"Write vision→research→crystallize→backlog its more of a
> feedback loop than pipeline cryalitize should also update
> the original vision it was based on and add to the backlog,
> its like a loop with resdiue each time lol or whatever, the
> backlog and factory uptates that comes out of this will also
> speed up the whole proces so the next vission crystalize
> process is even faster, you should notice this converging
> over time to a very clar and precice vision and roadmap,
> you have become the cartographer"*

This overrides the "pipeline" framing above. Three load-
bearing claims in Aaron's message; all three are adopted:

### Claim 1 — it is a loop, not a pipeline

A pipeline is directional; output does not feed back to
input. Aaron is explicit: **the crystallize step writes
back to the vision it was based on.** It is not "research
informs vision"; it is **"research crystallizes into vision
deltas that edit VISION.md in place, and also land BACKLOG
rows, and also propose factory improvements, all from the
same crystallize act."** The output of one turn is the
starting state for the next turn.

Concrete write-back targets per crystallize turn:

1. **`docs/VISION.md` is edited in place.** Not a delta
   report that someone else applies — the crystallize
   step itself makes the edit. Refinement tightens an
   existing facet; new-facet adds a section; direction-
   shift surfaces a `docs/HUMAN-BACKLOG.md` `conflict`
   row for Aaron.
2. **`docs/BACKLOG.md` gets new rows.** Each crystallized
   facet that implies un-worked capability lands a
   BACKLOG row in the matching swim lane.
3. **Factory improvements surface as meta-outputs.** If
   the crystallize turn reveals that the factory lacks
   some primitive needed to express the vision
   (tooling, persona, skill, doc-artifact), that shortfall
   gets filed as a factory-lane BACKLOG row or a
   skill-creator candidate.

### Claim 2 — residue accumulates; the loop converges

Aaron's *"loop with residue each time"* is the key
mechanism. Each pass of the loop does not start clean —
it starts richer than the prior pass. Three residue
channels:

- **Vision residue:** `docs/VISION.md` accumulates
  precision. Dense becomes dense-AND-structured; vague
  facets sharpen; contradictions surface (routed to
  Aaron) and resolve.
- **Backlog residue:** `docs/BACKLOG.md` accumulates
  rows. Rows land, get worked, close. Closed rows
  reduce future research surface for the same facets.
- **Factory residue:** tooling, skills, and doc-artifacts
  accumulate. Next turn's `research-vision` has more
  bootstrap; next turn's `crystallize-vision` has a
  cleaner starting state.

Aaron's *"the backlog and factory uptates that comes out
of this will also speed up the whole proces so the next
vission crystalize process is even faster"* is a
**convergence claim**. The loop is **accelerating**:
each pass makes the next pass faster. Mathematically this
is the convergence condition of a contraction mapping —
if each turn reduces the unsharpened-vision surface by a
bounded fraction, the system converges to a fixed point
(**"very clar and precice vision and roadmap"**).

This is the same algebraic shape as Zeta's retraction-
native semi-naive evaluation: **the residue from one turn
seeds the delta-computation of the next**. VISION.md is
the table; crystallize is the operator; research is the
input delta. The analogy is exact, not metaphorical.

### Claim 3 — the agent is the cartographer

Aaron: *"you have become the cartographer"*. Not a
pipeline operator; a **map-maker**.

A cartographer does four things simultaneously:

1. **Surveys territory.** (`research-vision`)
2. **Draws the map.** (`crystallize-vision` writing
   VISION.md)
3. **Annotates known-unknowns for future expeditions.**
   (`backlog-kanban-fill` writing BACKLOG rows)
4. **Iterates as territory becomes better known.** (the
   loop itself)

A map is never final. It gets more accurate each pass. A
cartographer who claims the map is done has stopped
doing the job. The factory is the cartographer's workshop;
VISION.md is the current best-known map; BACKLOG.md is
the list of unsurveyed regions; the factory surfaces
(skills, personas, tooling) are the surveying equipment.

The "very clar and precice vision and roadmap"
convergence target is the cartographer's stable map —
reached asymptotically, never finished.

### How the three skills change under the loop framing

The skill trio from the pipeline draft stays, but their
specs sharpen:

- **`research-vision`** — unchanged in scope. Surveys a
  designated VISION.md region; produces a research
  report sized for crystallize.
- **`crystallize-vision`** — **substantial spec
  sharpening**:
  - **Now edits `docs/VISION.md` directly** (not a delta
    report). Edits are classified in the output as
    refinement / new-facet / direction-shift per the
    original classification; direction-shifts still gate
    on Aaron sign-off and route through
    `docs/HUMAN-BACKLOG.md`.
  - **Also drafts `docs/BACKLOG.md` rows** for un-worked
    capabilities implied by the crystallization.
    (Previously this was `backlog-kanban-fill`'s
    exclusive domain; now crystallize participates.)
  - **Also emits factory-improvement candidates** —
    skill-creator candidates, doc-artifact gaps,
    tooling gaps.
  - Emits a crystallization ledger entry at
    `docs/research/crystallization-ledger.md` linking
    research → vision delta → backlog rows → factory
    candidates (the full residue trace for that turn).
- **`backlog-kanban-fill`** — scope narrows to **gap-
  coverage and swim-lane balancing**. Its primary job
  is no longer "produce rows from vision" (crystallize
  does that); it is "ensure the BACKLOG has coverage
  across all lanes and no lane is starved" and enforce
  the **forward-progress-guarantee**.

### The convergence signal

A loop is converging when each turn's crystallization
**output gets smaller**. Concretely:

- Turn N generates 8 vision edits, 12 backlog rows, 3
  factory candidates.
- Turn N+5 generates 2 vision edits, 3 backlog rows, 0
  factory candidates.

If the output-size curve trends down over time, the
loop is converging — the vision is stabilising. If the
curve trends up or oscillates, the loop is either (a)
still in early-expansion phase (expected for round 44;
the vision is DENSE) or (b) diverging (bad — the
crystallization is introducing new contradictions faster
than resolving old ones; requires Aaron intervention).

Tracking the output-size curve becomes a first-class
factory metric — a candidate row for
`docs/FACTORY-HYGIENE.md` or a field in
`docs/ROUND-HISTORY.md` round-close summaries.

### What this means for the factory's self-understanding

The factory is not building a static vision document; it
is **running a convergent feedback loop whose fixed point
is a precise vision + roadmap**. The agent wearing
cartographer-hat measures progress by **how much the loop
output shrinks turn over turn**, not by how many lines
of VISION.md are written.

This is the **measurement frame** for Aaron's original
directive. *"our knife is will be the sharpest"* — in
convergence terms, the knife gets sharpest when the
sharpening increments get smaller while the edge gets
cleaner. That is asymptotic convergence to a well-
defined blade geometry.

### Relationship to Six Sigma DMAIC

The feedback-loop framing aligns cleanly with DMAIC per
`docs/FACTORY-METHODOLOGIES.md`:

- **Define:** current VISION.md state + known-unknowns.
- **Measure:** crystallize turn output size (the
  convergence metric).
- **Analyze:** `research-vision` surveys the open
  region.
- **Improve:** `crystallize-vision` edits VISION.md,
  fills BACKLOG, proposes factory improvements.
- **Control:** forward-progress-guarantee enforces
  per-lane progress at round-close.

DMAIC is a single-pass methodology; the cartographer-
loop is DMAIC run continuously. Each round closes with
a Control-phase audit that kicks off the next
Define-phase.

### Cross-references added by this reframe

- `user_retractable_teleport_cognition.md` — residue-
  accumulates-seeds-next-delta is the same algebraic
  shape as Zeta's DBSP semi-naive evaluation.
- `project_factory_as_externalisation.md` — the
  cartographer is externalizing Aaron's perception of
  the problem space.
- `docs/FACTORY-METHODOLOGIES.md` — DMAIC mapping.
- `docs/FACTORY-HYGIENE.md` — candidate row for
  convergence-metric tracking (output-size per turn).
