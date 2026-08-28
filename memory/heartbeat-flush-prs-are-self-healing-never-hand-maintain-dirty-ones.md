---
name: heartbeat-flush-prs-are-self-healing-never-hand-maintain-dirty-ones
description: Flush PRs self-heal ONLY when their head verdict is `dead`; an all-green head missing `gate (required)` deadlocks the lane forever and must be closed by hand.
metadata:
  type: project
---

Telemetry flush PRs (`heartbeat/*`) are usually self-healing — superseded every
~20 min — so hand-merging a DIRTY one is wasted work. **That is only true when
the head verdict is `dead`.**

`classifyHeadVerdict` (`src/Core.TypeScript/forge-host/github/flush-via-staging.ts`)
returns `dead` **only** when some completed check is in `TERMINAL_NON_SUCCESS`
(`failure|timed_out|cancelled|action_required|stale`). Everything else →
`under-test` → `chooseFlushRoute` returns `buffer`. There is no "green and done"
verdict.

**The deadlock** (measured 2026-08-28 on #15887 / #15891, stuck ~17h): the head
carried 7 check-runs, *all* `completed/success` (CodeQL Analyze ×5, submit-nuget
×2), but `gate.yml` never ran, so the required check `gate (required)` did not
exist. Nothing is terminal-non-success ⇒ `under-test` forever; the PR can never
merge because a required check is absent; the lane buffers behind it indefinitely.
`data/platform-drift.json` stayed pinned, `drift (loud)` red, heartbeat stale —
four surfaces, one cause.

**The tell:** PR has few check-runs, all success, and `gate (required)` ABSENT,
while `mergeable_state` is `dirty` or `blocked`. A *failed* gate is fine — that
classifies `dead` and self-supersedes.

**The fix that works:** close the PR. `findExistingPR` queries `state=open`, so
a closed PR makes the route `publish`; the next tick opens a fresh PR off current
main. The lane buffer (`heartbeat/<lane>-buffer`) is a disposable aggregate
rebuilt each tick, so closing loses no observations.

**Why:** believing "self-healing, don't touch" made me report this as "blocked on
a workflow-run approval" for hours of ticks without investigating. The belief was
right for the common case and silently wrong for this one.

**How to apply:** before calling a stuck flush PR self-healing, check the head
verdict the code actually computes — is any completed check terminal-non-success?
If not, it will never supersede. See
[[gh-pr-statuscheckrollup-under-reports-use-check-runs-api]] (the probe correctly
uses check-runs) and [[zero-failures-is-not-green-a-required-check-that-never-ran-shows-as-zero]],
which is this same defect one layer up.
