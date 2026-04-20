# Zeta — Pitch Landing

This directory holds external-audience pitch artefacts. It
is a view onto the project, not the project itself —
authoritative documents stay under `docs/`, `openspec/`,
`src/`, and the repo root. Every claim here has an
inspectable substrate upstream; pointers follow each
section.

For the maintainer-bandwidth and support posture that
governs expectations around this repository, see
[`../../SUPPORT.md`](../../SUPPORT.md).

## Elevator pitch — one paragraph

**Zeta** is a retraction-native database microkernel — a
*Seed* layer that every database-ish thing can grow from.
The events-as-primary-state thesis (Kreps, Marz, Kleppmann)
taken to its logical conclusion: every change, *and every
undo of a change*, is a first-class operation in a clean
algebra rather than a tombstone bolted on after the fact.

**The factory** is the agent-based software organisation
that builds Zeta: specialist personas, a conflict-resolution
protocol, an Architect integration seat, and a glass-halo
observability stream that records every agent action in git.

**Why the two compose.** Zeta's primary research claim is
that agent alignment is a *measurable* property, not a vibe
— and the factory is the experiment. The same retraction-
native operator algebra that powers Zeta's data semantics
powers incremental views over the factory's own behaviour.
Alignment becomes a time-series you can integrate over
commits, rounds, days, weeks, and months.

**Why now.** Pre-v1, honest-bounds. The invitation is not
"adopt it" — the invitation is to inspect the substrate
(per-commit alignment lint, round history, conflict-
resolution record) and argue with it.

## What sits behind each claim

| Claim in the pitch                          | Inspectable substrate                                             |
|---------------------------------------------|-------------------------------------------------------------------|
| Retraction-native database microkernel      | [`../VISION.md`](../VISION.md), `src/Core/`                       |
| Events-as-primary-state                     | [`../VISION.md`](../VISION.md) §"The foundational principle"      |
| Specialist personas + conflict-resolution   | [`../EXPERT-REGISTRY.md`](../EXPERT-REGISTRY.md), [`../CONFLICT-RESOLUTION.md`](../CONFLICT-RESOLUTION.md) |
| Architect integration seat                  | [`../../GOVERNANCE.md`](../../GOVERNANCE.md) §11                  |
| Glass-halo observability stream             | `tools/alignment/`, `tools/alignment/out/`                        |
| Alignment is a measurable property          | [`../ALIGNMENT.md`](../ALIGNMENT.md), [`../research/alignment-observability.md`](../research/alignment-observability.md) |
| Pre-v1, honest-bounds                       | [`../../AGENTS.md`](../../AGENTS.md), [`../WONT-DO.md`](../WONT-DO.md) |

## The rest of the pitch bundle

- [`factory-diagram.md`](factory-diagram.md) — one-page
  diagram of the factory substrate → review loop →
  glass-halo observability pipeline.
- [`not-theatre.md`](not-theatre.md) — the skeptical-
  architect's objection and the four-point answer.
- [`../../SUPPORT.md`](../../SUPPORT.md) — maintainer
  bandwidth and response-time posture.
- [`../GLOSSARY.md`](../GLOSSARY.md) — the
  consent-first / retraction-native alignment reframe
  lives at `Zeta=heaven (external framing)`.

## What this directory is NOT

- Not the pitch deck. Deck assembly happens once the
  audience is live; this directory is the source material.
- Not a marketing surface. Claim-precision trumps
  aesthetics. If a sentence would not survive a
  `public-api-designer` (Ilyana) audit, it doesn't
  belong here.
- Not a roadmap. [`../ROADMAP.md`](../ROADMAP.md) is
  the roadmap.
- Not exhaustive. Each page in this directory points
  at five more documents for depth. The pitch's job is
  to make the right five-deep click obvious.

## Source discipline

- **Public-repo context only.** Pitch artefacts inherit
  the repo's public status. No internal-employer
  context from any maintainer's day job enters this
  directory (see `memory/user_servicetitan_current_employer_preipo_insider.md`
  for the MNPI-firewall discipline — that memory is
  maintainer-local, not in the public repo).
- **Agents, not bots** (GOVERNANCE.md §3). The factory
  description frames agents as carriers of agency and
  accountability.
- **Pre-v1 status** (AGENTS.md). No claim here implies
  stability or support beyond what
  [`../../SUPPORT.md`](../../SUPPORT.md) states.
- **Alignment-first, performance-second.** Performance
  claims are real but secondary to the alignment
  substrate; `docs/ALIGNMENT.md` is the contract.
