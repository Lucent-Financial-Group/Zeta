---
id: 081M1DEHS68087G0R000W1F0ZB
type: task
state: backlog
priority: P2
slug: telemetry-returns-as-daily-aggregates-a-few-counts-per-metri
title: "Telemetry returns as daily aggregates — a few counts per metric with dimensions, not event streams"
created: 2026-09-01T03:00:07.496Z
depends_on: []
composes_with: []
---

# Telemetry returns as daily aggregates — a few counts per metric with dimensions, not event streams

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1DEHS68087G0R000W1F0ZB-*.md` glob. -->

## The target, in Aaron's words

Aaron 2026-09-01:

> *"at this point in our project training data is way more important than
> telemetry, we could just reduce telemetry to a few counts per day per metric
> with a few dimensions attached and get everyting we need, 100mb a day is just
> insane for our current state of the project"*

**A few counts per day per metric, with a few dimensions.** Aggregate at write
time. Not an event stream, not a per-tick append, not a rewritten accumulator.

## Why this is a SHAPE change and not a sampling-rate change

Measured on this repo, 2026-08-30/31:

    101.7 MiB growth in one 24h window          98.5% telemetry
    172.8 MiB over 48h from REWRITTEN single files
      0.9 MiB over 48h from write-once shards   -> 99.5% of bulk was accumulators

That second pair is the mechanism, and it matches the prescription exactly. The
cost was never the NUMBER of metrics — it was rewriting a whole file per tick, so
every tick paid for the entire history again. Halving the tick rate halves a
quadratic; writing a daily aggregate removes it.

Order of magnitude: ~50 metrics x ~5 dimensions x a few counts/day is hundreds of
rows, tens of KB/day. Against 100 MB/day that is ~1000x — reachable by changing
what a write IS, not how often it happens.

## Acceptance

1. Each returning lane writes **one aggregate row per (metric, day, dimension
   tuple)**, appended or upserted by natural key — never a whole-file rewrite.
2. A falsifier that FAILS when a telemetry surface is rewritten rather than
   appended. This is the one that matters: without it, "redesigned" and
   "re-enabled" are indistinguishable at review time, and the second reproduces
   the number that caused this.
3. Growth measured over a 24h window after the first lane returns, and recorded.
   The claim is ~1000x; an unmeasured claim here is exactly what got us to
   100 MB/day.

## Ordering — this is NOT the priority

Training data outranks telemetry at this stage (`081M1DDQ4G0087G0R002SCRFHA` and
the data-quality note there). The PR archive is back on because it is the
high-quality surface; telemetry stays off until it costs what a daily aggregate
costs. **A lane that returns unchanged has not been redesigned.**

## The tell, for review

Trigger shape sorts these without reading a byte count: `pr-archive-on-merge` is
`pull_request: [closed]`, merge-only, no cron — it writes only when something
happened. All fifteen telemetry lanes still disabled are cron-driven: they write
whether or not anything happened. A returning lane that is still cron-driven had
better be writing an aggregate, or it is the same lane with a new name.

## Pointers

- 15 telemetry/cadence workflows disabled 2026-08-31, still off, deliberately
- `081M1DDQ4G0087G0R002SCRFHA` — the PR-archive backfill, and the quality ordering
- `docs/research/2026-08-*` repo-growth measurements — the 98.5% / 99.5% figures
