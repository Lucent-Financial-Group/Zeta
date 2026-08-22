---
id: 081M0N5Z0Z4087G0R002QJ37ST
type: task
state: in-progress
priority: P2
slug: zeta-drift-dashboard-substrate-neutral-check-roster-unknown
title: "Zeta drift dashboard — substrate-neutral check roster, Unknown as first-class verdict, coverage as a red condition"
created: 2026-08-22T16:48:17.892Z
depends_on: []
composes_with: []
---

# Zeta drift dashboard — substrate-neutral check roster, Unknown as first-class verdict, coverage as a red condition

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M0N5Z0Z4087G0R002QJ37ST-*.md` glob. -->

## The occasion (measured, 2026-08-22)

`gh run list --branch main --limit 200` — the query the fleet had been reporting
"main is clean" from — contained runs from only **22 of 81 active workflows**.
Heartbeat traffic saturates the window; its oldest run was from 15:25 the same day.
A window sample is not a slow instrument, it is a **structurally blind** one, and its
blindness renders as green.

Latest-run-per-workflow surfaced four workflows failing unseen (one red since 08-16,
weekly, so it sat red for six days). Those four are being fixed elsewhere; this item
is the instrument that would have caught them on day one.

## What shipped

**Producer layer — the existing forge-host plugin contract, extended in place.**
GitHub is *a* forge host, never *the* forge host; the destination is **sovereign mode**
(no centralized forge host, author/verifier agent attestations in place of forge gates).
So the dashboard consumes `src/Core.TypeScript/forge-host/`, and what it needed and did
not find there was added there:

- `CheckObservationSource` (in `forge-host.ts`) — `listCheckDefinitions` (the ROSTER,
  i.e. the denominator) + `listLatestCheckObservations` (latest per check, never a
  window). `ForgeHost extends CheckObservationSource`.
- Host-agnostic vocabulary in `forge-host/types.ts`: `CheckId`, `Verdict`,
  `UnknownReason`, `CheckExpectation`, `TriggerClass`, `CheckDefinition`,
  `CheckObservation`, `CheckObservationFailure`, `CheckObservationPass`.
- `github/check-observations.ts` implements it; `gitlab` returns `not-supported`
  (an empty roster would render "0 of 0 observed" and go green — worse than an error).
- **The future author/verifier producer is an INTERFACE ONLY.** Interfaces are free,
  a class must be earned; a stub emitting invented attestations would be exactly the
  vacuity this surface refuses.

**Core — `src/Core.TypeScript/drift-dashboard/`.** Pure fold over
(roster, observations, failures, `now`). It imports types from the plugin contract and
nothing else — no adapter, no registry, no `gh`. `--offline` runs the whole pipeline
with NO producer present.

**DV2.0 partition:** hub = CheckId + Verdict + Expectation (stable, substrate-independent);
satellite = `sourceDetail` (run id, url, conclusion string — carried for humans, never
folded on).

## Unknown is first-class, and mechanical

Aaron 2026-08-22: *"Unknown is a first-class verdict that can never aggregate into green
yes this would be Ideal, this is what most humans and AI are not good at keeping in
their head the unknowns they forgot about lol, so the more mechanical the better."*

- **Persisted roster** (`db/drift-dashboard/roster.json`, text, diffable). A check that
  stops reporting keeps its slot and keeps counting against coverage. A vanished check
  is marked `declaredNow: false` and does **not** shrink the denominator. Retirement is
  written by hand with a reason; no code path sets it.
- **Five unknown reasons, non-interchangeable:** `never-observed` ·
  `not-observed-this-pass` (today's bug wears this one's clothes) ·
  `registered-but-absent` · `expectation-unknown` · `source-error`.
- **Aged and ranked**: unknowns sort by longest silence first, never-observed sorting as
  infinite silence. "Not observed for 6 days" reads louder than "not observed since the
  last pass". An unknown displayed but not distinguished has not been surfaced.
- **Coverage is in the headline**, and any shortfall is red. Unknowns never count toward
  coverage, so `shortfall == unknown count` holds by construction.

## Expected-absent vs unexpectedly-absent

Derived from the substrate's own declaration, never assumed:

| declaration | silence means |
|---|---|
| `periodic` (a cron) | **RED** — it should have run |
| `on-change` (push to the ref) | unknown, ranked high |
| `on-demand` (PR / dispatch / workflow_run) | **correct** — `not-applicable`, and not called green |
| `unknown` (underivable) | unknown, loud — never defaulted to the convenient case |

Plus two red conditions a last-run-only model cannot see:
- **staleness** — a periodic check whose newest verdict is green but ancient did not run;
- **the declared trigger has NEVER fired** — `chart-version-refresh` declares
  `7 17 * * 0` and every run in its history is `event=pull_request`. The adapter asks
  the declared trigger directly (`?event=schedule`) rather than asking what ran last.

## First real pass

80-check roster: **RED 8 · UNKNOWN 4 · coverage 62/66 · green 56 · 14 on-demand.**
Found the four known reds, plus `tlaps-proof`, `gate`, `k8s-lane-partition`, and
`chart-version-refresh` (never-fired schedule). The 4 unknowns are all
`registered-but-absent`: active on the forge host, no file in the repository.

## Open (named, not implied)

1. **The cadence lane does not commit back.** `drift-dashboard-cadence.yml` fails the
   run and writes the dashboard to the job summary; refreshing the committed artifact
   needs the `heartbeat/*` park-and-flush path. Not built here.
2. **Not wired as a blocking gate.** Making it block is a workflow-enforcement policy
   call, the same class as 081M05E28P5087G0R003JAXC2W — left for Aaron.
3. **`chart-version-refresh`'s dead cron is reported, not fixed.**
4. **The 4 `registered-but-absent` workflows** are reported, not adjudicated.
