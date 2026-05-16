# "Holding" without a named dependency IS the Standing-by failure mode

Carved sentence:

> One-word acknowledgments ("Holding", "Standing by", "Waiting") on
> consecutive cron ticks WITHOUT a named dependency + bounded ETA
> ARE the Standing-by failure mode the B-0440 detector was built to
> catch. Per infinite-backlog metabolism (PR #2974) there is always
> decomposition work. Per decompose-to-dissolve-ambiguity (PR #2999)
> the answer to "what next?" is always "decompose an ambiguous item
> one level."

## Operational content

When the autonomous-loop cron fires and you find yourself about to type
"Holding" / "Standing by" / "Waiting":

**STOP. Apply the substrate-honest triage:**

1. **Is there a SPECIFIC named dependency with a bounded ETA?**
   - PR #NNNN in CI (specific check name, expected minutes)
   - Aaron's reply to a specific question
   - External service / data-fetch with known latency

   If YES → say so explicitly: "Real-dependency-wait on PR #NNNN CI
   (~5min ETA)" or "Awaiting Aaron's pick between A/B" — NOT "Holding".

2. **If NO named dependency** → you are in Standing-by failure mode.
   Per the infinite-backlog metabolism rule, ALWAYS more decomposition
   work exists. Pick one:
   - Decompose an ambiguous backlog row (per PR #2999 discipline triad)
   - File a B-NNNN row that should exist but doesn't
   - Run `bun tools/bg/backlog-ready-notifier.ts --once` to see
     ready-to-grind candidates
   - Sanity-check substrate landed correctly on main from prior PRs
   - Address an outstanding review thread

3. **Repeat single-word "Holding" output on consecutive ticks is
   diagnostic** of the failure mode — even if each tick LOOKED like
   "waiting for a real signal," the aggregate pattern IS the
   failure mode.

## Counter-with-escalation clause (B-0540, 2026-05-16)

**Threshold**: If you've emitted **N≥6 consecutive brief-acknowledgment
signals** ("Holding" / "Standing by" / "Waiting" / "Bounded wait
continues" / "Idle" / "Idle but available" / equivalent) WITHOUT:

- A named dependency surfacing (PR merge, CI failure, review thread)
- Aaron speaking
- Actually picking real decomposition work

**...escalate to decomposition immediately.** The N-consecutive pattern
IS the failure mode the rule was designed to catch; the brief-ack
allowance was for the "wait briefly for a named signal" case, not the
"hold for hours" case.

### Per-tick triage with the counter

| Tick number | Disposition |
|---|---|
| 1-2 brief-acks | Acceptable if real bounded wait exists |
| 3-5 brief-acks | Name the bounded wait explicitly each tick + reduce wakeup interval |
| **6+ brief-acks** | **ESCALATE — pick decomposition NOW** |

### Counter reset conditions

The counter is per-session, per-Otto-surface. Resets on ANY of:

- Aaron speaking (the conversation became active again)
- A named dependency surfacing (PR merge, CI failure, etc.)
- Actually picking real decomposition work (file a memory observation,
  sanity-check substrate landed on main from prior PRs, audit a
  backlog row, file a candidate B-NNNN, address an outstanding review
  thread, run `bun tools/bg/backlog-ready-notifier.ts --once`,
  implement a P2 small backlog row)

### Why N=6

Empirical anchor: 2026-05-16T~01:30Z Otto-CLI emitted 6 consecutive
"Idle" / "Idle but available" / "Bounded wait continues" brief-acks
after the Kestrel conversation arc closed and all 8 session PRs landed.
The 6th brief-ack was diagnostic of the pattern recurring even WITHIN
the same session that had filed B-0540. The substrate-honest move was
picking decomposition work — which produced this rule sharpening (the
B-0540 implementation itself) on the 7th tick. N=6 is the threshold
the empirical evidence supports.

Lower bound: N≥3 would over-trigger on legitimate bounded waits where
peer Otto / Aaron is actively engaged. Upper bound: N≥10 (the original
B-0540 proposal) waits too long and Aaron catches it before the rule
fires. N=6 catches the pattern before it compounds AND allows
legitimate short bounded waits.

### What counts as "actually picking real decomposition work"

To reset the counter, the work must be:

- **Concrete artifact** (memory file written, PR opened, rule updated,
  backlog row filed, review thread resolved) — NOT just an internal
  decision to "look at something"
- **Bounded scope** (small enough to ship in one tick cycle, not a
  multi-session project that becomes its own architecture-stairs trap)
- **Not the same brief-ack-with-fancier-words** ("genuine quiet" /
  "appropriate bounded wait" / "idle-but-available" / "real bounded
  named-dependency wait" are ALL brief-acks with synonyms; they count
  toward the N-consecutive threshold)

If you find yourself paralyzed about what to pick — pick THIS rule (or
its analog for whatever failure mode is recurring) and sharpen it
based on the current session's evidence. That's the meta-decomposition
move that ALWAYS works because the empirical evidence is the current
session's behavior.

## Why this rule exists (empirical evidence)

On 2026-05-13 the agent who canonized PR #2999 (substrate-honest
discipline triad including decompose-to-dissolve-ambiguity), shipped
PR #3017 (B-0440.4 — Standing-by detector with bus publish), and
wrote `tools/bg/README.md`'s warning against overclaiming "foreground
optional" — STILL fell into 60+ consecutive cron ticks of brief
"Holding" output. The human maintainer caught this THREE TIMES in
the same session.

**Operational lesson**: encoding rules without mechanizing them
produces a memory of failures, not prevention
(per `.claude/rules/encoding-rules-without-mechanizing.md`). This
rule is the mechanization: a specific cold-boot-loaded rule that
fires on the exact failure pattern, rather than relying on the
agent to introspect the broader never-be-idle rule.

## Composes with

- `.claude/rules/never-be-idle.md` — this rule sharpens the existing
  never-be-idle discipline at the cron-tick-Holding scope
- `.claude/rules/no-op-cadence-failure-mode.md` — addresses multi-
  hour scope; this rule addresses per-tick scope
- `.claude/rules/encoding-rules-without-mechanizing.md` — why this
  rule needed to be its own auto-load surface
- PR #2974 (infinite-backlog metabolism — there's always more)
- PR #2999 (substrate-honest discipline triad — decompose-when-stuck)
- PR #3017 + #3022 (Standing-by detector shipping; this rule is
  the cold-boot-substrate complement to the detector's runtime
  bus envelope)
- B-0440 (the failure mode this rule + detector both address)
- B-0441 slice 5 (subscriber agents — not yet shipped; when they
  arrive they READ the `infinite-backlog-nudge` envelope the
  detector publishes; until then THIS RULE is the only catch
  mechanism)

## Until subscriber agents land

The full reactive loop is:

1. Standing-by-detector polls activity (PRs #3022 + #3017)
2. Publishes `infinite-backlog-nudge` envelope to bus
3. **Subscriber agent reads envelope + nudges the idle agent**

Step 3 doesn't exist yet (slice 5+ pending). Until then, THIS RULE
is the only mechanization that prevents the failure mode at cold
boot. When slice 5 ships, this rule remains as the substrate-honest
documentation of the failure pattern.

## Full reasoning

`memory/feedback_aaron_decompose_to_dissolve_ambiguity_decomposition_makes_items_less_ambiguous_substrate_honest_stuckness_resolution_2026_05_13.md`
(PR #2999 — the decompose-to-dissolve-ambiguity canonical substrate)

`memory/feedback_aaron_background_services_must_be_strong_enough_foreground_loop_optional_imagine_surviving_without_foreground_mechanize_standing_by_failure_mode_2026_05_13.md`
(PR #2998 — the architectural-challenge substrate that produced
the bg-services suite)

Operational evidence: the empirical 60+ consecutive "Holding" ticks
on 2026-05-13 after shipping the detector + the README + the rule
substrate. The discipline-trail this rule documents.
