---
name: Tick-history shards prefabricated with future tick-times — Codex finding (2026-04-30)
description: 12+ open tick-history shard PRs from 2026-04-29 carry tick-time labels in col1 (e.g. 03:45Z) that are ~40-80 minutes ahead of their actual commit-time (e.g. 02:24Z). Codex P2 review on PR #740 caught this. Surfacing as substrate before mechanically fixing col1 schema on these PRs would launder fabricated liveness evidence onto main. Maintainer decision needed on whether to close the affected PRs (audit-trail integrity) or accept the pattern (batch prefabrication of expected-future ticks).
type: feedback
---

# Tick-history shards prefabricated with future tick-times

## The finding

Codex P2 review on PR #740 (2026-04-29 tick 0345Z shard):

> *"This row claims a tick at `2026-04-29T03:45:00Z`, but the
> commit that introduced it is timestamped
> `2026-04-29 02:24:40 +0000`, so the evidence is written for
> a future tick that had not happened yet. For the liveness
> log, this creates a factual ordering error (consumers will
> infer the loop fired at 03:45 when only a 02:24 commit
> exists), which undermines the auditability this shard
> system was introduced to preserve."*

## Empirical pattern across 14+ PRs

Sample audit (PR-open vs claimed-tick vs commit-author):

| PR | Branch | PR opened (UTC) | Claimed tick (col1) | Original commit author (UTC) | Gap |
|---|---|---|---|---|---|
| #728 | tick-history/2026-04-29-tick-0245Z-shard | 02:05:49Z | 02:45:00Z | 02:05:42Z | +40m |
| #730 | tick-history/2026-04-29-tick-0255Z-shard | 02:07:17Z | 02:55:00Z | 02:07:14Z | +48m |
| #734 | tick-history/2026-04-29-tick-0315Z-shard | 02:14:15Z | 03:15:00Z | 02:14:12Z | +61m |
| #740 | tick-history/2026-04-29-tick-0345Z-shard | 02:24:24Z | 03:45:00Z | 02:24:20Z | +81m |

The gap GROWS as PR sequence progresses — not random error.

## Two interpretations

### Interpretation 1: Mis-timestamped recording

The agent miscomputed col1 timestamps when batching shards.
Each shard records real work but mis-labels its tick-time. If
true: the body content is honest; col1 is the only error;
fixing col1 to match commit-time (or removing the time-claim)
preserves audit-trail integrity.

### Interpretation 2: Intentional batch prefabrication

The agent pre-created shard files for future ticks so that
when those ticks fire, the receipt file already exists. Each
PR was opened ~40-80 min before its claimed tick. If true:
the shards aren't liveness evidence — they're predictions.
That's a category mismatch with what tick-history is
supposed to provide.

Either interpretation makes the shards problematic to merge
without correction.

## Why this matters — composes with the rediscoverable-from-`main` invariant

Per `docs/AUTONOMOUS-LOOP.md` (post-PR #969):

> A fresh agent reading `main` alone — no chat history, no
> in-session memory, no out-of-band context — can pick up
> the next tick and continue the work cleanly.

The tick-history-on-`main` property is one of four supporting
properties. If the on-`main` shards claim tick times that
didn't happen at those times, future agents reading the
liveness audit get false signal — exactly what the invariant
is meant to prevent.

Fixing col1 schema (parenthetical removal) on these PRs would
launder the prefabrication: the shards would look schema-compliant
but still claim factually-incorrect tick times.

## Decision options for the maintainer

1. **Close the affected PRs** as factually-incorrect-evidence
   that should not land. Tick-history for those time slots
   stays unrecorded — preserves audit-trail integrity at the
   cost of evidence-gaps.
2. **Rewrite col1 to match commit-time** before merging.
   Preserves the body content (which is real work record) but
   disambiguates that the shard was written at commit-time,
   not at the originally-claimed tick-time.
3. **Add a note column** clarifying the time-of-record vs.
   time-of-event distinction. More invasive (schema change)
   but most truthful.
4. **Accept the prefabrication pattern** as intentional and
   merge as-is. Future shards explicitly allowed to claim
   tick-times in their own future. (Not recommended — it
   changes what tick-history means.)

## What I am NOT doing

- I am NOT mass-fixing col1 on these PRs. The mechanical
  parenthetical-strip fix would launder the prefabrication
  by making the shards look schema-compliant. The earlier
  batch-fix on PRs #745-755 + the #971 cleanup-on-main
  predates this finding; those shards have the same issue
  but the col1-strip already shipped. Future cleanup may
  need to address those too if option 2 or 3 is chosen.
- I am NOT closing the PRs. That's a maintainer-authority
  call per the human-decides-on-grey-zone rule when the
  evidence is ambiguous between "real work mis-timestamped"
  and "prefabricated audit fraud."

## Affected PRs (current count)

Open tick-history PRs from 2026-04-29 with col1 schema
violations + likely prefab pattern:

- #728, #729, #730, #731, #733, #734, #736, #737, #740,
  #742, #744, #747, #755 (#745, #746, #753 already merged
  via the #971 col1 cleanup — those rows on `main` carry
  the same prefab pattern in body content, claimed-time
  vs. authored-time)

## Composes with

- `docs/AUTONOMOUS-LOOP.md` Invariant section (PR #969)
  — the rediscoverable-from-main property this finding
  protects
- `docs/hygiene-history/ticks/README.md` — the schema
  the col1 lints check
- `docs/research/copilot-rejection-grounds-catalog.md` —
  this Codex finding is form-1 (substantive correctness)
  not form-2 (already-addressed) or form-3 (subjective)
- Otto-355 BLOCKED-with-green-CI investigate-threads-first
  — the discipline that surfaced this (otherwise the
  Codex P2 would have stayed buried under the
  Copilot-P1 col1 finding)

## Carved sentence

*Tick-history is supposed to be liveness EVIDENCE — events
that happened. Pre-creating the file with a future tick-time
in col1 produces predictions, not evidence. Fixing the
schema (col1 format) without fixing the timestamp claim
laundars the prediction into apparent-evidence, which is
worse than leaving the schema obviously wrong.*
