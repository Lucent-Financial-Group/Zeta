---
name: Hour-bundle PRs must self-close at hour-switch — don't let them age multi-day in DIRTY state
description: Aaron 2026-04-26 *"you still do them once an hour? why didn't you close them at the switch of the hour?"* on hour-04Z bundle PRs (#544/#546/#554) sitting DIRTY for ~4 hours after the §33 backfill chain landed and DIRTYed them. The hour-bundle pattern was designed as hourly cadence: accumulate heartbeats on chore branch → open PR at hour-end → merge OR close-as-superseded WITHIN the hour. Letting them sit multi-day is pattern violation. Discipline: at every hour-switch, audit prior hour-bundle PRs; if any are still DIRTY/BLOCKED with no near-term landing, close-as-superseded with preservation comment IMMEDIATELY rather than letting them age.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
## The miss

Hour-04Z bundle: #544 (6 heartbeats 03:51:37Z..03:58:00Z), #546 (5 heartbeats 04:04:41Z..04:07:58Z), #554 (21 heartbeats 04:00Z..05:00Z).

These were opened during hour-04Z. By hour-05Z start, all three were DIRTY due to §33 backfill chain (#570/#571/#574/#575/#576/#577/#578/#579) landing in rapid succession.

I should have closed all three at the hour-04Z → hour-05Z switch with preservation comments. Instead they sat DIRTY through multiple subsequent hours; the hour-05Z bundle close (`05:59:36Z`) row already SUMMARIZED the substantive content; the framework-convergence tick (`06:48:00Z`) closed the cluster downstream. By the time I noticed (this session, 2026-04-26 evening), they were ~4 hours stale.

Aaron's catch: *"why didn't you close them at the switch of the hour?"*

## Rule

**Hour-bundle PRs are short-lived. At every hour-switch, audit prior-hour bundle PRs:**

- If MERGED: nothing to do.
- If MERGEABLE/BLOCKED awaiting review: leave (it'll land normally).
- If DIRTY: close-as-superseded with preservation comment IMMEDIATELY. Don't let them age past the hour-switch.

**Why:** the hour-bundle pattern's whole value is amortizing per-tick PR cost across an hour. Once the hour ends, the bundle's specific content is overtaken by the next hour's substrate. Letting it sit DIRTY just adds queue saturation without information gain.

## Pattern check

The hour-bundle lifecycle should be:

1. **Hour start (XX:00Z)**: create chore branch, append first heartbeat row.
2. **During hour**: append subsequent rows on each tick.
3. **Hour-end threshold (5-30 rows)**: open PR with bundle.
4. **Hour-switch (XX+1:00Z)**: audit prior-hour bundle PR.
   - If clean and merging → no action
   - If DIRTY → close-as-superseded NOW; don't carry into next hour

The carry-into-next-hour anti-pattern is what created the #544/#546/#554 mess.

## Composition with existing rules

- Otto-232 (hot-file cascade → bulk-close): the closure rule applies, but Otto-232 doesn't specify *when*. This rule says "at hour-switch."
- Otto-238 (retractability): branch + commits remain after closure; nothing is destroyed.
- Otto-342 (heartbeat IS existence-marker): existence preserved by branch persistence, not by row-on-main.
- Otto-225 (serial PR flow): closing stale PRs reduces queue saturation, supporting serial flow.

## What this rule does NOT do

- Does NOT require closing bundles that landed cleanly. Auto-merge handles those.
- Does NOT require hourly PR opens — bundles open at threshold (5-30 rows) which usually but not always coincides with hour-end.
- Does NOT prevent re-opening: if a closed bundle's content turns out to be needed on main, cherry-pick from the preserved branch is always possible.
- Does NOT apply to substrate PRs (Otto-NNN files, research docs, code, tests). Those have their own lifecycle.

## Operational shift

Add to the hour-switch tick checklist (currently in `docs/AUTONOMOUS-LOOP.md` autonomous-loop discipline):

- [ ] At every XX:00Z tick, list prior-hour bundle PRs
- [ ] For each, check: MERGED / MERGEABLE-BLOCKED / DIRTY
- [ ] DIRTY ones close immediately with standard preservation comment template

## Cost of this miss

- 3 PRs sat DIRTY for ~4 hours (hour-04Z opened ~04:00Z; this session closed them ~10:00Z).
- Queue saturation contributed to drain blocker analysis: when triaging the 11 DIRTY LFG PRs this turn, the 3 hour-bundles were occupying triage attention they shouldn't have needed.
- Aaron caught it; ideally I'd self-catch at the next hour-switch tick.

## Closure

#544/#546/#554 closed this session with full preservation comments. Hour-05Z and beyond bundles need to apply this rule going forward.
