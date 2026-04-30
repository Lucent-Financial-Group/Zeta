---
name: GitHub status — first-class dependency reference (Aaron 2026-04-30)
description: GitHub is our only host right now; the GitHub status API is first-class repo-and-loop substrate. Canonical URL pinned + freshness-check rule named.
type: reference
---

# GitHub status — first-class dependency reference

Aaron 2026-04-30 (autonomous-loop channel input, verbatim):

> looking at github status should be first class for us we live
> on git and github for now until we get a 2nd host in the future
>
> that github status page should be first class remembered
> somwehre in our repo and loop since github is our only host
> right now

The factory's hot path runs through GitHub: auto-merge, the
every-minute autonomous-loop cron, the Scorecard rolling
window, CodeQL analyses, the AceHack→LFG forward-sync flow,
Copilot/Codex PR reviews. Until a second git host exists,
**GitHub status IS factory status**.

## Canonical URLs

- **Status page (human)**: <https://www.githubstatus.com/>
- **Status API (machine)**:
  <https://www.githubstatus.com/api/v2/summary.json>

The summary.json endpoint is the freshness-check surface. It
returns:

- `status.indicator` — one of `none`, `minor`, `major`,
  `critical`, `maintenance`
- `status.description` — human-readable status (e.g.,
  "All systems operational" / "Partially Degraded Service")
- `incidents[]` — currently active incidents with name,
  status (`investigating`/`identified`/`monitoring`/`resolved`),
  impact, and incident_updates
- `components[]` — per-component status; non-`operational`
  components are the affected systems

## Factory-relevant component allowlist

These components, when degraded, directly affect the factory's
hot path. Other components (Pages, Codespaces, etc.) are not in
scope for the factory's gate-state decisions. This list is
authoritative for the freshness-check rule below — any change
to it requires Architect / human sign-off.

- **Pull Requests** — affects PR queries, thread state,
  auto-merge readiness. Degradation here can produce
  incomplete API results that fool the auto-merge pre-flight
  check.
- **Actions** — affects CI runs. Degradation here can cause
  spurious "in-progress forever" or missing-check-rollup
  states.
- **API Requests** — the entire `gh` CLI runs through this.
  Degradation here makes every gate-state poll unreliable.
- **Webhooks** — affects branch-protection check delivery.
  Degradation can mean a check that "completed" never gets
  reported back to the PR.
- **Git Operations** — the substrate layer. Degradation here
  affects push, fetch, force-push semantics.
- **Issues** — used for the dependency-status incident log
  pattern (per B-0109's design).

## Freshness-check rule (loop + investigation integration)

Aaron 2026-04-30 reinforcement (verbatim):

> polling github status should just be a regular part of our
> loops and investigations because all our assumptions are
> based on them being healthy today which is not always true
> as we can see todya

The freshness-check is **not** a pre-mutation-only gate. It
runs at three points:

1. **Every autonomous-loop tick.** Each `<<autonomous-loop>>`
   wake polls `summary.json` as part of its standard lane-state
   read. The result lands in the lane-state report alongside
   PR/CI/threads, so future-Otto and the human maintainer see
   the dependency state every tick. This is the primary
   integration point.
2. **Every investigation.** Whenever a loop tick is
   investigating an anomaly (slow CI, stuck PR, missing
   check, unexpected `BLOCKED` state, vanished review
   threads, force-push race conditions), the freshness-check
   is the first candidate cause considered. *"Is GitHub
   currently degraded?"* is asked before *"is my logic
   wrong?"* — same shape as the speculation-vs-evidence
   discipline (`feedback_speculation_leads_investigation_not_defines_root_cause_aaron_2026_04_28.md`),
   applied at the dependency layer.
3. **Before any mutating action** (merge, force-push,
   auto-merge arming, branch deletion, commit-then-push). This
   is the strictest gate; non-green status defers the action.

The freshness-check produces a one-of-three classification:

1. **`status.indicator == "none"` AND no incident affects
   factory-relevant components** → green; proceed with the
   mutating action per normal pre-flight rules.
2. **Any incident affects a factory-relevant component** →
   the action is **deferred** until the dependency clears.
   The conservative response taken at incident-discovery time
   (e.g., disabling auto-merge on PR #911 at 11:14Z on
   2026-04-30) is the floor; loop must not re-arm or re-issue
   mutating actions until the freshness-check returns to
   class 1.
3. **`status.indicator` non-none but no incident in
   factory-relevant components** → proceed with caution;
   record the unrelated incident in the lane-state report so
   future-Otto can correlate retrospectively.

The freshness-check itself is non-mutating (a single HTTP GET).
Its cost is negligible vs. the cost of acting on incomplete
state. **Skipping it is not an option** — the every-minute
autonomous-loop cron makes per-tick freshness affordable, and
the per-investigation use is amortized over what would
otherwise be wasted speculation cycles.

## The assumption this rule makes testable

Aaron's framing names what was previously implicit: *"all our
assumptions are based on them being healthy today which is not
always true as we can see todya."* Every gate-state poll, every
auto-merge decision, every CI summary, every thread query
silently presumes GitHub is healthy. When the assumption is
true, polling is redundant; when the assumption is false, the
gate-state results lie. The freshness-check makes the
underlying assumption explicit and testable on every tick — it
costs almost nothing to verify and converts a silent failure
mode into a visible one.

## Re-arm condition during incident recovery

When auto-merge has been deliberately disabled because of a
live incident, re-arming requires **two consecutive consistent
freshness checks** (per
`feedback_amara_poll_gate_not_ending_holding_is_not_status_2026_04_30.md`
"Auto-merge re-arm during dependency-incident recovery"
section). One freshness check during recovery jitter is not
enough — recovery may produce intermittent operational
readings before the underlying state actually clears.

## Composes with

- `docs/backlog/P0/B-0109-dependency-status-tracking-surface-2026-04-30.md`
  — the broader dependency-status tracking surface this
  reference is the first concrete piece of. Other dependencies
  (Anthropic, OpenAI, Google) get their own reference entries
  when their status sources are wired in; the design pass for
  the full surface lives in B-0109.
- `memory/feedback_amara_poll_gate_not_ending_holding_is_not_status_2026_04_30.md`
  — the poll-the-gate rule that names the gate-state shape and
  the auto-merge pre-flight check. The freshness-check rule
  here is the dependency-layer version of poll-the-gate.
- `docs/AUTONOMOUS-LOOP.md` — the loop discipline. The
  freshness-check above adds a dependency-aware pre-flight to
  the existing tick checklist; binding integration into the
  loop spec is a follow-up edit.
- `memory/feedback_aaron_visibility_constraint_no_changes_he_cant_see_2026_04_28.md`
  — the visibility-constraint rule. A degraded GitHub also
  degrades the visibility surface Aaron uses to verify
  factory state; freshness-check failures are a visibility
  gap that should be flagged in the lane-state report.

## Origin

Aaron 2026-04-30 sent two short, separated inputs that
together established this rule:

1. *"looking at github status should be first class for us we
   live on git and github for now until we get a 2nd host in
   the future"* — first-class framing.
2. *"that github status page should be first class remembered
   somwehre in our repo and loop since github is our only host
   right now"* — explicit ask to land it as durable
   substrate (in-repo memory + loop integration).

The catalyst was the live GitHub Pull Requests degradation
incident discovered earlier in the same session, ongoing since
2026-04-30T03:49Z, which directly exposed the gap this rule
fills.
