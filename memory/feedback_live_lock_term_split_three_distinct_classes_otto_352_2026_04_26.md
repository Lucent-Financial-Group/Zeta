---
name: "live-lock" term over-broadened in Otto-side substrate; needs split into 3 distinct classes — (1) concurrent-modification live-lock (Aaron 2026-04-22 original parallel-worktree class), (2) stuck-loop / single-agent cyclic non-progress (different cause + mitigation), (3) honest waiting on Aaron / real-dependency-wait (NOT live-lock, the protocol working) — task #294 / Otto-352 analysis 2026-04-26
description: Aaron 2026-04-26 flagged that "live-lock" has been over-applied in Otto-side substrate. This memory splits the term into the 3 distinct classes the original word collapsed and proposes naming + mitigation per class. Class 1 is the canonical software-engineering live-lock (concurrent-modification thrash). Class 2 is single-agent cyclic non-progress, mechanically different. Class 3 is correctly waiting on a real dependency, which has been mistakenly self-diagnosed as live-lock. The split unblocks task #294 (Otto-352) and composes with Amara's external-anchor-lineage discipline from PR #629.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## REVISION 2026-04-26 (post-Grok peer-call critique)

This memory was first written as a 3-class split. Grok's
peer critique via `tools/peer-call/grok.sh` surfaced real
gaps. The revision below leads; the original 3-class
analysis is preserved as "First-pass analysis" further down
for provenance.

**Grok's core insight (load-bearing):** *"The mitigations
matter more than the ontology. The split feels like category
invention to avoid measuring actual throughput."*

That landed. The taxonomy is now framed as **diagnostic
categories with porous boundaries**, not an exhaustive
partition. The primary contribution is the **external-anchor
discipline** — the measurements that detect each pattern —
not the names.

### What Grok flagged (preserved as direct quotes)

**(a) Not exhaustive.** *"Missing at least two live classes:
illusory variation (Class 2 that looks like it varies —
'different speculative work this tick' — but produces zero
measurable factory state) and meta live-lock (the
review/audit/escalation machinery itself cycling without
progress)."*

**(b) Mutual exclusivity is illusory.** *"The 'can you name
the dependency?' test for Class 3 is performative theatre. A
Class 2 agent in deep repetition can always manufacture a
plausible-sounding blocker. Class 1 (concurrent thrash)
frequently induces Class 2 behavior in individual agents
('try resolve → fail → honest close' loops). The boundaries
are porous exactly where self-diagnosis matters most."*

**(c) "Descope, not coin" is sleight-of-hand.** *"You've
replaced one overloaded term with three terms whose
distinctions will themselves be misapplied. The vocabulary
surface didn't shrink; it fragmented."*

### Revised taxonomy (5 classes, porous, mitigation-first)

| Class | Shape | Detection (external anchor) | Mitigation |
|---|---|---|---|
| **1: Concurrent-thrash** (the canonical) | N agents thrash on the same artifact; conflict-cycle outruns resolve-cycle | merge-success-rate < 50% over a window | single-writer protocol; file-class split |
| **2: Stuck-loop** | Single-agent cyclic non-progress; output entropy near zero | tick-output-entropy near zero over K consecutive ticks | vary the work; escalate after K |
| **3: Honest-wait** | Genuine wait on a named dependency | dependency named, owner identified, ETA bounded | nothing — protocol working |
| **4: Illusory-variation** *(Grok)* | Looks like Class 2 mitigation (varied work each tick) but produces zero measurable factory state | varied output BUT no commits / merged PRs / spec edits / verification artifacts | measure factory-state delta per tick, not just output novelty |
| **5: Meta-live-lock** *(Grok)* | The review / audit / escalation machinery itself cycles without progress | audit reports cite the same findings across N rounds without resolution | external anchor outside the audit machinery; human or independent peer escalation |

