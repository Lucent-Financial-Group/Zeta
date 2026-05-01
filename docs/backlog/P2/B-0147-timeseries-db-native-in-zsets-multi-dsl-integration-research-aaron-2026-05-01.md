---
id: B-0147
priority: P2
status: open
title: TimeSeries DB native-in-Zsets multi-DSL integration research (metrics-are-our-eyes)
created: 2026-05-01
last_updated: 2026-05-01
---

# B-0147 — TimeSeries DB native-in-Zsets multi-DSL integration research

## What

Domain research to identify the candidate timeseries-DB
technology that integrates natively into the Zset substrate
alongside the other first-class types (graph, hierarchy,
filesystem, etc.) via a unified meta-DSL. Output: a design
document with candidate evaluation, dependency-source-priority
filter applied, recommended approach, and concrete next steps.

**This is not a "pick a TSDB and use it" task.** It is research
toward the multi-algebra-DB vision where timeseries is one
algebra among many, all composable through the meta-DSL. The
research output is the *design*, not the implementation.

## Why now

Aaron 2026-05-01:

> *"back log timeseries db domean reserach i know prometheus,
> that's our good citizen dependency candidate but there may be
> better more modern more integrated but pro not... we want it
> native in the zsets with meta dsl multi dsl integration like
> the others types, ,graph, hierarchy, filesystem, etc..."*
>
> *"that's for all the metrics that's the connection it's not
> just for fun, it's our eyes"*

