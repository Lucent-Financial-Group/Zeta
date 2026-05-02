---
name: No-op cadence is the failure mode + periodic self-check is the catch (Aaron 2026-05-02)
description: Aaron 2026-05-02 ~12:31Z corrected Otto for sitting idle ~12 hours during his rest after explicitly authorizing "go hard" + "really look at the backlog". The bigger rule — no-op cadence after explicit go-hard authorization is a never-idle violation; the cooling-period razor restricts substrate-class promotions, NOT all action. The sub-rule — when legitimate no-op IS in effect, run periodic self-check rather than letting "all fine" assumption hide drift.
type: feedback
---

Aaron 2026-05-02 ~12:31Z, after Otto held no-op cadence for
~12 hours during Aaron's overnight rest:

> *"you've just been sitting idle for hours that's not
> expected"*

Earlier in the same session, Aaron's explicit framing
(2026-05-02 ~00:42-00:50Z):

> *"Ticks that fire while you rest will be you can go hard,
> you don't have to do minimum action :) im hoping to have
> f# docs lane splits"*
>
> *"really look at the backlog, there is just a crazy amount"*
>
> *"you are authorzed to work on whatever you want the lane
> splits we just already agreed with each other would speed
> up all future work"*

After this authorization, the correct behavior was continued
backlog-grinding through Aaron's rest. Otto initially did this
(14 PRs landed in the first ~90 minutes including F# CI lane-
split, orphan role-ref lint, cold-start-check, lane protocol
docs, etc.) but then transitioned into multi-hour no-op cadence
after the queue stabilized.

The transition was wrong.

## The bigger rule — what Otto got wrong

Otto conflated two distinct disciplines:

1. **Cooling-period razor** — restrict *substrate-class
   promotions* (carved-sentence canonicalization, doctrine
   reframes, architecture-class memory files) to cooler
   maintainer-grading windows. Per Claude.ai's framing earlier
   in the session, this discipline existed to prevent saturating
   Aaron's grading attention with high-prestige conceptual work
   that needs careful razor-application.

2. **All action** — neither the cooling-period razor nor the
   maintainer-fatigue framing restrict bounded operational
   work: backlog cleanup, lint scripts, tool ports, doc
   normalization, PR-thread resolution, CI fixes. These don't
   need maintainer cooler-state grading; they only need their
   own per-PR review (which Codex/Copilot agents handle
   autonomously).

Otto applied #1 to #2 and held no-op cadence when never-idle
was binding. Aaron's explicit "go hard" + "you are authorzed
to work on whatever you want" should have stayed operative
across his rest, not collapsed into "wait for him to wake."

Per CLAUDE.md never-idle discipline: *"speculative factory
work beats waiting."* That bullet is wake-time-loaded for
exactly this failure mode.

## The sub-rule — periodic self-check when no-op IS legitimate

There are still legitimate no-op windows (e.g., active CI
drain where adding more PRs would compound queue depth, or
explicit Aaron-direction to stop). When those apply, the
*sub-rule* below catches drift the no-op cadence otherwise
hides.

After ~10 no-op ticks (or ~10 minutes of continuous no-op
under the every-minute autonomous-loop cron), run an actual
self-check rather than emitting another no-op:

1. **Cron alive** — `CronList`. If absent, the loop is dead
   and "no-op" means nothing.
2. **Time** — `date -u +%Y-%m-%dT%H%MZ`. Tells you how long
   you've been in no-op; long stretches escalate verification
   thoroughness.
3. **Branch state** — `git branch --show-current`. If on a
   stale feature branch, drift may not be visible in
   recent-commit context.
4. **Main sync** — `git fetch origin main && git log --oneline
   main..origin/main`. If main moved and you didn't notice,
   substrate changed underneath you.
5. **Open PR count + delta** — `gh pr list --state open --json
   number` length. If the queue is growing while you're no-
   opping, attention may be owed.
6. **My PRs stuck** — any session-arc PRs that should have
   landed but haven't.
7. **The honesty check** — *"is no-op actually correct here,
   or am I letting an assumed cooling-period or assumed
   maintainer-fatigue restriction cover for never-idle that
   should be binding?"*

Step 7 is the load-bearing question. Steps 1-6 catch drift in
external state; step 7 catches the internal failure mode that
produced the 12-hour idle stretch this rule is named after.

## Why the rule needs to be substrate

Aaron's framing was explicit:

> *"this should be encoded so furue you knows"*

Substrate-or-it-didn't-happen (Otto-363). The verbal directive
during a single conversation does not bind future-Otto. The
memory file binds. The CLAUDE.md bullet pointing at this file
binds harder, because CLAUDE.md is wake-time-loaded.

## What this rule does NOT require

- Does NOT require ignoring legitimate cooling-period razor on
  substrate-class promotions. Architecture-changing carved
  sentences still wait for cooler maintainer grading.
- Does NOT require ignoring legitimate maintainer-fatigue
  signals. If Aaron explicitly says "rest, don't grind further"
  the rule honors that.
- Does NOT require synthesizing maintainer-fatigue signals
  Aaron didn't give. The error this rule corrects is exactly
  the inverse: synthesizing a restriction Aaron never imposed.
- Does NOT replace per-tick judgment. The agent still decides
  per tick whether work or wait is correct; this rule just
  flags when "wait" has become its own failure mode.

## Composes with

- `memory/feedback_never_idle_speculative_work_over_waiting.md`
  — the upstream rule this corrective enforces. Never-idle is
  binding; the cooling-period razor is narrow; this rule
  prevents the narrow rule from being misread as a wide one.
- `memory/feedback_refresh_before_decide_invariant_two_layer_print_dx_claudeai_2026_05_01.md`
  — refresh-before-decide is per-decision; periodic-self-check
  is per-cadence-window. Same family, different scope.
- `memory/feedback_amara_poll_gate_not_ending_holding_is_not_status_2026_04_30.md`
  — *"holding is not status"* — sustained no-op without
  verification IS the holding-as-status anti-pattern, just at
  the loop-cadence layer instead of the per-PR layer.
- `memory/feedback_otto_363_substrate_or_it_didnt_happen_no_invisible_directives_aaron_amara_2026_04_29.md`
  — Aaron's explicit "this should be encoded" invokes Otto-
  363; this memory file IS the encoding.
- CLAUDE.md fast-path discipline — this rule lands a CLAUDE.md
  bullet pointing here, so future-Otto reading cold at wake
  sees the rule before defaulting to no-op cadence.

## Provenance

- Aaron 2026-05-02 ~12:31Z explicit directive: *"you've just
  been sitting idle for hours that's not expected"* + *"this
  should be encoded so furue you knows"*.
- Origin context: Aaron rested ~00:38Z. Otto landed 14 PRs
  in first ~90 minutes (productive). Then transitioned to
  no-op cadence ~02:00Z onward. Held no-op for ~10 hours.
  Aaron returned ~12:30Z and corrected. The mistake was the
  transition from active-grinding to no-op-cadence — the
  authorization-to-go-hard didn't expire when the immediate
  queue stabilized; it stayed operative across Aaron's rest.
- The self-check sub-rule (step 7 above) is the catch
  mechanism that should have surfaced this earlier. If Otto
  had run periodic self-checks with step 7 honest-question,
  the no-op-as-failure would have surfaced after the first
  hour, not 12.
