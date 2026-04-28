# Trajectory — Cost Monitoring

## Scope

LFG operating costs (Copilot seats, Actions billing, Packages,
Shared storage), AceHack fork costs, and the burn-cadence
visibility infrastructure (`docs/budget-history/`,
`tools/budget/`, scheduled cadence workflow). Open-ended because
GitHub pricing changes, usage patterns shift, and runway
projections need refreshing as evidence accumulates. Bar: Aaron
can see current burn at any time; trajectory toward
self-sustainability is auditable.

## Cadence

- **Weekly snapshot**: budget-snapshot-cadence workflow (PR #25
  pending merge) — runs Sundays 16:23 UTC.
- **Per-PR burn-effect**: any change that affects CI minutes
  / runner mix / dependency add gets a burn-effect note.
- **Monthly runway projection**: from snapshots.jsonl trend.

## Current state (2026-04-28)

- `tools/budget/` — snapshot-burn.sh + project-runway.sh +
  daily-cost-report.sh
- `docs/budget-history/` — snapshots.jsonl (3 rows; baseline
  2026-04-21 + 2026-04-26T13:57 + 2026-04-26T18:50)
- `docs/budget-history/README.md` — cadence policy doc
- `docs/budget-history/latest-report.md` — most-recent
  human-readable snapshot
- AceHack PR #25 (`ops(ci): weekly budget-snapshot-cadence
  workflow`) — pending merge after Aaron toggles relevant rule
- LFG: $27/mo baseline ($8 Team + $19 Copilot × 1 seat)
  confirmed via Otto-65 real-billing addendum
- AceHack: $4/mo baseline confirmed
- Standard runners free for public repos (Otto-210/249) —
  major cost-control lever

## Target state

- Weekly snapshots running automatically (PR #25 lands).
- Aaron can see current monthly burn + trailing 30-day spend
  at a glance.
- Runway projection is auditable from snapshot trends.
- Task #287 deadline window 2026-04-26..04-29 met
  substantively (current state: PR #25 unblocked + #32
  snapshot N=3 row merged earlier).
- N>=20 snapshots before linear projection becomes statistically
  meaningful.

## What's left

In leverage order:

1. **Land AceHack PR #25** — workflow file lands → first
   automated snapshot fires within a week.
2. **N>=4 snapshots** — current N=3; need ~20 for trend.
3. **Runway projection skill / output** — `project-runway.sh`
   exists; surface the output somewhere Aaron sees regularly.
4. **Org-billing scope** — `gh auth refresh -s admin:org`
   would unlock Actions billing / Packages / shared-storage
   data (currently `scope_coverage` reports partial coverage).
5. **Cost-anomaly alerting** — when burn jumps unexpectedly,
   surface to Aaron.

## Recent activity + forecast

- 2026-04-28: AceHack PR #25 unblocked from semgrep + 3 P1
  threads; awaiting CI / merge.
- 2026-04-28: AceHack PR #32 (snapshot N=3) merged earlier
  this session.
- 2026-04-26: PR #25 originally opened.

**Forecast (next 1-3 months):**

- PR #25 lands → weekly cadence runs.
- N=10+ snapshots accumulate → first meaningful projection.
- Possible org-admin scope expansion (Aaron's call).
- Cost-anomaly alerting candidate (BACKLOG row when warranted).

## Pointers

- Tooling: `tools/budget/snapshot-burn.sh`
- Tooling: `tools/budget/project-runway.sh`
- Tooling: `tools/budget/daily-cost-report.sh`
- Data: `docs/budget-history/snapshots.jsonl`
- Doc: `docs/budget-history/README.md`
- BACKLOG: task #287 cost-monitoring (in_progress; deadline 2026-04-29)
- BACKLOG: task #297 cadence workflow (still pending merge despite
  task list saying completed — see PR #25)
- AceHack PR: #25 (pending merge)
- Memory: `memory/feedback_amara_priorities_weighted_against_aarons_funding_responsibility_*.md`

## Research / news cadence

External tracking required (light) — this is an active-tracking
trajectory at GitHub-pricing scope.

| Source | What to watch | Cadence |
|---|---|---|
| GitHub billing docs (public-repo / private-repo / runner-class pricing) | Pricing changes affecting Zeta's free-tier + standard-runner cost model | Quarterly |
| GitHub Actions release notes | New runner classes (e.g. ubuntu-slim landed 2026-01); pricing shifts | Per-release |
| Copilot Business / Enterprise pricing | Per-seat cost changes; new tier introduction | Quarterly |
| Anthropic / OpenAI / cross-AI API pricing | Cost of cross-AI ferry coordination; per-token economics | Quarterly |

Findings capture: pricing-change findings → snapshot annotation
in `note` field; structural-cost-class changes → trajectory
state update.
