---
id: 081M1DDQ4G0087G0R002SCRFHA
type: task
state: backlog
priority: P1
slug: backfill-the-pr-review-archive-for-16141-16210-size-it-again
title: "Backfill the PR review archive for #16141-#16210 — size it against the growth budget first"
created: 2026-09-01T02:45:34.336Z
depends_on: []
composes_with: []
---

# Backfill the PR review archive for #16141-#16210 — size it against the growth budget first

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1DDQ4G0087G0R002SCRFHA-*.md` glob. -->

## What is missing, and why

`pr-archive-on-merge` was disabled 2026-08-31 as part of stopping telemetry and
heartbeat growth. **It is not telemetry** — it fires on `pull_request: [closed]`
and only for merges. It got swept up with the cadence lanes and nothing noticed
for a day.

Consequence: the review archive stops at **#16140** (last run 2026-08-29T06:53).
Everything merged since — roughly **#16141 → #16210**, including fourteen PRs
merged on 2026-08-31 — has no archive entry. The workflow is close-triggered, so
it will **never** retroactively fire for them.

Aaron 2026-08-31, twice: *"pr archive is some of our most valuable data when it
has comments and corrections, the comments and corrections are the important
training data."* The prose of a PR is the reviewable artifact; the diff is
already in git. What is lost here is the argument, not the code.

Re-enabled 2026-09-01 (`pull_request: [closed]` only, no `schedule:`), so the
ongoing loss has stopped. This item is only about the gap.

## The criterion is DATA QUALITY, not size — size is the tiebreak

Aaron 2026-09-01, correcting the size argument this section originally led with:

> *"we don't want the telemetery for now, this is low qality training data, the
> pr responses and fixes are the high quality data"*

The bytes argument below is true and it is the WEAK one, because it concedes that
the deciding variable is volume. The ordering is by **information quality**:

| data | quality | why |
|---|---|---|
| heartbeat / tick / drift / metrics telemetry | **low** | machine-generated, repetitive; a tick reporting "nothing changed" carries no signal per byte |
| PR comments, review threads, corrections | **high** | human+AI reasoning over a real decision, with the wrong answer AND its correction both preserved |

**The diff is already in git.** What the archive uniquely holds is the *argument*
— what was proposed and rejected, where someone was wrong and got corrected. That
is the part no other surface can reconstruct.

Which makes the 2026-08-31 sweep exactly backwards: it removed the
highest-quality surface while the low-quality ones were the actual target. Not a
sizing error — a **sorting** error.

## The growth arithmetic, MEASURED — the tiebreak, not the reason

Aaron's standing constraint: *"we are trying to avoid unbounded growth on the
repo until we split it out into multi repo."* So the cost is priced before the
work is proposed, not after.

    docs/github/prs (shards)      13,592 files    60 MB
    docs/history/pr-reviews       13,593 files    87 MB
    ------------------------------------------------------
    ~147 MB over ~13,593 PRs   ->  ~11 KB per PR

**Backfilling ~70 PRs costs roughly 770 KB.** Against a 147 MB existing archive
and a repo measured at 101.7 MiB of growth in a single 24h window (98.5% of it
telemetry, 2026-08-31), this is ~0.5% of one day's telemetry. The PR archive was
never the growth driver and should not be treated as one — that framing is what
got it disabled.

Ongoing cost is the same ~11 KB per merged PR, which at a heavy day of ~14 merges
is ~154 KB/day. Bounded by merge rate, not by a cron.

## The work

1. Read closed+merged PRs #16141–#16210 from the REST API (`gh api
   repos/{owner}/{repo}/pulls/{n}` + `/comments` + `/reviews`).
2. Write the SAME shard format the live workflow writes — reuse its writer, do
   not reimplement the format. A backfill that produces subtly different shards
   is worse than none: it makes the archive inconsistent in a way no reader
   expects.
3. Idempotent by PR number, so a re-run repairs rather than duplicates.
4. Verify: the highest archived PR number rises to 16210 and shard count grows by
   the number of PRs actually backfilled — assert BOTH, since a writer that
   silently skips would satisfy the first alone.

## Falsifier

A test that fails when a merged PR in the range has no shard. It must run against
a fixture rather than the live API — an audit whose data source can 404 fails
open, which is the vacuity class.

## Do NOT do this before

The repo split is the standing plan for where bulk archives live. If the split
lands first, backfill INTO the archive repo instead — the numbers above say the
cost is small either way, so this is a placement decision rather than a cost one,
and placing it wrong is harder to undo than doing it late.

## Pointers

- `.github/workflows/pr-archive-on-merge.yml` — the live writer; the format is its shard output
- `docs/github/prs/shards/` · `docs/history/pr-reviews/` — the two surfaces
- Four sibling workflows remain disabled and are NOT clean re-enables: `pr-manifest-integrity`,
  `lockfile-healer`, `proof-closure-drift`, `archive-strand-alarm` — every one carries a
  `schedule:` cron, so re-enabling means dropping the cron and keeping the event trigger.
