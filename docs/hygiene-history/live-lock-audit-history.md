# Live-lock audit history

Per-run log of `tools/audit/live-lock-audit.sh` — a cadence audit
that classifies the last N commits on `origin/main` into three
buckets (external / internal-factory / speculative) and flags the
live-lock smell when the external ratio is too low.

**The smell:** Aaron, 2026-04-23:

> on some cadence look at the last few things that went into master
> and make sure its not overwhelemginly speculative. thats a smell
> that our software factor is live locked.

**Mechanism:** A factory producing only process / research /
meta-factory / tick-history / BACKLOG-row work — without external-
observable product progress (src/ changes, sample improvements,
test landings, UI progress) — is *live-locked*: every worker is
busy, every tick fires, nothing external moves.

**Healthy threshold:** EXT ≥ 20% of a rolling 25-commit window.
Tunable via `LIVELOCK_MIN_EXT_PCT` env var.

**Classification rules:**

- `EXT` — file touched under `src/`, `tests/`, `samples/`, `bench/`
- `INTL` — file touched under `docs/ROUND-HISTORY`, `docs/hygiene-history/`,
  `.claude/`, `docs/BACKLOG` (factory-meta work)
- `SPEC` — file touched under `docs/research/`, `memory/`,
  `docs/DECISIONS/` (speculative / decision)
- `OTHR` — uncategorised (mixed / boundary)

The full memory context is
`memory/project_aaron_external_priority_stack_and_live_lock_smell_2026_04_23.md`.

## Log

| date (UTC) | window | EXT | INTL | SPEC | OTHR | smell? | notes |
|---|---:|---:|---:|---:|---:|---|---|
| 2026-04-23 | 25 | 0% | 72% | 16% | 12% | **FIRING** | Inaugural run. Last 25 merged commits on `origin/main` contain zero src/tests/samples/bench changes. Factory has been running purely on tick-history + BACKLOG + research output for weeks. Response arc: PR #141 (ServiceTitan CRM demo sample) is the pattern-breaker; once #141 merges, the next audit should show non-zero EXT. Audit script landed this run. |
