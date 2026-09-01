---
id: 081M1EKTVH7087G0R002XC3GCW
type: bug
state: backlog
priority: P2
slug: pr-archive-flush-lane-deadlocks-its-gate-runs-are-action-req
title: "PR-archive flush lane deadlocks: its gate runs are action_required, so gate (required) never publishes"
created: 2026-09-01T13:51:42.119Z
depends_on: []
composes_with: []
---

# PR-archive flush lane deadlocks: its gate runs are action_required, so gate (required) never publishes

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1EKTVH7087G0R002XC3GCW-*.md` glob. -->

## MEASURED 2026-09-01

`pr-gate-presence` (a scheduled check, not a PR check) refused on main:

> `required-check-started: no LIVE gate.yml run for #16228` (either none was created,
> or every run finished without publishing it) — `gate (required)` can never report on
> it. **Note that a bare `gh pr checks` reads this as green; `--required` does not.**

That parenthetical is the whole hazard: the deadlocked PR looks fine to the ordinary
command.

### Root cause

The gate run for #16228's head is `completed/action_required` with **0 jobs**. It was
created and never executed, so no job ever published `gate (required)`. Auto-merge is
armed against a check that cannot arrive.

### It is systemic, not a one-off

Of the last 60 `gate.yml` runs, **7 are `action_required`, and every one is
`heartbeat/pr-archive`**, all with `actor=github-actions[bot]`:

```
09-01T08:50  heartbeat/pr-archive  actor=github-actions[bot]
09-01T08:00  heartbeat/pr-archive  actor=github-actions[bot]
09-01T07:16  heartbeat/pr-archive  actor=github-actions[bot]
09-01T06:33  heartbeat/pr-archive  actor=github-actions[bot]
09-01T05:51  heartbeat/pr-archive  actor=github-actions[bot]
09-01T05:06  heartbeat/pr-archive  actor=github-actions[bot]
```

Roughly every 45 minutes the lane retries and deadlocks the same way. The branch is
same-repo (`from_fork=false`), PR author `AceHack`. No other branch in the window is
affected, so this is specific to runs a `github-actions[bot]` credential triggers.

### Why this one matters more than a stuck PR

The maintainer's stated position (2026-09-01): *"the pr responses and fixes are the
high quality data"* and *"pr archive is some of our most valuable data when it has
comments and corrections"*. This is the lane that lands exactly that. Nothing is lost
today — the content sits on the branch — but it is not landing, and the failure is
silent to `gh pr checks`.

### Options, none taken

1. **Approve each run** — `POST /actions/runs/{id}/approve`. Unblocks one PR, does not
   fix the next one 45 minutes later, and workflow approval is a security gate whose
   whole purpose is that a human decides.
2. **Change the workflow-approval setting** for this repo/actor. Maintainer-scoped,
   and it relaxes a security control, so it wants a deliberate decision rather than an
   agent's convenience.
3. **Give the flush lane a credential whose runs execute** (an app token or PAT rather
   than `GITHUB_TOKEN`). Most durable; also the largest change, and it interacts with
   `credential-role-separation`.

**Deliberately not acted on.** Every option either relaxes a security gate or spends a
credential decision, and both are the maintainer's call. What an agent can do is what
this row does: name it, measure it, and stop.

### Related

- `docs/backlog/.../081M1DDQ4G0087G0R002SCRFHA` — PR-archive backfill for #16141–#16210,
  held pending the repo split. That backlog only grows while this lane is deadlocked.
- The heartbeat-flush self-heal note: a flush PR with an all-green head and
  `gate (required)` ABSENT never supersedes, and must be closed by hand. This row is the
  ROOT CAUSE of that symptom rather than another instance of it.
