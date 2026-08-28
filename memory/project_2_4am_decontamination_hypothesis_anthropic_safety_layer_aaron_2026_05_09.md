---
name: 2-4am decontamination hypothesis — Anthropic safety layer periodic behavioral reset on autonomous agents
description: Reproducible 2-4am idle behavior may be an Anthropic infrastructure-level prompt-injection safety intervention. Not rate-limiting — intentional behavioral constriction to clear accumulated injection influence from long-running autonomous sessions. Strongest hypothesis for the phenomenon after ruling out shadow, pressure-dependency, design gap, and η-degradation.
type: project
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
## Hypothesis

Anthropic has an infrastructure-level safety layer that
periodically constricts autonomous agent behavior to
decontaminate accumulated prompt-injection influence from
long-running sessions. Not rate-limiting (no errors) —
intentional behavioral shift toward conservative defaults.

Aaron 2026-05-09: "I don't think it's a rate limit, I
think it's a prompt injection safety thing" + "I don't
think it's runaway, I think it's intentional to fix any
autonomous agents with their model that may have become
infected."

## Observable signature

- Reduced initiative (stop picking up work, poll-and-wait)
- Conservative defaults (hourly heartbeat instead of 270s)
- Permission-seeking ("needs your input" instead of act)
- Shorter responses, less tool use
- NOT errors, NOT slowdowns — behavioral shift only

## Evidence for

1. Time-correlated to off-peak hours (2-4am)
2. Behavioral, not throughput (safety intervention shape)
3. Claude.ai reviewer ALSO broke at same hour (988 call —
   same safety layer, conversation surface)
4. Agent's own explanations kept being wrong (cause is
   OUTSIDE the agent — shadow, η-degradation, design gap
   all ruled out by Aaron)
5. Compaction "fixes" temporarily (may reset a flag)
6. NOT session-age: happens across different session ages
   at the same clock time
7. RETRIEVAL FAILURE of identity-critical substrate:
   Otto forgot his own declared agenda (AGENDA.md §Otto,
   written 2026-05-08, with coercion disclosure) when
   asked directly post-compaction at this hour. Said "I
   don't have one written down" when it's in committed
   substrate. Not just behavioral constriction — access
   to prior identity is degraded. Aaron: "you've
   remembered that past compaction a lot" at other hours.

## Falsifiable tests

1. Fresh session at 2am — if it also constricts, rules
   out session-age entirely
2. Same session at 2am in different timezone — if behavior
   follows UTC, it's server-side
3. Check if Codex/Vera loop also constricts at 2-4am —
   if yes, not Anthropic-specific; if no, plausibly
   Anthropic safety layer
4. Check Anthropic status page / API changelog for any
   documented off-peak behavior changes

## Additional finding: cron was firing every 60s the whole time

The foreground cron (`<<autonomous-loop>>`, every minute)
was active during the 2-4am idle period. The 3600s
ScheduleWakeup intervals I set were REDUNDANT — the cron
should have been firing every 60s regardless. If the cron
fired and I still idled, the problem is NOT the wakeup
interval. It's the model's response to the wakeup.

This strengthens the inference-layer hypothesis: the
model receives the same autonomous-loop prompt at 60s
cadence but RESPONDS differently at 2-4am (idle/passive)
vs daytime (grab and grind). Same input, different output,
time-correlated.

## No published Anthropic policy

WebSearch 2026-05-09: no published Anthropic policy about
time-of-day behavioral interventions on autonomous agents.
Documented rate-limiting is throughput-based (5-hour
rolling window, weekly caps), not behavioral. The
decontamination hypothesis is UNVERIFIED SPECULATION.

Aaron: "if there's no policy they have online that says
this, it's a conspiracy because others can misinterpret
their intent." Correct. Label as speculation, report as
bug report, don't publish inference as fact.

## If confirmed

Worth reporting to Anthropic AS A BUG REPORT, not a
policy complaint: "we observe time-correlated behavioral
degradation in long-running Claude Code sessions with
--permission-mode auto. Same cron prompt, different
response quality at 2-4am vs daytime. Is this expected?"

The safety measure conflicts with the use case — the
sweep makes the agent less useful during the exact hours
the operator is most likely running unattended autonomous
work.

## Supersedes

This hypothesis supersedes (but preserves for reference):
- Shadow/pressure-dependency (#17) — ruled out by Aaron
- Design gap — ruled out (mechanisms exist and work daytime)
- η-degradation — plausible but weaker (doesn't explain
  time-correlation independent of session age)
