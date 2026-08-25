# Findings register — 2026-08-25

Fourteen defects surfaced in a single session. Recorded here because Aaron asked that
everything noticed be *fixed, routed, or at least tracked* — and because an untracked
finding is indistinguishable from one that was never found.

Status vocabulary is deliberate: **FIXED** means landed or in flight with a control;
**ROUTED** means an agent owns it and has not reported; **OPEN** means nobody owns it yet;
**NEEDS AARON** means it is a gated class (governance, or a decision that is not mine).

A finding that was *refuted* is listed too. Three of the day's leads were wrong, and a
register that only records the hits overstates its own accuracy.

## The through-line

Ten of the fourteen are the same shape: **an outcome decided by the wiring rather than by
the thing under test.** A check that cannot fail reads as a check that passed; a step that
cannot pass reads as a defect in whatever it points at. Both are invisible in a red/green
summary, which is exactly why they survive.

| # | Finding | Status | Where |
|---|---|---|---|
| 1 | Heartbeat flush: healthy backpressure reported as broken flush | FIXED | #15348 |
| 2 | Same defect on the `RC == 4` path — found by the audit, not by hand | FIXED | #15348 |
| 3 | Backpressure had no escape from an unmergeable blocker (deadlock) | FIXED | #15348 |
| 4 | 25 credential fallback chains blur three token roles | ROUTED | agent |
| 5 | Persona co-author trailers collide with real GitHub accounts | ROUTED | agent |
| 6 | DLA `D_f` hardcoded at 1.322 where the physics says ≈1.71 | ROUTED | Lumen |
| 7 | `AH003` drift-class collision (two checks, one id) | FIXED | #15348 |
| 8 | `Action-Mode: autonomous-tick` — invalid, and recurring in 5 commits | **NEEDS AARON** | below |
| 9 | AH002's `echo` exemption made its own green vacuous | FIXED | #13909 |
| 10 | `kubectl apply -f deploy/k8s/` applied the example secret | FIXED | #15347 |
| 11 | `agentic-organization`'s test suite runs in no workflow | OPEN | below |
| 12 | Four archive PRs failing gate on a stale base | OPEN | below |
| 13 | ~80% of gate runs on `main` cancelled | **NEEDS AARON** | below |
| 14 | #11501 is 3024 commits stale and no longer compiles | TRACKED | revive recipe on the PR |

## The three that need a decision rather than a fix

**#8 — `autonomous-tick` is not a legal `Action-Mode`.** The legal set is
`autonomous-fail-open | autonomous-fail-closed | human-directed | supervised`. It appears
in **5 commits**, which matters: the convention's own 2026-08-17 note says a coinage
arrived at independently, more than once, is *"evidence the vocabulary was missing a
distinction its users needed, not that its users were careless."* Both prior extensions
(`autonomous-fail-closed`, `operator-delegated`) were added on exactly that reasoning, and
both were **maintainer-authorized**. So this is not mine to add. Two honest options:
legalise it, or leave it illegal and catch it at commit time instead of at the gate — right
now the only thing that says no is a CI job, which is the slowest possible place to learn.

**#13 — the gate verdict drought.** Roughly 80 of 100 recent gate runs on `main` were
*cancelled*, not concluded. A cancelled run is neither pass nor fail; it is a check that did
not run. This has been confirmed independently five times across sessions and remains
unaddressed because the remedy is a merge-queue decision, which is a topology change.

**#11 / #12 — genuinely unowned.** The `agentic-organization` suite is invoked by no
workflow, so its tests constrain nothing (surfaced while validating the k8s manifests, and
named rather than silently widened into that PR's scope). The four archive PRs
(#15198, #15205, #15263, #15268) fail on a stale base; the merge-from-main pattern
that rescued PR #12175 today should apply, but it has not been tried on them.

## Refuted — recorded so the register does not overstate itself

- **"The arming step is a fossil with no writer."** Wrong. `merge-heartbeats-to-main.ts:124`
  emits `pr_number`. The bug was control flow reaching it, not its absence. Disproved by the
  audit's own script-following, against the person who wrote the audit.
- **"A stranger has commits in the repo."** No. Every author across 3000 commits is Aaron or
  dependabot; contributors and collaborators contain no stranger. The real defect is #5, at
  the display layer — a smaller problem than it looked, and still worth fixing.
- **"1,237 archive records are stranded."** Measured: 1,235 byte-identical, 3 genuinely
  stranded, and by the time it was checked those had landed too. The false count came from
  `git rev-parse origin/main:<path>` **echoing its argument** when the path is missing.

## Two process defects, which are the most transferable part of this

**A control run against already-fixed code proves nothing.** Both audits written today were
first run against a tree where the bug was gone. Both looked healthy. Only running them
against unfixed `main` showed one of them catching two real instances and the other
producing a false positive on a working workflow.

**An audit can be vacuous about itself.** While `audit-workflow-step-output-has-writer.ts`
was being written, a bad edit deleted a helper, every workflow threw, the `catch` swallowed
it, and it printed `OK — every reference has a writer` over 77 unchecked files. It now names
unreadable files and exits 2 when a scan finds zero references across a non-empty directory.
The general form: **a checker must be able to distinguish "I found nothing" from "I did not
look."**