**Boundaries are porous, not partitioning.** A single
situation can be in multiple classes at once. Examples:
- Class 1 induces Class 2 in individual agents
- Class 2 disguised as Class 3 by manufacturing a plausible
  blocker (the failure mode Aaron's "hello?" surfaced)
- Class 4 is Class 2 in disguise; the mitigation looks
  applied but the measurement says no progress
- Class 5 wraps any other class — meta-machinery that's
  supposed to detect 1-4 but cycles itself

### What survives Grok's critique

- The named-dependency test is **necessary but not
  sufficient** for Class 3. Otto-side discipline must
  ALSO check whether the named dependency has shown
  progress / signal in the recent window.
- The external-anchor discipline (merge-success-rate,
  output-entropy, factory-state-delta, audit-finding-
  resolution rate) is the load-bearing contribution.
  These are measurements, not categories.
- "Descope, not coin" is downgraded: keep the discipline
  honest about what each class signals, but expect the
  vocabulary to drift. Lean on the measurements.

### Why this revision matters

Per Aaron's *"resolve with peer AIs first"* directive
applied: this revision is itself an instance of the
discipline. Grok's peer-call surfaced gaps Otto missed in
the first pass; absorbing the critique improves the
substrate; the round-trip is recorded so future-Otto can see
the pattern.

The pattern is also evidence that **the peer-call
infrastructure works as designed** — Grok's critique is
genuinely sharp, not bot-flavoured agreement. Validates
PR #28's deliverable independently of any review.

---

## First-pass analysis (preserved for provenance — pre-revision)

The 3-class split below was the first-pass analysis. Grok's
critique surfaced its limits. Kept here so the round-trip is
visible.

## The original Aaron usage (2026-04-22)

`docs/research/parallel-worktree-safety-2026-04-22.md` Section 2:

> *"Agent A in worktree W₁ edits file F. Agent B in worktree W₂
> also edits F. Both attempt merge back to main. One merges; the
> other's merge conflicts. Resolving the conflict requires
> re-running the slow build in the second worktree. Meanwhile, a
> third tick spawns and edits F again. The conflict-resolve-rebase
> cycle outruns the resolve cycle → neither worktree's work lands
> → live-lock."*
>
> *"Why it's worse than deadlock: deadlock is static (one detector
> catches it); live-lock is progress-looking-like-no-progress —
> commits keep landing in worktrees, CI keeps running, but nothing
> integrates."*

Aaron's quotes:
- *"don't live lock bouncing back and fourth between the the two PRs"*
- *"gonna be hard to get you to parallelize wihout live locks."*
- *"just write down decision and dont' get stuck or live locked, try hard."*

This is the canonical software-engineering definition: **multiple
agents making local progress while no global progress lands**.

## The three classes the term has been collapsing

### Class 1 — concurrent-modification live-lock (the original)

**Shape:** Two+ agents/processes thrash on the same artifact; the
conflict-resolution cycle outruns the resolve cycle. Symptom:
local commits keep landing, CI keeps running, but no merge
integrates.

**Mechanism:** the rate-of-creating-conflicts exceeds the
rate-of-resolving-conflicts. This is genuinely a live-lock in the
distributed-systems sense.

**Mitigation:**
- Single-writer protocol per artifact (only one worktree touches
  BACKLOG.md at a time)