The metrics-are-our-eyes framing (per
`feedback_dependency_source_priority_open_source_microsoft_cncf_apache_mit_research_microsoft_research_metrics_are_our_eyes_aaron_2026_05_01.md`)
makes the timeseries-DB infrastructure load-bearing for the
factory's self-perception. Without it, the SRE metric frameworks
(DORA/USE/RED/Four Golden Signals, per PR #1116) have nowhere
to land their reproducibly-measured outputs over time. Metrics
without time-series persistence is a snapshot; metrics with
time-series persistence is a fitness function.

## Acceptance criteria

1. **Candidate landscape** — produce a research doc at
   `docs/research/2026-XX-timeseries-db-candidate-landscape.md`
   covering at least:

   - **Prometheus** (Aaron's known good-citizen baseline; CNCF
     graduated; pull-based; PromQL; widely-deployed)
   - **TimescaleDB** (PostgreSQL extension; SQL-native;
     time-partitioned; Apache 2.0)
   - **InfluxDB** (line-protocol; Flux/InfluxQL; check license
     tier — OSS vs commercial — for proprietary-filter)
   - **VictoriaMetrics** (Apache 2.0; Prometheus-compatible
     API; high cardinality)
   - **Microsoft Research candidates** — search MSR for
     timeseries-DB primitives or any precursor research
     (Aaron 2026-05-01 dependency-priority rule)
   - **OpenTelemetry metrics backends** (CNCF; portable
     metrics protocol; pluggable backends)
   - Any tier-1–5 candidates surfaced via WebSearch per Otto-364

2. **Dependency-source-priority filter applied.** Each candidate
   classified into the tier hierarchy:
   - Tier 1: Open Source (general)
   - Tier 2: Microsoft OSS
   - Tier 3: CNCF
   - Tier 4: Apache
   - Tier 5: MIT-licensed
   - REJECTED: proprietary (exclude regardless of feature fit)

3. **Algebra-fit analysis.** For the top 3 candidates, document:
   - Data model (what's the primary type?)
   - Retraction support (per
     `feedback_graph_substrate_must_be_tight_in_all_aspects_zset_backed_first_class_event_retractable_columnar_storage_first_of_kind_2026_04_24.md`
     constraint set: ZSet-backed + first-class event +
     retractable + columnar)
   - Query language semantics
   - Mapping to ZSet algebra — does it compose, or does it
     require an adapter layer?

4. **Meta-DSL integration sketch.** A short section in the
   design doc proposing how the chosen timeseries algebra
   plugs into the factory's existing meta-DSL alongside graph
   + hierarchy + filesystem types. Doesn't need to be the
   final design; it needs to be a concrete sketch.

5. **Recommended approach.** Pick one of:
   - **Adopt and integrate** — chosen candidate is a clean fit;
     wire it in as a Zset-backed algebra
   - **Adopt-with-adapter** — chosen candidate is good but
     needs an adapter layer; document the adapter shape
   - **Build native** — no candidate is good enough; design a
     ZSet-native timeseries algebra from scratch (likely if
     retraction-native semantics aren't supported by any
     existing TSDB)
   - **Defer** — candidates are evolving fast; revisit in N
     rounds with PM-2 forward-research input (B-0145)

6. **Next-step backlog rows filed.** Whatever the recommendation
   is, the follow-up actions become discrete B-rows (e.g., if
   "build native" then B-NNNN for the native implementation).

## Research-cadence inputs (per dependency-priority memory)

When researching this, prioritize sources in this order:

1. **Microsoft Research** (research.microsoft.com) — search for
   timeseries-DB primitives, retraction-native datalog,
   incremental view maintenance over time-streamed data
2. **CNCF projects** (cncf.io) — Prometheus, OpenTelemetry,
   adjacent observability work
3. **Apache projects** — Druid, Cassandra time-series usage,
   Flink + state-store patterns
4. **MIT-licensed academic / industry papers** — VLDB / SIGMOD
   / ICDE proceedings on incremental computation over time
5. **Other academic** — DBSP itself comes from this lineage;
   recent DBSP-adjacent papers may have timeseries extensions

Per Otto-364 search-first authority — verify every load-bearing
claim against current upstream docs / papers / project pages,
not training data.

## Out of scope (defer)

- **Implementation.** This is a research B-row. Implementation
  is the recommendation's follow-up B-row(s).
- **Performance benchmarks.** Benchmarking against the harness
  (per reproducibility-first / B-0144 work) is a separate
  follow-up. Research first; measure later.
- **The other algebras (graph / hierarchy / filesystem).** Each
  has its own substrate and may already be partly designed.
  This row scopes only to timeseries; sibling rows can cover
  the others if they're not already covered elsewhere.
- **Vendor-relationship management.** "Good-citizen" relationships
  with the chosen project's maintainers (per
  `feedback_absorb_and_contribute_community_dependency_discipline_2026_04_22.md`)
  is operational follow-up after the choice is made.

## Composes with

- `feedback_dependency_source_priority_open_source_microsoft_cncf_apache_mit_research_microsoft_research_metrics_are_our_eyes_aaron_2026_05_01.md`
  — the substrate this row instantiates
- `feedback_reproducible_accuracy_before_quality_fitness_function_harness_first_aaron_2026_05_01.md`
  (PR #1116) — the SRE metric frameworks (DORA/USE/RED/FGS)
  whose timeseries persistence this row enables
- `feedback_parallelism_scaling_ladder_*_2026_05_01.md`
  (PR #1116) — the amortized-keystone that timeseries-persisted
  metrics enable; the rung-4 lessons-mechanization that observability
  enables
- `project_zeta_multi_algebra_database_one_algebra_to_rule_them_all_sequenced_after_frontier_and_demo_2026_04_23.md`
  — the multi-algebra DB vision; this row is one of the
  algebras
- `feedback_graph_substrate_must_be_tight_in_all_aspects_zset_backed_first_class_event_retractable_columnar_storage_first_of_kind_2026_04_24.md`
  — the 4-axis tightness rule that applies to ALL multi-type
  algebras under the meta-DSL, including timeseries
- `feedback_absorb_and_contribute_community_dependency_discipline_2026_04_22.md`
  — the discipline for the chosen project's relationship
- `feedback_otto_364_search_first_authority_not_training_data_not_project_memory_aaron_2026_04_29.md`
  — research must be search-first, not training-data-recall
- B-0145 (PM-2 role) — proactive research sources include
  Microsoft Research; this row's research-cadence-inputs section
  is a worked example of PM-2's research discipline
- B-0146 (formal architecture ladder) — when this row's
  recommendation lands, the follow-up implementation rows
  should declare their layer (likely Layer 5: reproducibility
  harness)

## Layer (per B-0146)

**Layer 5: Reproducibility harness.** The timeseries-DB is the
substrate that makes metrics persist over time, which is what
makes the SRE metric frameworks operational. Layer 5 sits above
Layer 4 (domain metric frameworks) and feeds Layer 6 (accuracy).

## Effort

**L (large, 3+ days, research-grade)** for the full landscape
analysis + algebra-fit + meta-DSL integration sketch +
recommendation. The implementation follow-up B-rows will each
be their own effort estimates.

## Why P2 (not P0 / not P1 / not P3)

- **Not P0** because the factory functions today without
  timeseries persistence (metrics are computed and observed
  per-tick; trend-analysis is informal).
- **Not P1** because B-0144 (doc/code two-lane) and B-0145
  (PM-2 role) come first in the throughput + direction axes;
  observability infrastructure compounds value but doesn't
  block the next throughput unlock.
- **Not P3** because the metrics-are-our-eyes framing makes
  this load-bearing once the factory operates at any scale
  worth measuring; deferring indefinitely accumulates blind-
  operation cost.
- **P2** sits in the right place — important enough that
  research lands soon; not so urgent that it preempts the
  in-flight throughput / role / mechanization work.
