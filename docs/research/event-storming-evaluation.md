# Event Storming — applicability evaluation for Zeta

**Round:** 44
**Date:** 2026-04-20
**Author:** main-agent Claude (autonomous-loop)
**Status:** research report; recommendations pending Architect sign-off
**Request origin:** Aaron verbatim — "At some point can you do some
reserach on event storming ... First see if it's useful to us on
this porject. if it is, lets retoractifly adapot it to everything
so our project feels like we started with it in the first place."

---

## TL;DR

Event Storming (ES) is a workshop technique for *discovering*
event-driven domains, authored by Alberto Brandolini (≈ 2013,
popularised by his 2019 Leanpub book *Introducing EventStorming*).
It is not a technology, has no runtime artefact, and is not
tied to a programming paradigm. Its primitives are coloured
sticky notes on a wall representing **domain events**,
**commands**, **aggregates**, **policies**, **read models**,
and **bounded contexts**.

**Verdict:** *strong fit*, but with a twist — Zeta is **already
event-sourced by construction**. The DBSP paper's delta semantics
are isomorphic to Event Sourcing's event log; Z-set `+k` / `-k`
entries *are* domain events + retractions; operators *are*
commands; state-carrying operators (`IntegrateOp`, `FeedbackOp`)
*are* aggregates; `Nest` sub-circuits *are* bounded contexts.

What Event Storming gives us that we do not already have:

1. **A shared vocabulary** to talk to people who have not read
   the DBSP paper. ES is DDD-adjacent and is the default
   whiteboarding technique in CQRS / Event-Sourcing shops. If
   Zeta is to be adopted by the DDD / CQRS-ES community, speaking
   ES is a *social* requirement even when the runtime is purer
   than anything ES typically produces.
2. **A discovery protocol** — Big Picture, Process-Level, Software
   Design — that Zeta currently lacks. Zeta has post-hoc specs
   (OpenSpec) but no *domain-discovery* workflow. The factory's
   conversational-bootstrap UX
   (`memory/project_factory_conversational_bootstrap_two_persona_ux.md`)
   is the natural home for an ES variant adapted for single-user
   + factory-agent co-discovery.
3. **A retroactive teaching surface** — ES is known to be useful
   for legacy-system reverse-engineering. For Zeta's own docs
   rewrite ("feels like we started with it in the first place"),
   ES gives us an ordering: events → commands → aggregates →
   bounded contexts → read models.

**Recommendation:** adopt as a *strategy* (per Aaron's Matrix-mode
framing), absorb via an expert / teacher / auditor skill-group,
and retroactively edit `docs/VISION.md`, `docs/ALIGNMENT.md`,
`openspec/specs/operator-algebra/spec.md`, and the conversational-
bootstrap spec to use ES vocabulary where it adds precision.

---

## 1. What Event Storming is — canonical summary

Sources cited below in §4. This section is the synthesis.

### 1.1 Origin + author

- **Author:** Alberto Brandolini, Italian consultant, DDD
  community, early collaborator with Eric Evans, Vaughn Vernon,
  Greg Young.
- **First named:** ≈ 2013 (blog posts). Book-length treatment:
  *Introducing EventStorming* (Leanpub, 2019 — self-published,
  still in continuous revision).
- **License / IP:** book is copyrighted but the technique itself
  is open and has been taught under many licenses. Brandolini
  explicitly encourages adaptation.

### 1.2 The three levels

ES is not one workshop — it is a family of three.

| Level              | Audience                          | Duration | Deliverable                                     |
|--------------------|-----------------------------------|----------|-------------------------------------------------|
| **Big Picture**    | Whole org; business + technical   | 2-4 h    | Shared map of the domain's events over time     |
| **Process-Level**  | Single process team + stakeholder | 1 day    | Process decomposed into commands + policies     |
| **Software Design**| Engineering team                  | 1-3 d    | Aggregates + bounded contexts + read models     |

### 1.3 The sticky-note colour palette

Brandolini's canonical colours. (Any legible colour set works;
these are just widely recognised.)

