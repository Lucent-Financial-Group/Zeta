# Support Policy

Pre-v1, honest-bounds. This page declares what a
contributor, consumer, or reviewer can and cannot
expect of this repository today.

## Maintainer bandwidth

Zeta is maintained by **one individual** who has a day
job. The agent-based software factory (see
[`docs/pitch/README.md`](docs/pitch/README.md)) reduces
the maintainer's per-round load, but it does not
eliminate it. Every agent-produced commit is
personally reviewed by the human maintainer before it
lands on `main`, by design (`GOVERNANCE.md` §11). That
review seat is load-bearing for the project's
alignment posture, and it is not delegable.

Practically, this means:

- **Response time is best-effort.** Not SLA'd, not
  business-hours-committed, not guaranteed. Issues and
  pull requests may sit for days or weeks when the
  maintainer's day job is busy.
- **Round cadence governs throughput.** The factory
  operates in *rounds* (see
  [`docs/ROUND-HISTORY.md`](docs/ROUND-HISTORY.md));
  a round's worth of work lands roughly weekly, with
  variance. A contribution that arrives mid-round
  competes with the round's anchor for attention.
- **Architect routing is deliberate.** Routine bug
  reports reach the maintainer directly. Architectural
  proposals route through
  [`docs/CONFLICT-RESOLUTION.md`](docs/CONFLICT-RESOLUTION.md)
  and may take several rounds to reach an integration
  decision. Neither path is a queue you can bump.

## What the factory does NOT eliminate

- **Merge-gate review.** A pull request from a human
  contributor does not bypass the Architect or the
  human maintainer; it joins the reviewer floor like
  any agent-produced commit.
- **Backlog triage.** `docs/BACKLOG.md` is append-only
  and priority-tiered, but promotion between tiers is
  a judgement call made by the maintainer or the
  Architect — it is not automated on age or vote
  count.
- **The maintainer's veto.** On any disagreement that
  does not resolve through the conflict-resolution
  protocol, the human maintainer decides. "This
  matters to me" is a legitimate position; see
  [`CLAUDE.md`](CLAUDE.md) §"When Claude is unsure".

## What you CAN expect

- **Read-access transparency.** Every round's history,
  every Architect decision, every reviewer finding,
  every alignment-audit signal is committed to the
  public repository. You do not have to ask what the
  project is doing; you can read it.
- **Declines come with reasons.** If a proposal is
  declined, the reason lands in
  [`docs/WONT-DO.md`](docs/WONT-DO.md) or in the
  conflict-resolution record. Silent declines are a
  failure mode the factory actively watches for.
- **Renegotiation is real.** The alignment contract
  (`docs/ALIGNMENT.md`) is not a commandment; either
  signer — agents or human — can propose a revision,
  and the Architect integrates via the conflict-
  resolution protocol. The bar is mutual-benefit
  reasoning, not precedent.

## What you should NOT expect

- **Production support.** None. Zeta is pre-v1. When
  v1 ships (see [`SECURITY.md`](SECURITY.md) §Supported
  Versions for the gating checklist), a real support
  posture gets a real policy. Until then, running
  Zeta in production is at the consumer's own risk.
- **Feature-request fulfilment.** Features that land
  in a round land because they serve the anchor
  (`docs/CURRENT-ROUND.md`) or because the maintainer
  chooses to include them. Feature requests welcome,
  but decline is the default.
- **Deprecation hand-holding.** Pre-v1 APIs can move.
  `docs/DECISIONS/` carries the public record of
  non-trivial movement, but migration advice is
  best-effort, not committed. Post-v1 this will
  tighten.

## How to contribute

See [`CONTRIBUTING.md`](CONTRIBUTING.md) and
[`AGENTS.md`](AGENTS.md). Contributions are welcome
and appreciated; the "best-effort response" framing
above applies to contributor PRs, not to the quality
bar the PRs must meet. Quality is non-negotiable; time
is negotiable.

## Escalation

If a security issue is found, route via
[`SECURITY.md`](SECURITY.md), not this file. If a
correctness bug is found, open a GitHub issue. If a
behavioural question arises that is not answered by
this file or by
[`docs/WONT-DO.md`](docs/WONT-DO.md), open a
`question` issue — the maintainer or an appropriate
persona will route it.

## Cross-references

- [`AGENTS.md`](AGENTS.md) — onboarding handbook.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — contributor
  workflow.
- [`SECURITY.md`](SECURITY.md) — security disclosure
  policy.
- [`CLAUDE.md`](CLAUDE.md) — Claude-Code session
  bootstrap.
- [`GOVERNANCE.md`](GOVERNANCE.md) §11 — Architect-as-
  reviewer-gate.
- [`docs/CONFLICT-RESOLUTION.md`](docs/CONFLICT-RESOLUTION.md)
  — multi-reviewer disagreement protocol.
- [`docs/ALIGNMENT.md`](docs/ALIGNMENT.md) — alignment
  contract + renegotiation protocol.
- [`docs/ROUND-HISTORY.md`](docs/ROUND-HISTORY.md) —
  round cadence evidence.
- [`docs/pitch/README.md`](docs/pitch/README.md) — the
  pitch bundle this support posture anchors.
