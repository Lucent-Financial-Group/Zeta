---
id: 081M1MF08NA087G0R000F8B000
type: bug
state: backlog
priority: P1
slug: heartbeat-liveness-reported-a-deliberately-disabled-subject
title: "heartbeat-liveness reported a deliberately disabled subject as a lane outage"
created: 2026-09-03T20:22:43.114Z
depends_on: []
composes_with: []
---

# heartbeat-liveness reported a deliberately disabled subject as a lane outage

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1MF08NA087G0R000F8B000-*.md` glob. -->

## What happened

`agent-heartbeat.yml`, `society-heartbeat.yml` and `tick-metrics.yml` were disabled at the
GitHub API level (`state: disabled_manually`) on 2026-08-29 while the heartbeat lane is
redesigned for space efficiency. `heartbeat-liveness.yml` was re-enabled on 2026-09-03 without
asking whether its subject was still switched on.

It then answered the only question it knew how to ask — "how old is the newest success?" — and
answered it correctly: very old.

**Measured 2026-09-03T20:00Z:**

| quantity | value |
|---|---|
| `heartbeat-liveness` runs that day | 35 |
| of those, red | **35 (100%)** |
| comments accumulated on issue #15329 | **68** |
| cadence | one comment every 15 minutes, unbounded |

Every one of those statements was true, and none of them was news.

## Why it is a defect and not just noise

The workflow's own header already names the failure mode it fell into: *"an alarm that cries
wolf during healthy operation gets muted, which is a slower way of having no alarm at all."*
The 60-minute threshold was sized against GitHub's measured scheduling jitter. Nothing was
sized against the subject being turned off.

The missing distinction: **a source that is expected to tick and has not is STALE; a source
nobody expects to tick is UNENROLLED**, and reporting the second as an outage manufactures a
finding out of a decision. The repo already had this vocabulary — a loop participant carrying a
`deregister` event is not a faulty participant, it is not a participant.

## The fix

The subject workflow's live `.state` is now an input to the verdict, giving three outcomes
instead of two: `alive` (exit 0) · `paused` (exit 0, `::warning::` on every run, recorded on
the liveness ledger as a fifth `outcome` value) · `stale` (exit 1, unchanged).

Three properties keep the pause branch from becoming the vacuity class, each pinned by a
mutation-checked falsifier in `tick-source.test.ts`:

1. **Derived from the live API**, never a repo-side flag — the alarm cannot be muted by editing
   a file, and re-enabling the workflow re-arms it with no code change.
2. **Freshness wins** — a fresh source is `alive` whatever the subject's state, so `paused` is
   reachable only when nothing ticked anyway. It changes how silence is *reported*, never
   whether a tick was *seen*.
3. **Unrecognised state fails closed** — any state string the module does not know is treated as
   `active`. Mapping unknown to "disabled" would let a typo or an API change silence the alarm.

A watchdog fault (evidence present but unparseable) stays `stale` even under a disabled
subject: the one state in which nobody is checking the parser must not also be the state in
which its failure is silent.

Separately, the issue refresh gained a **6-hour re-notify floor** and moved off `gh issue list`
(GraphQL) to REST. A level-triggered alarm needs a floor for the same reason it needs a
threshold: its job is to be noticed once and stay findable, not to be repeated until it is
filtered.

## Falsifier

`bun test src/Core.TypeScript/agent-heartbeats/tick-source.test.ts` — the three `MUTATION GUARD`
cases. Verified by mutation on 2026-09-03: `subjectIsUnenrolled(s) => s !== "active"` fails
guard 3 (5 tests red); checking enrollment before freshness fails guard 1.