| Colour        | Primitive           | Semantics                                                           |
|---------------|---------------------|---------------------------------------------------------------------|
| **Orange**    | Domain Event        | Something that happened. Past tense. Immutable. The primary artefact.|
| **Blue**      | Command             | Intent to cause an event. Present tense.                            |
| **Yellow**    | Actor / User        | Who issued the command.                                             |
| **Lilac/Pink**| External System     | Upstream / downstream actor outside our bounded context.            |
| **Pink (dark)**| Aggregate          | State-holder that commands act on and events emerge from.           |
| **Purple**    | Policy              | Reactive rule: "when event X, then command Y."                      |
| **Green**     | Read Model / View   | Projected state a user reads.                                       |
| **Red**       | Hot-spot / Problem  | Question, contradiction, pain-point, assumption to verify.          |

### 1.4 Facilitation practices (2026 best-practice synthesis)

- **Unlimited modelling surface** — whiteboard or Miro/Mural
  board the size of the room. Constraints pollute discovery.
- **Past-tense domain events, always.** "Order was placed,"
  not "place order." The grammar is load-bearing: commands and
  events look identical in bad workshops.
- **Chronological ordering** — left-to-right timeline. Events
  that are concurrent stack vertically.
- **Facilitator-led, not facilitator-driven.** The facilitator
  owns tempo and coverage, not content. Content comes from
  domain experts.
- **Hot-spots are first-class.** When nobody knows the answer,
  a red sticky goes up. The workshop output is allowed to have
  unknowns; it is *better* when it does.
- **Progressive refinement.** Big Picture first; resist drilling
  into implementation until the timeline is complete.
- **Avoid rushing to technical solutions.** A recurring failure
  mode in 2025-2026 coverage: teams jump to CQRS schema design
  before the domain is mapped.

---

## 2. Zeta ↔ Event Storming — primitive mapping

This is where the research pays off. Zeta's DBSP substrate is
isomorphic to event-sourcing-in-the-small; the table below
shows the mapping formally.

| ES primitive        | Zeta primitive                                                                  | Notes                                                                                          |
|---------------------|---------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| Domain Event        | `ZSet<K>` delta entry with weight `+k` (`k > 0`)                                | Past-tense, immutable, append-only within a tick. The canonical ES citizen.                    |
| **Retraction event**| `ZSet<K>` delta entry with weight `-k` (`k > 0`)                                | **Zeta-native extension ES does not name.** A first-class un-event. Ordinary ES has no vocabulary for this; Zeta does. |
| Command             | Operator invocation (`StepAsync`) that produces a delta downstream               | Imperative in conventional ES; in Zeta, commands are the operators themselves.                 |
| Aggregate           | State-carrying operator: `IntegrateOp`, `DelayOp`, `FeedbackOp`                  | The state-holder whose invariants the aggregate enforces.                                      |
| Policy              | Composite operator reacting to an input delta by emitting another delta         | E.g. `circuit.Map(f, s)` producing a new stream is a policy in ES terms.                       |
| Read Model / View   | Integrated stream (`Integrate` at a graph sink)                                  | The "materialised" side; ES calls this a projection.                                           |
| Bounded Context     | `Nest` sub-circuit (inner-clock scope)                                           | Inner-clock tick-0 reset = bounded-context lifecycle boundary.                                 |
| External System     | External input stream registered at the circuit root                             | `ScalarInput<T>.Set` or upstream-fed sources.                                                  |
| Hot-spot (red)      | OpenSpec spec gap, BUGS.md row, harsh-critic finding, `red-flag` tag             | Zeta has many; ES just gives them a single colour.                                             |
| Actor / User        | Agent persona, human maintainer, or external caller                              | Zeta's `docs/EXPERT-REGISTRY.md` is effectively the actor list.                                |
| Workshop artefact   | `openspec/specs/*/spec.md` + `docs/GLOSSARY.md` + `docs/CONFLICT-RESOLUTION.md` | Zeta's post-hoc output already matches the *artefacts* ES produces — we just did not call them that. |

### 2.1 Two places where the mapping is stronger in Zeta than in vanilla ES

