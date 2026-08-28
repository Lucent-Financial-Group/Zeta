---
name: feedback-matched-error-string-is-not-a-failure-check-status
description: "Otto's recurring self-error — treating a grep hit (or miss) as a CI verdict instead of reading the job conclusion; cuts both ways, and the false-GREEN direction is worse"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
  modified: 2026-08-10T06:00:00.000Z
---

**Twice in one session (2026-08-09) I reported a "finding" that did not exist**, both
times by the same mechanism: I grepped an error-shaped string out of a log and
treated the *match* as the verdict.

1. **The playwright phantom.** Local `tsc` emitted `TS2307: Cannot find module
   'playwright'`. I reported `lint (TS)` as red on `main` and asked Aaron to route it
   to the browser-node owner. **CI was green on that exact commit** — the module was
   declared in `package.json` *and* in `bun.lock`, just absent from my local
   `node_modules`. There was nothing for anyone to fix. (Kira independently made the
   identical error, from the identical local gap — so it is not a personal quirk, it
   is a trap in the workflow.)
2. **The aarch64 phantom.** I grepped `Timeout (1800s) waiting for "zeta-installer
   login:"` out of a run log and told Aaron aarch64 had timed out and might be a
   nix-ld regression. **Every aarch64 step concluded `success`**, in that run and
   every recent one. The line was intermediate output inside a step that passed.

3. **The inverse, same day, and the expensive one.** On PR #10270 I ran
   `gh pr checks 10270 | grep -iE '\bfail'`, got **no output**, and merged. `lint
   (markdownlint)` on that PR was `COMPLETED FAILURE` — it had correctly caught an MD012
   violation in a file the PR itself touched. The grep missed it because it scanned
   aggregate output whose columns do not line up the way the pattern assumed. **I then
   spent several ticks diagnosing the resulting red `main`, and proposed "fixing" the
   PR-scoped lint scoping — a deliberate priority-inversion control — to compensate for
   my own bad check.** The control worked; I overrode it and then blamed it.

**The rule — and note it cuts BOTH ways:**

> **A matched error string is not a failure. An unmatched one is not a pass.**
> **The status is the verdict.** Check the job/step `conclusion` (or the process exit
> code) *before* reporting — never infer a verdict from a grep hit **or from a grep
> miss**.

The false-negative direction is the more dangerous of the two: a phantom finding wastes a
reviewer's cycle, but a phantom *green* merges broken work and then sends you hunting for a
structural cause that does not exist.

**Why this specific error is expensive:** a phantom finding is worse than silence,
because it *looks* like diligence. It consumes a reviewer's cycle, can be routed to
an innocent owner, and — as with the wifi "invalid creds" chain — can send an entire
diagnosis down the wrong path. It is the exact failure mode described in
[[feedback-errors-should-teach-the-user-when-they-fail]]: the most expensive failures
are the ones that look like findings but aren't.

**How to apply:**

- Before reporting a CI finding **or a CI pass**: count explicitly, do not grep.
  `gh pr view <n> --json statusCheckRollup -q '[.statusCheckRollup[]|select(.conclusion=="FAILURE")]|length'`
  and the matching `IN_PROGRESS`/`QUEUED` count. Zero failures **and** zero pending is a
  pass; anything else is not, including `action_required`, which is neither.
- Before reporting a CI finding: `gh run view <id> --json jobs -q '.jobs[]|"\(.name):
  \(.conclusion)"'`. Job conclusion first, log grep second.
- Before reporting a *local* failure: check whether CI agrees. A local-only failure is
  an environment hypothesis, not a finding.
- Logs contain retry lines, intermediate failures, and error text from steps that
  ultimately pass. Treat log text as *evidence toward* a conclusion, never as the
  conclusion.
- When you do report, state which one you checked, so the reader can tell whether it
  is a status or a string.
