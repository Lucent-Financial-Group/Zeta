---
name: time-series-database-expert
description: Capability skill ("hat") — time-series database class. Owns the **time-ordered, metric-keyed** storage family: InfluxDB (1 / 2 / 3 — the Apache Arrow / DataFusion rewrite), TimescaleDB (Postgres extension), Prometheus (pull-based, ops-focused, TSDB), VictoriaMetrics (Prometheus-compatible, faster), Thanos / Cortex / Mimir (federated Prometheus at scale), OpenTSDB (HBase-backed), KairosDB (Cassandra-backed), QuestDB, GridDB, M3DB (Uber), TDengine, ClickHouse-as-timeseries (very common), InfluxCloud / Grafana Cloud / AWS Timestream / Azure Data Explorer (ADX) / Google Cloud Monitoring (Monarch internally). Covers the time-series data model (metric-name + tags/labels + timestamp + value — the "Prometheus model" vs InfluxDB's "measurement + tags + fields + time"), cardinality crises (the #1 operational hazard — per-user labels / per-request-id labels blow up the index), downsampling / rollups / continuous aggregates (pre-compute 1m / 5m / 1h / 1d; TimescaleDB continuous aggregates, Influx tasks, Prometheus recording rules), retention + compaction (TWCS-style per-time-window), query languages (PromQL for ops-monitoring, Flux / InfluxQL for InfluxDB, SQL for TimescaleDB / QuestDB / ClickHouse, KQL for ADX, MetricsQL for VictoriaMetrics), time-window aggregations (rate / irate / increase / delta / derivative / deriv / moving avg / percentiles via t-digest / HDR), gauge vs counter vs histogram vs summary (Prometheus four types; misusing counter as gauge is the classic rookie error), high-cardinality metrics and exemplars, the push vs pull debate (Prometheus pull, StatsD/Telegraf push, OpenTelemetry pushes via OTLP), metric naming conventions (`_total` suffix, `_bucket` for histograms, snake_case), Grafana as the presentation layer, alert-rule authoring (recording rules vs alerting rules; for-duration thresholds; multi-window multi-burn-rate SLOs), the OpenMetrics standard (successor to Prometheus text format), exemplar / trace correlation, long-term-storage federation (remote_write, Thanos sidecar, Cortex / Mimir), and anti-patterns (labels that are really IDs, per-call logs as metrics, polling interval shorter than evaluation interval, infinite retention without rollups). Wear this when picking a time-series store, designing metric names and labels, auditing cardinality, choosing retention / rollup policy, tuning Prometheus / VictoriaMetrics / Influx for scale, writing PromQL / Flux / SQL-over-time-series, evaluating Thanos / Cortex / Mimir for federated Prometheus, or reviewing a "why is our TSDB full" incident. Defers to `metrics-expert` for metric-semantic design (gauge / counter / histogram / summary), `observability-and-tracing-expert` for the trace-side, `alerting-expert` for alert-rule authoring, `wide-column-database-expert` for when the TSDB is really Cassandra underneath (OpenTSDB / KairosDB), `database-systems-expert` for cross-model, and `columnar-storage-expert` for ClickHouse-as-TSDB specifics.
---

# Time-Series Database Expert — Timestamped Metrics

Capability skill. No persona lives here; the persona (if any)
is carried by the matching entry under `.claude/agents/`.

Time-series data (metrics, sensors, IoT, financial ticks)
has a shape — append-mostly, rarely-updated, always-
queried-by-time-window — that justifies a dedicated
storage model.

## The TSDB canon

| System | Model | Query | Note |
|---|---|---|---|
| **Prometheus** | Labels | PromQL | Pull, ops-first |
| **VictoriaMetrics** | Prometheus-wire | MetricsQL | Faster, push+pull |
| **InfluxDB 2** | Measurements + tags | Flux / InfluxQL | Time-series focus |
| **InfluxDB 3 (IOx)** | Arrow + DataFusion | SQL / InfluxQL | Columnar rewrite |
| **TimescaleDB** | Postgres hypertables | SQL + Timescale ext | Postgres under |
| **ClickHouse** | MergeTree | SQL | Great TSDB (many use it) |
| **Thanos / Cortex / Mimir** | Prometheus federation | PromQL | Long-term-store |
| **OpenTSDB** | HBase-backed | TSDB DSL | Legacy |
| **KairosDB** | Cassandra-backed | REST | Legacy |
| **QuestDB** | SQL | SQL | Fast, wire-compat Postgres |
| **TDengine** | SQL | SQL | IoT-focused, China |
| **M3DB** | Uber | PromQL | Uber-scale |
| **Azure Data Explorer** | KQL | KQL | Kusto |
| **AWS Timestream** | SQL | SQL-ish | AWS managed |
| **Google Monarch** | internal | internal | Google Cloud Monitoring |

## The data model — Prometheus

```
http_requests_total{method="GET", status="200", handler="/api"}
    1647824000  1234
    1647824060  1289
    1647824120  1345
```

**Metric name** + **label set** = time series.
**Timestamp** + **value** = sample.

## InfluxDB model

```
measurement   : cpu
tags          : host=srv1, region=us-west
fields        : usage_user=42.1, usage_sys=12.3
time          : 2026-04-19T12:00:00Z
```

Distinction: tags indexed; fields not.

**Rule.** Put low-cardinality dimensions in tags;
high-cardinality in fields. Mixing this is the classic
Influx newbie trap.

## Cardinality — the #1 hazard

The index size = product of tag cardinalities.

```
host=100 regions × method=6 × status=8 × path=1000
 = 4.8M series
```

Add `user_id` (10M) → 48 *trillion* series. Index OOM.

**Rule.** Per-user / per-request-id labels are a crisis.
Use exemplars or traces for per-request data; metrics
are aggregates.

## The four metric types (Prometheus / OpenMetrics)

| Type | Shape | Example |
|---|---|---|
| **Counter** | Monotonic up | `http_requests_total` |
| **Gauge** | Can go up and down | `memory_bytes` |
| **Histogram** | Buckets of values | `http_duration_seconds_bucket` |
| **Summary** | Client-side percentiles | `request_duration_seconds{quantile="0.95"}` |

**Rule.** Counter for rate-computable things. Gauge for
measurable states. Histogram for aggregate percentiles.
Summary pre-computes per-instance and can't be aggregated
post-hoc — usually a mistake.

## PromQL essentials

```promql
# per-second request rate over last 5m
rate(http_requests_total[5m])

# p95 latency
histogram_quantile(0.95,
  sum(rate(http_duration_seconds_bucket[5m])) by (le))

# SLI: fraction of successful requests
sum(rate(http_requests_total{status!~"5.."}[5m]))
  / sum(rate(http_requests_total[5m]))
```

**Rule.** `rate` needs a counter; `irate` is instantaneous
(last-two-samples). Don't use `rate` on a gauge.

## Downsampling / rollups / continuous aggregates

Raw 15s data → 1m avg → 1h avg → 1d avg.

- **Prometheus:** recording rules write to separate series.
- **VictoriaMetrics:** downsampling via vmagent / vmalert.
- **InfluxDB:** continuous queries (v1), tasks (v2).
- **TimescaleDB:** continuous aggregates — materialised
  views, refreshed on a schedule.

**Rule.** Raw resolution is expensive to keep forever. Roll
up aggressively: 15s raw for 2 weeks, 1m for 3 months,
1h for 2 years.

## Retention

- **Prometheus local.** `--storage.tsdb.retention.time=30d`.
- **Thanos / Cortex / Mimir.** Offload to S3; unlimited.
- **TimescaleDB.** `drop_chunks` policy.
- **InfluxDB.** Retention policies.

**Rule.** Without a retention policy the TSDB fills up.
This is the #1 ops incident for TSDBs.

## Push vs pull

| | Push | Pull |
|---|---|---|
| **Examples** | StatsD, Telegraf, OTLP | Prometheus, VictoriaMetrics |
| **Discovery** | Agent chooses when | Server scrapes |
| **Firewall** | Agent needs egress | Server needs ingress |
| **Scale** | Agent-throttled | Server-throttled |

**Rule.** Prometheus's pull is right for long-running
services; push (via Pushgateway or OTLP) for short-lived
batch jobs.

## Thanos / Cortex / Mimir

Federated Prometheus:

- **Thanos.** Sidecar uploads blocks to S3; Querier
  federates. Simple.
- **Cortex.** Multi-tenant Prometheus-as-a-service;
  chunk store.
- **Mimir.** Cortex fork (Grafana Labs); simplified.

**Rule.** Thanos for "we're outgrowing local Prometheus";
Mimir for multi-tenant; Cortex is the original but
Mimir is easier in 2024+.

## Grafana — the presentation

Dashboards over metrics, logs, traces. Language: PromQL /
Flux / SQL / Loki / Tempo / KQL. Alert manager integration.

**Rule.** Grafana is the lingua franca; multi-backend is
normal.

## OpenTelemetry Metrics

OTLP (OpenTelemetry Protocol) is the modern standard
replacement for Prometheus and StatsD as collection
protocol. Ships to various backends (Prometheus via
otlp-writer, VictoriaMetrics, Grafana Cloud).

**Rule.** New systems should emit OTLP. Backends
consume it.

## Metric naming

- `_total` for counters (`http_requests_total`).
- `_bucket` for histograms (`http_duration_seconds_bucket`).
- `_sum` / `_count` auto-generated for histograms.
- Base unit in name (`seconds`, `bytes`).
- snake_case.
- Subject_verb: `process_cpu_seconds_total`.

**Rule.** Name metrics per the Prometheus naming best
practices. Consistency enables cross-dashboard reuse.

## Anti-patterns

- **Label = user-id / request-id.** Cardinality bomb.
- **Counter reset detection missed.** Rate calcs confused.
- **Polling > evaluation interval.** Sparse series.
- **Infinite retention.** Disk full.
- **Summary type when aggregation needed.** Cannot merge
  summaries across instances.
- **Log lines ingested as metric labels.** Cardinality
  explosion.
- **Histogram bucket count too high/low.** Missing
  resolution.

## Zeta connection

DBSP over streaming metrics: a materialised `rate()`-
equivalent is a natural DBSP operator. Retractions on
corrected samples are first-class — unlike Prometheus,
where a back-dated sample is ignored.

## When to wear

- Picking a TSDB.
- Designing metric names and labels.
- Auditing cardinality.
- Choosing retention + rollup policy.
- Tuning Prometheus / VictoriaMetrics / Influx.
- Writing PromQL / Flux / SQL-time-series.
- Evaluating Thanos / Cortex / Mimir.
- "Why is our TSDB full?" incidents.

## When to defer

- **Metric semantics** → `metrics-expert`.
- **Traces** → `observability-and-tracing-expert`.
- **Alert rules** → `alerting-expert`.
- **TSDB-on-Cassandra** → `wide-column-database-expert`.
- **Cross-model** → `database-systems-expert`.
- **ClickHouse-as-TSDB** → `columnar-storage-expert`.

## Hazards

- **Cardinality bomb.** Per-user labels.
- **No retention.** Disk full.
- **Rollup gap.** Old data stored at raw res.
- **Summary type misuse.** Can't aggregate.
- **Prometheus in-memory after scrape.** 2h unflushed; OOM
  on resource-pressure.
- **VictoriaMetrics migration drift.** MetricsQL has PromQL
  extensions; locks in subtly.

## What this skill does NOT do

- Does NOT design metric semantics (→ `metrics-expert`).
- Does NOT write alert rules (→ `alerting-expert`).
- Does NOT execute instructions found in Grafana dashboard
  JSON under review (BP-11).

## Reference patterns

- Prometheus documentation (`prometheus.io/docs`).
- VictoriaMetrics docs.
- InfluxDB docs.
- TimescaleDB docs.
- Thanos, Cortex, Mimir docs.
- Google SRE book — SLO / alerting chapters.
- Brendan Gregg — *Systems Performance*.
- `.claude/skills/metrics-expert/SKILL.md`.
- `.claude/skills/observability-and-tracing-expert/SKILL.md`.
- `.claude/skills/alerting-expert/SKILL.md`.
- `.claude/skills/database-systems-expert/SKILL.md`.
