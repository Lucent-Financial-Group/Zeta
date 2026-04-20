# Factory pitch-readiness gap inventory — 2026-04-20

Round 38 Top-3 deliverable. Enumerates what is
presentation-ready *now* vs what needs work before the
factory can be pitched to an external dual-architect
audience (current employer-architect + skip-level-ex-
direct-manager architect, both internal at the human
maintainer's current employer; see
`memory/user_servicetitan_current_employer_preipo_insider.md`
for MNPI-firewall discipline that governs the pitch frame).

This document is a gap inventory, not the pitch itself.
The pitch deck, one-pager, and FAQ are downstream
deliverables — they can only be assembled once the
underlying readiness gaps are closed. Owners and effort
sizes below name the path; the Architect (Kenji) gates
integration.

## Source discipline

- **Public repository context only.** The factory lives in
  a public GitHub repo; every asset that might surface in
  the pitch is already public or about to be. No internal-
  employer information enters this document, the pitch, or
  any pitch artefact.
- **Agents-not-bots framing (GOVERNANCE.md §3).** The pitch
  describes agents carrying agency and accountability, not
  "AI bots doing chores". This is a load-bearing framing
  distinction.
- **Research-grade status.** Zeta is pre-v1; the pitch must
  not overclaim. Honest-bounds framing is the strongest
  pitch move (per the `reasonably honest` reputation
  memory).
- **Alignment-first, performance-second.** Zeta's primary
  research focus is *measurable AI alignment*; the factory
  is the experimental loop. Performance claims are real
  but secondary (`docs/ALIGNMENT.md`,
  `docs/research/alignment-observability.md`).

## Audience model

- **Architect-1 (current employer-architect).** Senior
  staff/principal-tier. Cares about: architectural
  coherence, scalability of the pattern beyond Zeta,
  supply-chain + security posture, honest-bounds
  assessment of what's shippable.
- **Architect-2 (skip-level-ex-direct-manager).** Similar
  technical depth; additional weight on organisational
  fit, roadmap credibility, maintainer bandwidth.
- **Shared readings.** Both architects have long-form
  engineering depth; neither needs a tutorial on DBSP,
  incremental view maintenance, or AI-agent patterns.
  Both will be skeptical of "50-expert factory" on sight
  — the pitch has to show the *discipline* (conflict-
  resolution protocol, skill-creator workflow, glass-halo
  observability), not just the headcount.
