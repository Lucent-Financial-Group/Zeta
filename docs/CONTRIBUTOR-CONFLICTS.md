# Contributor conflicts log

Durable log of differences of opinion / external requirement
between contributors (human maintainers + external AI
maintainers + factory-internal personas + external human
contributors once they arrive). Captures both the conflict
and its resolution over time so future decisions inherit
the resolved state rather than re-litigating it.

Per the human maintainer 2026-04-23: *"we should likely
keep a contribute conflits file somewhere so you can keep
a logs in the differences of options or external requirments
from contributors includeing external ai not just human,
this will help with bottlenecks in the hummans and ais
thinking by resolving conflicts over time. These are all
also things that can be expoed in the eventually, i'll keep
a check now manually just like i do on current memories."*

## What belongs in this log

### In scope

- **Differences of opinion between named contributors** on
  a specific question (architectural decision, scope
  boundary, naming, priority, tech choice, etc.).
- **External requirements** a contributor raises that
  differ from the factory's default posture (e.g., a human
  adopter requires something Zeta doesn't yet do).
- **Cross-agent disagreements** that couldn't be resolved
  at the individual conversation level (examples:
  Amara-vs-Kenji on Aurora priority ordering; Codex-vs-
  Claude on a specific code review finding; a human
  contributor-vs-agent on scope-of-change).

### Out of scope

- **Same-contributor evolution** over time — when Aaron
  later overrides his own earlier directive, that's the
  later-takes-precedence rule (`CURRENT-aaron.md` +
  per-user memory supersede markers). Not a conflict.
- **Reviewer findings on PRs** — those are
  per-PR-review-thread substrate (auto-resolved via
  `required_conversation_resolution: true` + the
  reply-or-fix pattern). Only escalate here if the
  finding opens a durable contributor-level disagreement
  the PR alone can't close.
- **Deep conflicts requiring the architect conference
  protocol** — those belong in
  `docs/CONFLICT-RESOLUTION.md`. This log is for
  differences that are recordable but don't yet need a
  full conference.

## Schema

Each entry is a row in the table below. Columns:

- **ID** — stable identifier (CC-NNN).
- **When** — date the conflict was observed
  (YYYY-MM-DD).
- **Topic** — one-line description of the disagreement.
- **Between** — named contributors (e.g., `Aaron` vs
  `Amara`; `Kenji` vs `Amara`; `Aaron` vs `Codex`;
  `external-human-X` vs `Aaron`).
- **Positions** — each contributor's position in one
  sentence.
- **Resolution-so-far** — current state of resolution
  (open / tentative-side / resolved; with rationale).
- **Scope** — what the resolution covers and what it
  doesn't (to prevent scope-creep in future
  re-litigation).
- **Source** — pointer to the conversation / PR / doc
  where the conflict surfaced.

## Rules

1. **Resolutions are additive.** When a conflict gets
   resolved, the row's `Resolution-so-far` gets updated
   with the new state; prior state stays in-row as
   history (inline markers like *(superseded YYYY-MM-DD
   by ...)*).
2. **Signal-preservation** applies (per
   `memory/feedback_signal_in_signal_out_clean_or_better_dsp_discipline.md`).
   Verbatim quotes stay verbatim; paraphrase only in the
   one-sentence position summary.
3. **Attribution discipline** applies (per
   `docs/AGENT-BEST-PRACTICES.md` no-name-attribution
   rule) — contributor names ARE appropriate here because
   this log is explicitly tracking who said what;
   equivalent carve-out to `docs/BACKLOG.md` and
   `memory/persona/`.
4. **Adding rows is free work** (per the 2026-04-23
   scheduling-authority rule); resolving a row requires
   maintainer engagement for contributor-level conflicts.

## Categories

- **architectural-preference** — design / algorithm /
  pattern disagreement.
- **priority-ordering** — which work item matters most;
  cf. the funding-priority rule (Aaron owns external-
  priority stack; Amara + Kenji own free-work).
- **scope-boundary** — where feature X ends vs feature
  Y begins.
- **naming** — term / persona / project-name
  disagreement.
- **tech-choice** — tool / language / framework pick.
- **external-requirement** — an external party's
  constraint that differs from factory default.
- **process** — workflow / cadence / hygiene
  disagreement.
- **other** — if none above fit; expand categories when
  "other" grows past a handful.

## Entries

### Open

| ID | When | Topic | Between | Positions | Resolution-so-far | Scope | Source |
|---|---|---|---|---|---|---|---|

*(No open entries at creation. Agents file rows when a
contributor-level conflict is observed that doesn't close
at the per-PR-review-thread or per-conversation level.
The maintainer checks manually for now per
2026-04-23 directive.)*

### Resolved

| ID | When | Topic | Between | Positions | Resolution-so-far | Scope | Source |
|---|---|---|---|---|---|---|---|

*(Empty at creation.)*

### Stale

| ID | When | Topic | Between | Positions | Resolution-so-far | Scope | Source |
|---|---|---|---|---|---|---|---|

*(Empty at creation. Stale = context died, neither
position is any longer relevant; row kept for history.)*

## Relation to adjacent surfaces

- `docs/HUMAN-BACKLOG.md` — individual-human-decision
  asks (including `conflict` category for user-ask
  conflicts the agent can't resolve). This log is
  complementary: broader contributor-level differences
  that may or may not block agent action.
- `docs/CONFLICT-RESOLUTION.md` — persona-conference
  protocol for specialist-persona disagreements. This
  log records contributor-level differences; persona
  conferences can be the resolution mechanism for
  some rows.
- `CURRENT-<maintainer>.md` (per-user) — per-maintainer
  currently-in-force state. This log is cross-contributor
  (pairs or triples).
- `docs/DECISIONS/` ADRs — formal decision records;
  conflicts resolved by ADR get a pointer from the
  row's `Resolution-so-far` to the ADR.
- `docs/protocols/cross-agent-communication.md` (PR #160)
  — courier protocol for external-AI communication. The
  protocol is how contributors communicate; this log
  is where their differences get tracked.

## Eventual UI exposure

Per the maintainer's 2026-04-23 framing, this log is one of
the things that can eventually be surfaced in the Pages-UI
(per the P2 BACKLOG row filed via PR #172). Initial
implementation is read-only (git-backed, no write flow
needed).

## Growth model

- Additive — entries accumulate over time
- Non-destructive — resolved / stale entries stay
- Bounded expected size — contributor-level conflicts
  should be rare; if the log grows past a few dozen open
  rows, revisit whether the scope is too wide
