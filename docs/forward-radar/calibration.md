# PM-2 Calibration Tracker

Tracks the two load-bearing PM-2 effectiveness metrics over time.
Updated by Mira at the close of each forward-radar cycle.

Per B-0145 quality test: PM-2 is NOT measured by memo volume or
B-row count. PM-2 IS measured by Lead-time% and Action-rate%.

---

## Metric definitions

**Lead-time%** — of friction-encounters that surfaced in the loop,
what fraction had already been predicted in the backlog as PM-2
rows _before_ they surfaced?

> Target trajectory: 0% (cold-start) → 20% (calibrated) → 50%+ (mature)

**Action-rate%** — of PM-2's predicted-gap B-rows, what fraction has
PM-1 (Otto) picked up within 4 rounds?

> Below 20%: PM-2 is producing noise.
> Above 80%: PM-2 is feeding the queue effectively.

---

## Calibration log

| Cycle | Period | Friction-encounters | Predicted | Lead-time% | PM-2 rows filed | Picked up (4 rounds) | Action-rate% | Notes |
|---|---|---|---|---|---|---|---|---|
| FR-0 (cold-start) | — | — | — | 0% (baseline) | 0 | — | — | Role activated; metrics begin next cycle |

---

## Quarterly review notes

_First quarterly review due: ~2026-08-01 (three months after
role activation 2026-05-13). If Lead-time% < 10% and Action-rate%
< 20% after 12 cycles, review role charter — per B-0145
anti-patterns: "more bureaucracy" and "research without action."_

---

## How to update

1. Close a forward-radar cycle (memo filed at
   `docs/forward-radar/YYYY-MM-DD-*.md`).
2. Count friction-encounters since last memo: issues, PR-blocks,
   review findings, Aaron corrections that revealed missing features.
3. Of those, count how many had a PM-2 B-row open before the
   friction surfaced. Divide for Lead-time%.
4. Count PM-2 B-rows older than 4 rounds; count how many Otto
   picked up. Divide for Action-rate%.
5. Add a row to the calibration log above.