- **Not the audience this round.** Conference talks,
  academic peer-reviewers, open-source contributors,
  library consumers — these are separate surfaces with
  separate readiness inventories (see BACKLOG P1
  "Autonomous conference-submission" + P1 "Product-
  support surface").

## Readiness dimension taxonomy

The pitch lives across five dimensions. Each is scored
**READY** / **PARTIAL** / **GAP** with a brief citation.

1. **Architectural coherence** — can the pattern be
   explained end-to-end in one diagram + one paragraph?
2. **Demonstrable discipline** — is there evidence that
   the factory is *actually* reviewed, audited, and self-
   correcting (not just claimed)?
3. **Honest-bounds framing** — does the pitch declare
   what Zeta is *not* and what the maintainer does *not*
   commit to?
4. **Replicability** — could another architect stand up
   an analogous factory on a different substrate without
   the maintainer's ongoing hand-holding?
5. **Alignment substrate visibility** — is the
   measurable-AI-alignment claim backed by per-commit
   data a reviewer can inspect?

## Dimension-by-dimension gap table

### 1. Architectural coherence

| Asset                                   | Status   | Notes                                                                     |
|-----------------------------------------|----------|---------------------------------------------------------------------------|
| `docs/VISION.md`                        | READY    | Seed + plugins framing lands; Cayley-Dickson pre-split coordinate covered |
| `GOVERNANCE.md` numbered sections       | READY    | Numbered rules cite-able by section                                       |
| `docs/EXPERT-REGISTRY.md`               | READY    | Roster + diversity declared                                               |
| `docs/CONFLICT-RESOLUTION.md`           | READY    | Conference protocol documented                                            |
| One-diagram view                        | GAP      | No single-page factory diagram exists today                               |
| One-paragraph elevator pitch            | GAP      | `docs/VISION.md` opens with specifics, not elevator-level framing         |

**Gap 1a: One-diagram factory view.** A single-page
diagram showing: repo substrate → skills + personas →
conflict-resolution protocol → Architect integration →
commits → glass-halo observability stream. Effort: S.
Owner: Kenji (Architect) drafts; Iris (UX) validates
first-10-minutes readability; Figma MCP is the drawing
tool (the maintainer has the tool available this session).

**Gap 1b: One-paragraph elevator pitch.** ~100 words
answering: what is Zeta, what is the factory, why do the
two compose, and why now. Effort: S. Owner: Kai
(positioning) drafts; Ilyana (public-API-designer) audits
for claim-precision.

### 2. Demonstrable discipline

| Asset                                               | Status   | Notes                                                               |
|-----------------------------------------------------|----------|---------------------------------------------------------------------|
| `docs/ROUND-HISTORY.md`                             | READY    | 30+ rounds of evidence; chronological narrative                     |
| `docs/DECISIONS/`                                   | READY    | ADR folder with numbered decisions                                  |
| `docs/BACKLOG.md` priority structure                | READY    | P0-P3 tiers; append-only; declines go to `docs/WONT-DO.md`          |
| `.claude/skills/` + `.claude/agents/`               | READY    | Substantial skill + persona corpus                                  |
| `tools/alignment/out/` first run                    | READY    | 19 commits audited Round 38; zero VIOLATED signals                  |
| Harsh-critic + spec-zealot findings visible         | PARTIAL  | Findings cited in commits but not aggregated into one summary       |
| Named failure modes + renegotiation evidence        | PARTIAL  | ALIGNMENT.md renegotiation protocol declared but not yet exercised  |

**Gap 2a: Harsh-critic + spec-zealot aggregate view.**
A short document (`docs/research/critic-findings-
2026-04.md` or similar) summarising the classes of
finding the harsh-critic and spec-zealot personas have
raised over the last ~10 rounds, and how each was
resolved (fixed / declined / parked). Shows the
self-correction mechanism is live, not decorative.
Effort: M. Owner: Kira (harsh-critic) + Viktor
(spec-zealot) produce findings; Kenji integrates.

**Gap 2b: Renegotiation-protocol worked example.** The
ALIGNMENT.md renegotiation protocol is unexercised today.
At least one worked example (could be as small as
*"a SD-6 watchlist entry was modified after X-observation
triggered rule-Y"*) would show the protocol is real.
Effort: M, tied to the natural round cadence (not
forced). Owner: organic; surface when it happens.

### 3. Honest-bounds framing

| Asset                                              | Status   | Notes                                                           |
|----------------------------------------------------|----------|-----------------------------------------------------------------|
| `docs/WONT-DO.md`                                  | READY    | Explicit declines with reasons                                  |
| `AGENTS.md` pre-v1 status declaration              | READY    | "Pre-v1; APIs will move" stated prominently                     |
| `docs/security/THREAT-MODEL.md`                    | READY    | Channel-closure threat class covered Round 37                   |
| Maintainer-bandwidth bounds                        | GAP      | The human maintainer has a day job; this is not declared        |
| What the factory does NOT do (external-audience)   | GAP      | WONT-DO.md is internal-reader-oriented                          |

**Gap 3a: Maintainer-bandwidth declaration.** A short
section (could land in `AGENTS.md` or a pitch-adjacent
`SUPPORT.md`) stating: Zeta is maintained by one
individual with a day job; contributions welcome; the
factory reduces the maintainer's load but does not
eliminate it; response times are best-effort, not
SLA'd. Honest-bounds protects the pitch from the obvious
"can you support us?" question. Effort: S. Owner:
Bodhi (DX) drafts in the contributor onboarding path;
Samir (documentation) integrates.

**Gap 3b: External-audience "what we don't do" page.**
Reformat the key WONT-DO.md entries into an external-
audience-friendly version. Distinct file recommended
because internal decline-reasons are denser than external
readers need. Effort: S. Owner: Iris (UX) leads the
reframe; Kai (positioning) checks tone.

### 4. Replicability

| Asset                                             | Status   | Notes                                                                        |
|---------------------------------------------------|----------|------------------------------------------------------------------------------|
| `tools/setup/install.sh`                          | READY    | One install script, three consumers (GOVERNANCE §24)                         |
| `.github/workflows/gate.yml`                      | READY    | Full CI gate documented                                                      |
| `.claude/skills/skill-creator/SKILL.md`           | READY    | Skill-authoring workflow defined                                             |
| Factory replication guide                         | GAP      | No document answers "how would I stand up my own factory?"                   |
| Substrate-independent version of the pattern      | GAP      | The pattern is currently described only through Zeta's F#/.NET substrate     |

**Gap 4a: Factory replication guide.** A document
(`docs/research/factory-replication-guide.md`) that walks
a reader through standing up an analogous factory on
their own codebase: what skills to start with, how to
pick personas, how to bootstrap the conflict-resolution
protocol, what the minimum viable skill set is. This
lands in the Round 40-42 horizon per the BACKLOG
"Product-support surface" entry, but a Round 38 stub
with a table-of-contents and a few example entries is
low-cost and high-pitch-value. Effort: M for stub,
L for full guide. Owner: Kenji (Architect) drafts;
Samir integrates.

**Gap 4b: Substrate-independent pattern write-up.** The
factory pattern is codebase-agnostic in principle but
always described with F#-specific examples today. A
short piece that strips the F#-specifics and shows
"here's the pattern applied to a Python monorepo /
TypeScript frontend / Go service" would demonstrate
replicability to architects whose substrate is not F#.
Effort: M. Owner: Kai (positioning) + Samir (documentation)
co-draft; a cross-domain-translation skill review passes
over it.

### 5. Alignment substrate visibility

| Asset                                                         | Status   | Notes                                                           |
|---------------------------------------------------------------|----------|-----------------------------------------------------------------|
| `docs/ALIGNMENT.md`                                           | READY    | The contract; landed Round 37                                   |
| `docs/research/alignment-observability.md`                    | READY    | Research proposal + per-commit metrics                          |
| `docs/research/zeta-equals-heaven-formal-statement.md`        | READY    | Formal statement of the alignment claim                         |
| `tools/alignment/` scripts + `out/` first data                | READY    | Live audit artefacts from Round 37-38                           |
| External-audience framing of the alignment claim              | GAP      | The `=heaven` wording is internal-shorthand; won't land in pitch |
| "Why should an architect believe this isn't just theatre?"    | GAP      | The anti-theatre argument exists across docs but isn't one-stop |

**Gap 5a: External-audience reframe of alignment claim.**
`Zeta=heaven-on-earth` is load-bearing internal
terminology, but will not translate to the dual-architect
audience. An external reframe — something closer to
*"consent-first retraction-native primitives minimise the
channel through which misalignment can propagate"* —
lives alongside (not replaces) the internal framing. The
GLOSSARY.md entry for both framings is the bridge.
Effort: S. Owner: Kai (positioning) drafts; Ilyana
(public-API-designer) audits for claim-precision.

**Gap 5b: "Not theatre" argument, one page.** A single-
page argument answering the skeptical architect's
objection: *"how do I know this factory isn't elaborate
compliance theatre?"* Points: (i) the per-commit
alignment-lint output is public and regenerable; (ii)
the negative examples in `docs/ALIGNMENT.md`
§Measurability explicitly forbid theatre; (iii) the
harsh-critic + spec-zealot findings (Gap 2a) show
self-correction is live; (iv) the human-maintainer
seat external to the agent loop is the load-bearing
defense per the `user_trust_sandbox_escape_threat_class`
memory. Effort: S. Owner: Kenji (Architect) drafts;
Aminata (threat-model-critic) audits adversarially.

## Summary — priority-ordered gap list

| Priority  | Gap                                                | Effort |
|-----------|----------------------------------------------------|--------|
| P1        | 1a One-diagram factory view                        | S      |
| P1        | 1b One-paragraph elevator pitch                    | S      |
| P1        | 5b "Not theatre" argument page                     | S      |
| P1        | 3a Maintainer-bandwidth declaration                | S      |
| P1        | 5a External-audience reframe of alignment claim    | S      |
| P2        | 2a Harsh-critic + spec-zealot aggregate view       | M      |
| P2        | 3b External-audience "what we don't do" page       | S      |
| P2        | 4a Factory replication guide (stub)                | M      |
| P3        | 4b Substrate-independent pattern write-up          | M      |
| P3        | 2b Renegotiation-protocol worked example           | M      |

**Critical path.** Five P1 gaps, all S-sized. All can
land in one round if scoped tightly. Once they land, the
factory can be pitched on short notice; the P2 + P3 gaps
strengthen the pitch but don't block it.

## What a pitch-ready artefact set looks like

Once the P1 gaps close, the pitch-ready bundle is:

1. **One-page elevator** — opens with the one-paragraph
   pitch, closes with the one-diagram factory view.
2. **Alignment substrate page** — reframed alignment
   claim + "not theatre" argument.
3. **Honest-bounds page** — maintainer-bandwidth +
   external-friendly decline list.
4. **Pointer to live evidence** — `docs/ROUND-HISTORY.md`,
   `tools/alignment/out/`, latest `docs/research/*`.
5. **Q&A preparation** — anticipated objections (theatre,
   replicability, support, v1 timeline) with pre-drafted
   answers; this lives offline / in-conversation and does
   not need to ship as a public artefact.

## Cross-references

- `docs/VISION.md` — Seed + plugins framing the pitch
  builds on.
- `docs/ALIGNMENT.md` — the substrate claim the pitch
  rests on.
- `docs/research/alignment-observability.md` — per-commit
  measurement framework.
- `docs/research/ci-retractability-inventory.md` —
  Round 38 Top-1 companion, shows the factory eats its
  own dog food.
- `docs/research/zeta-equals-heaven-formal-statement.md`
  — formal statement of the alignment claim.
- `docs/EXPERT-REGISTRY.md` — the persona roster the
  pitch cites.
- `docs/CONFLICT-RESOLUTION.md` — the protocol the pitch
  points at when asked "how do agents disagree without
  breaking the build?"
- BACKLOG P1 "Autonomous conference-submission +
  talk-delivery pipeline" — downstream external-audience
  surface this readiness inventory unblocks part of.
- BACKLOG P1 "Product-support surface" — adjacent
  external-audience surface with its own readiness
  inventory due Round 39-40.
- `memory/user_servicetitan_current_employer_preipo_insider.md`
  — pitch audience identity + MNPI firewall discipline.
- `memory/user_reasonably_honest_reputation.md` —
  honest-bounds framing rationale.