1. **Retractions.** Ordinary ES has no first-class retraction
   primitive; deletions are either a compensating event ("Order
   was cancelled") or event-log rewriting (which is a smell).
   Zeta's Z-set `-k` weight is a typed retraction. The ES
   community has proposed "event compensation" patterns; Zeta
   has the algebra.
2. **Inner-clock scopes.** ES's Bounded Context is a social
   boundary (team + ubiquitous language). Zeta's `Nest` sub-
   circuit is the *same idea made executable*: an inner clock,
   a cross-scope reset obligation (Viktor P0-2, just landed),
   and a typed integration boundary. Zeta could contribute this
   back to the ES / DDD community as "executable bounded
   contexts."

### 2.2 One place where ES is stronger than Zeta currently

**Discovery-phase vocabulary.** Zeta's spec + glossary workflow
kicks in *after* a feature exists. Aaron and a factory agent
working on a new capability currently have no *named protocol*
for the Big-Picture → Process → Software-Design transition. ES
gives us that protocol. The conversational-bootstrap UX
(`memory/project_factory_conversational_bootstrap_two_persona_ux.md`)
is the natural host.

---

## 3. Usefulness verdict + retroactive-adoption proposal

### 3.1 Verdict: **adopt as a strategy, not a tool.**

ES has no runtime footprint. Adopting it costs:
- One skill-group authoring pass (expert / teacher / auditor).
- Vocabulary edits across `docs/VISION.md`,
  `docs/ALIGNMENT.md`, `docs/GLOSSARY.md`, and
  `openspec/specs/operator-algebra/spec.md`.
- One session-bootstrap pointer in `AGENTS.md` or `CLAUDE.md`.

And pays:
- Immediate communicability to the DDD / CQRS-ES audience
  (Greg Young, Vaughn Vernon, Alberto Brandolini himself are
  all reachable).
- A named discovery protocol to pair with conversational
  bootstrap.
- A retroactive narrative that strengthens Aurora Network's
  DAO event-sourcing framing (events + consent-primitives =
  governance-grade event log).

### 3.2 Proposed Matrix-mode skill-group

Following
`memory/feedback_new_tech_triggers_skill_gap_closure.md` —
strategies (not just technologies) trigger skill-group
absorption (Aaron's explicit framing from this ask).

| Role                       | Responsibility                                                                                      | Notebook                                  |
|----------------------------|-----------------------------------------------------------------------------------------------------|-------------------------------------------|
| `event-storming-expert`    | Runs or advises on Big-Picture / Process / Software-Design workshops; maps outputs to Zeta primitives. | `memory/persona/<name>/NOTEBOOK.md`       |
| `event-storming-teacher`   | Onboarding explainer: ES vocabulary, colour palette, facilitation patterns, common failure modes. | Shared skill file; no per-round notebook. |
| `event-storming-auditor`   | Reviews specs + glossary for ES-vocabulary misuse (present-tense events, confused aggregates, hidden policies). | `memory/persona/<name>/NOTEBOOK.md`       |
| `event-storming` capability| Procedure-body skill: how to actually run a workshop in this factory's one-human-plus-agents setting. | `.claude/skills/event-storming/SKILL.md`  |

Persona names deferred to the naming-expert per GOVERNANCE.md.

### 3.3 Retroactive adoption plan

Edit in-place (docs-read-as-current-state per GOVERNANCE.md §2):

1. **`docs/GLOSSARY.md`** — add ES primitives with the mapping
   table from §2. Cross-reference existing Zeta terms.
2. **`openspec/specs/operator-algebra/spec.md`** — add an
   "ES vocabulary" aside near the top so downstream specs can
   use "domain event," "aggregate," "bounded context" without
   redefining.
3. **`docs/VISION.md`** — reframe Zeta's positioning to note
   that DBSP is event-sourcing-with-retractions, using ES
   vocabulary.
4. **`docs/ALIGNMENT.md`** — note that the alignment contract
   is itself an event log (consent-primitive instances =
   domain events in a governance bounded context).
5. **`AGENTS.md`** — one-line pointer to the new skill-group
   under "agent personas," so future session bootstraps know
   ES is part of the factory's ubiquitous language.

Nothing is rewritten wholesale. ES vocabulary is additive;
where current prose is precise, it stays.

### 3.4 BACKLOG items

Proposed P1 rows for Round 45 or 46:

- **ES-skill-group-001** — Author `event-storming-expert` /
  `event-storming-teacher` / `event-storming-auditor` personas
  + `event-storming` capability skill via `skill-creator`.
  Effort: M.
- **ES-glossary-001** — Retroactive vocabulary pass on
  `docs/GLOSSARY.md`, `docs/VISION.md`,
  `openspec/specs/operator-algebra/spec.md`,
  `docs/ALIGNMENT.md`. Effort: S.
- **ES-discovery-001** — Extend conversational-bootstrap UX
  design (`memory/project_factory_conversational_bootstrap_two_persona_ux.md`)
  to use ES as the Big-Picture → Process → Software-Design
  protocol. Effort: M.

---

## 4. Sources

Three WebSearch passes run on 2026-04-20, summarised here
(not quoted verbatim; search results are ephemeral).

- **Pass 1 — "Event Storming Alberto Brandolini 2026 best practices":**
  - Brandolini's own site (eventstorming.com) as canonical.
  - Leanpub book *Introducing EventStorming* continuous-revision
    notes through 2024.
  - 2025-2026 practitioner articles emphasising past-tense
    events, hot-spot discipline, facilitator-led-not-driven
    tempo, scope clarification, avoiding premature technical
    solutions.
- **Pass 2 — "Event Storming CQRS event sourcing 2026":**
  - ES + CQRS + Event Sourcing as the canonical trio in DDD-
    adjacent shops.
  - Recommended ordering (event → command → aggregate →
    boundary → view) matches Zeta's natural circuit-build
    order.
  - Materialised views as replay-from-event-store — direct
    parallel to Zeta's `Integrate` at graph sinks.
- **Pass 3 — "Event Storming legacy system retroactive adoption":**
  - Multiple sources endorse retroactive application to legacy
    systems for domain reverse-engineering, bottleneck
    discovery, and cross-team alignment.
  - 2023-2025 case studies (insurance, logistics, banking)
    showing retroactive ES producing refactor roadmaps.
  - Key caveat: retroactive ES surfaces undocumented invariants
    faster than it surfaces missing features — Zeta should
    expect the same (invariant surfacing is actually Zeta's
    home turf per `project_composite_invariants_single_source_of_truth_across_layers.md`).

Detailed raw-result archival is intentionally skipped — search
results decay; the synthesis above is the durable artefact.

---

## 5. Open questions / hot-spots (red stickies, in ES spirit)

- Does ES-expert belong in `docs/EXPERT-REGISTRY.md` with
  scope "strategy" rather than a technology? Per
  `memory/feedback_new_tech_triggers_skill_gap_closure.md`
  this is the first *strategy* absorption — schema generalisation
  pending.
- Can we contribute "executable bounded contexts" back to
  Brandolini's community, or does that require a paper first?
- Does the retraction-event primitive need a new ES colour?
  ("Un-event" — inverted-orange? Dark-orange?) Community
  decision — defer.
- Should the factory's own event log (`docs/ROUND-HISTORY.md`)
  be retroactively re-framed as an ES Big-Picture output?

---

## 6. Meta-note

This research task itself is a candidate meta-win if it
results in the Matrix-mode memory generalising from
"technology triggers skill-group absorption" to
"technology OR strategy triggers skill-group absorption."
That generalisation is the structural factory delta; the
skill-group authoring would otherwise have been speculative
work next round.

If the generalisation lands, log row candidate:

- Speculative surface: Event Storming skill-group authoring.
- Structural fix: generalise Matrix-mode to strategies.
- Depth: 2 — the generalisation *itself* predicts that future
  strategy absorptions (e.g. Wardley mapping, Domain Storytelling,
  OKRs-as-strategy) will follow the same pattern, converting
  them to directed work in turn.
- Next-round effect: every strategy adoption from this point
  forward is a directed skill-group authoring task, not a
  freeform reinvention.
- Retrospective: TBD at Architect review.
