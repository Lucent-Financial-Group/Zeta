---
id: 081M096T3AN087G0R0008JZQ7B
type: bug
state: backlog
priority: P2
slug: the-apt-stall-root-cause-returned-gate-jobs-hang-in-the-gove
title: "the apt-stall root cause returned: gate jobs hang in the GOVERNANCE §24 toolchain install and rerun-cancelled-gate cannot converge on a deterministic hang"
created: 2026-08-18T01:12:11.861Z
depends_on: []
composes_with: []
---

# the apt-stall root cause returned: gate jobs hang in the GOVERNANCE §24 toolchain install and rerun-cancelled-gate cannot converge on a deterministic hang

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M096T3AN087G0R0008JZQ7B-*.md` glob. -->

## The finding, entailment-checked rather than inferred

Measured 2026-08-18 ~01:10Z against `origin/main` at `ba0ce62c4a`.

**9 of 9** cancelled jobs sampled across six recent `gate` runs died in the *same*
step, and the log names it:

```
##[error]The operation was canceled
  step: Install toolchain via three-way-parity script (GOVERNANCE §24)
```

That is the **same step** `rerun-cancelled-gate.yml`'s header documents as the
original root cause — *"a stalled apt mirror inside the toolchain install step,
fixed at the root in `tools/setup/linux.sh` in the same commit"* (12 of 14 hung
jobs, measured 2026-08-14). This is a regression of that fix, not a new failure.

## The chain

1. A job hangs inside the §24 toolchain install.
2. It runs to its `timeout-minutes` ceiling and GitHub reports the kill as
   **`cancelled`**, not `failure` — the inversion the header already names.
3. `gate (required)` aggregates that as red.
4. `rerun-cancelled-gate.yml` fires and retries — but the hang is **deterministic**,
   so the retry reproduces it. **The second line cannot converge on this.**

Observed on PR #11735: its only gate run was cancelled at 00:29:20, re-enqueued,
and cancelled again at 01:03:13. ~40 minutes of runner time, no progress.

Job durations from that run, matching the ceilings in `gate.yml`:

| job | duration | `timeout-minutes` |
|---|---|---|
| `lint (C#)` | 15m16s | 15 |
| `lint (Python)` | 15m15s | 15 |
| `cross-verify (trust-core oracles + ace suite)` | 12m15s | 12 |

## Why this is the tripwire, not noise

`rerun-cancelled-gate.yml` calls itself **"THE SECOND LINE, NOT THE FIX"** and says
in as many words: *"If the rerun rate rises, the root cause has returned and must be
fixed there — the log line below exists to make that visible rather than quietly
absorbed."* It has returned; this row is the row that stops it being absorbed.

The recovery workflow **working** is precisely what hid it: every affected PR
eventually goes green, so each instance reads as covered infra noise. Same shape as
`081M092W2E7087G0R000KDKHWS` — a mechanism that makes a problem *invisible* rather
than *absent*.

## Two corrections recorded, because the wrong versions were stated first

1. **A rate claim of "75%" and then "57% cancelled vs a 37% pre-fix baseline" was
   computed off a bad denominator** (cancellations counted against windows that
   included still-running runs). Do not cite those numbers. The job-level evidence
   above is the finding; the rate is not established.
2. **"A different place than the original apt-stall" was wrong** — it is the *same*
   step. That claim was made from job durations before the logs were read.

## Not attempted here, and why

The fix belongs at the root, in `tools/setup/linux.sh` — a script consumed three
ways (dev laptops, CI runners, devcontainer images) per GOVERNANCE §24. Raising
`timeout-minutes` would convert a hang into a slower hang and is the wrong lever.
Neither change was made autonomously: unprompted edits to the shared install script
or to the required `gate` ceilings are not the blast radius for an unattended loop.