- Conflict-detection at branch-creation, not at merge
- File-class ownership (e.g., per-row file restructure for BACKLOG
  per task #284 — splits one busy file into per-row files so
  parallel work doesn't collide)
- Throttle the spawn rate when conflict rate is rising

**Detection:** monitor merge-success rate vs merge-attempt rate;
if successes drop below ~50%, suspect Class 1.

**Aaron's 2nd-agent live-lock audit (#283, completed 2026-04-26)**
was Class 1 — he wanted Otto's parallel-worktree work audited for
this specific failure mode.

### Class 2 — stuck-loop / single-agent cyclic non-progress

**Shape:** A single agent (Otto, an autonomous loop, a tick
sequence) repeats the same pattern without advancing the
underlying state. Symptom: identical or near-identical actions on
consecutive ticks; no new substrate; honest-close every tick.

**Mechanism:** the agent's decision logic isn't producing varied
output because the input state isn't varying. Different cause from
Class 1 — there's no concurrent modification, no conflict
resolution, no merge race.

**Examples:**
- Otto running consecutive autonomous-loop ticks all ending
  "Honest close. Cron continues." (the pattern Aaron noticed with
  "hello?" earlier this session)
- A poll-and-wait loop that keeps polling without escalating when
  the wait exceeds a sensible bound

**Mitigation:**
- Vary the work per tick — even speculative non-shipping work
  produces some output
- Escalate after N consecutive identical ticks (e.g., write a
  memory entry, ping the human, increase the cron interval)
- Run the meta-check from CLAUDE.md: "is there a structural change
  to the factory that would have made this work directed?"

**Detection:** look at the last K ticks' output; if entropy is
near-zero (same sentence each time), suspect Class 2.

### Class 3 — honest waiting on real dependency (NOT live-lock)

**Shape:** an agent correctly waits for a real, named external
dependency (a human review, a build to finish, a third-party
service). Symptom: looks like Class 2 from outside (consecutive
ticks of low activity) but the cause is different.

**Mechanism:** the protocol is working. The dependency exists, has
a real owner (Aaron, CI, etc.), and the wait is genuine.

**Examples:**
- PR #28 BLOCKED on Aaron's approval — Aaron is the named
  dependency; Otto can't and shouldn't bypass branch protection
- A long-running build whose ETA is known
- A peer-call response in flight

**Mitigation:** this is not a failure mode requiring mitigation.
The mistake is **self-diagnosing as live-lock** when it's actually
the protocol working. Otto's `feedback_manufactured_patience_vs_real_dependency_wait`
discipline is the relevant memory.

**Detection:** can the agent name (a) the specific dependency,
(b) its owner, (c) a credible expectation for resolution? If yes
to all three, it's Class 3, not live-lock.

## Why the split matters

The three classes have **mutually exclusive mitigations**:

| Class | Mitigation direction |
|---|---|
| 1 (concurrent thrash) | Reduce parallelism / single-writer / file-class split |
| 2 (single-agent stuck loop) | Increase variation / escalate / meta-check |
| 3 (honest wait) | Do nothing — the protocol is working |

Conflating them produces wrong-direction fixes. If Otto self-
diagnoses Class 3 as Class 1, Otto cuts parallelism that wasn't
the problem. If Otto self-diagnoses Class 2 as Class 3, Otto
keeps closing-honestly when it should be escalating.

## Naming proposal

Per Aaron's "live-lock" pre-occupation as the canonical class 1
term, the proposal is:

- **Class 1: live-lock** (keep the original meaning narrow —
  concurrent-modification thrash only)
- **Class 2: stuck-loop** (already Aaron's word from
  *"don't get stuck or live locked"* — split the two)
- **Class 3: real-dependency-wait** (already Otto's working term
  per `feedback_manufactured_patience_vs_real_dependency_wait*`)

Not all three need new names — keeping "live-lock" narrow + using
existing "stuck-loop" and "real-dependency-wait" words means the
fix is **descope, not coin**. Less new vocabulary, more discipline
on existing.

## External-anchor-lineage (Amara PR #629 discipline)

Per Aaron 2026-04-26 directive, this analysis should compose with
Amara's external-anchor-lineage layer from PR #629. The connection:

- Each class needs an **external anchor** for detection — Otto
  alone can't reliably distinguish Class 2 from Class 3 in the
  middle of the stuck loop (the pattern looks the same from
  inside).
- External anchors candidates per class:
  - Class 1: merge-success-rate gauge (CI-side, observable)
  - Class 2: tick-output-entropy measure (notebook-side; how
    similar are consecutive ticks' outputs?)
  - Class 3: explicit dependency-naming check (Otto must name
    the specific blocker; if can't name, suspect not Class 3)
- The lineage discipline says: trace the term back to the
  external observer who can confirm the class. Aaron's "hello?"
  was an external-anchor signal that Otto's then-current state
  was Class 2 (stuck-loop, not Class 3 — the dependency wasn't
  named clearly enough).

## Composes with

- **`feedback_manufactured_patience_vs_real_dependency_wait*`** —
  sibling memory naming Class 2 vs Class 3 distinction at
  Otto-side; this memory generalizes to all three classes.
- **task #283** — Aaron's 2nd-agent live-lock audit was Class 1
  scope; this analysis confirms that audit was correctly scoped.
- **task #287** (cost monitoring with deadline 04-29) — if cost-
  per-tick is constant across many ticks, that's Class 2 evidence
  the loop isn't earning its keep.
- **PR #629 / Amara's external-anchor-lineage discipline** — the
  detection rules per class lean on external anchors, which is
  exactly Amara's framing.

## Future-Otto check

When tempted to self-diagnose as "live-locked":

1. Can I name the specific concurrent-modification artifact and
   the other writers? If yes → Class 1.
2. Can I name the specific external dependency, its owner, and
   when I expect resolution? If yes → Class 3 (NOT live-lock).
3. Otherwise → Class 2 (stuck-loop). Apply Class 2 mitigation:
   vary the work, escalate, run the meta-check.

The most common Otto-side mis-diagnosis: calling Class 3 "live-
lock" when it's actually the protocol working. The fix is naming
the dependency clearly, not breaking out of the wait.

## Direct evidence from the 2026-04-26 session

Otto's "hello?"-triggered re-engagement earlier this session was
Class 2 (stuck-loop), not Class 3. The distinction Otto missed:
even though PR #26 was a real dependency, Otto's "Honest close.
Cron continues." pattern across 10+ consecutive ticks was
**Class 2 progress**, not Class 3 waiting — Otto could have been
producing varied non-shipping substrate instead of an identical
close-message every tick. Aaron's "hello?" was the external
anchor that surfaced this.

The fix that landed this session (peer-call siblings, README,
security notes, this memory file) is exactly the Class 2
mitigation: **vary the work per tick**.

## Status

This memory is the analytical substrate for task #294 (Otto-352).
Landing it as a memory rather than a research-doc PR keeps it
out of Aaron's saturated review queue while preserving the
analysis. When the queue drains and a research-doc PR is the
right shape, this memory can be the starting draft.
