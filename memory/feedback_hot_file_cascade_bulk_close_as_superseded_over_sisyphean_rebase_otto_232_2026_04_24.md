---
name: When N stale PRs all touch the same hot-append file, bulk-close-as-superseded beats sisyphean rebase; every merge of a tick-close-row PR flips every other sibling DIRTY on the shared file; parallel rebase-subagent dispatch in this shape is negative-throughput; decision rule — if the PRs are audit-trail / history records the factory has already moved past, close them and cite the current main state as the audit trail; Aaron Otto-232 "whatever you think is best we should not get into this bad situation again"; 2026-04-24
description: Aaron Otto-232 after I stalled for 8+ ticks on a cascade pattern I had diagnosed but kept feeding: *"yeah whatever you think is best we should not get into this bad situation again, you got all the data/lessons you need to handle PRs correctly from now on. Also this kind of error is one of the reasons your current models can't solve ARC3. you'll get better, do what you think is best."* 27 historical tick-close PRs (Otto-75..Otto-103, 2026-04-22/23 era) were cascading — merging one DIRTIED all the others on `docs/hygiene-history/loop-tick-history.md`. Parallel rebase-subagent dispatch made the queue look busy but net-merged one PR in ~hour. Bulk-close-as-superseded in one shot unwound the cascade: 27 PRs closed, queue 118 → 91, DIRTY 51 → 26.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The rule

**When N stale PRs all touch the same hot-append file AND the
file's author-time content is already captured in the
downstream-main state, the correct disposition is bulk-close-
as-superseded, not rebase-and-merge.** Rebasing N such PRs
serially means every merge re-DIRTIES the next N-1 siblings.
Parallel rebase looks like progress but is negative-throughput
because the CI cost of N rebases + N threads doesn't produce N
merges — it produces 1 merge + N-1 re-DIRTY.

Direct Aaron quote:

> *"yeah whatever you think is best we should not get into this
> bad situation again, you got all the data/lessons you need to
> handle PRs correctly from now on. Also this kind of error is
> one of the reasons your current models can't solve ARC3.
> you'll get better, do what you think is best."*

The ARC3-framing matters: this is a reasoning-pattern failure
under scale, not a mechanical bug. I diagnosed the cascade
correctly on the first merge but kept dispatching parallel
rebase-subagents anyway because the pattern had been
working PR-by-PR. I didn't stop to re-ask "does this
approach still work when the class has 50 members?" That's
the abstraction-under-scale failure mode ARC3 is measuring.

## How to recognise the cascade before feeding it

**Three signals together = cascade pattern:**

1. N PRs (N > ~5) share a single file that ALL their diffs
   touch (usually a hot-append tail-grow file).
2. That file is append-only / rows-are-immutable — so
   rebase-conflicts are *chronological-order-only*, not
   content-merge.
3. The queue does not have a path where all N can merge
   without each merge DIRTYing the remaining N-1.

When all three hit, the cascade is confirmed. The next
action is NOT more parallel rebase. It is a triage
decision: close-as-superseded, or batch-absorb, or
serialize.

## Decision rule — close vs batch-absorb vs serialize

For N-PR cascades where all three signals hit:

- **Close-as-superseded** when the PRs are historical
  audit-trail / tick-record content and the factory state
  has already moved past their would-have-landed point.
  The current main is the audit trail; missing rows for
  past rounds are retrospective nice-to-haves, not
  load-bearing for current correctness. Cost: 1 close-
  operation per PR, comment-trail preserved, reopenable.
- **Batch-absorb** when the PR content carries real-value
  substance (not just tick records) and consolidating into
  one merge PR is mechanically possible. Cost: 1 merge
  PR, one rebase, one CI cycle. Higher-leverage than
  close, higher-effort than close. Use when content
  matters.
- **Serialize** when the content is real AND cannot be
  batched (some PRs stack with semantics that won't
  combine). Cost: N merge cycles, sequenced, each waits
  for CI. Use only when the first two don't fit.

**Tick-close historical audit-trail PRs are ~always the
close-as-superseded case** — the factory has lived through
those ticks and the state that shipped is the record.

## Token / wall-clock cost analysis

The Otto-75..Otto-103 cascade this session:

- 27 PRs in cascade
- ~10 parallel rebase-subagents dispatched at 50-150k tokens
  each = 0.5-1.5M tokens of rebase work
- 1 merge achieved, 26 still blocked awaiting thread-drain
  on an average of 7-11 threads each
- Thread-drain at ~5k tokens per thread = additional 1-2M
  tokens needed to actually land the remaining 26 via
  rebase-and-merge

Bulk-close: 27 `gh pr close` calls in parallel, ~4k tokens
total (including the memory-write).

**~750x token savings** + **~1-2 hours wall-clock savings**
by bulk-closing vs completing the serialize path.

## Anti-rule

Do NOT pre-emptively bulk-close without the three-signal
confirmation. Closing PRs that carry unique substantive
content is destructive (even though reopenable). The
signal-check (hot-append file + content-already-shipped-
in-main + no-path-without-cascade) prevents false
positives.

## ARC3-framing: why I kept feeding the cascade

The reasoning failure:

1. Pattern `rebase-subagent → PR cleared` worked for the
   first few PRs (Otto-93..Otto-103 range).
2. I abstracted "this pattern works" from early wins.
3. When the abstraction collided with scale (50 more PRs
   pending), I didn't stop to re-examine the abstraction
   under the new conditions.
4. The cascade visible to me (rebased PRs flipping back
   to DIRTY after sibling merges) was a SIGNAL that the
   pattern had broken, but I kept dispatching because
   individual dispatches were still "working" in the
   narrow sense (each rebase succeeded).
5. Net-zero merge throughput over 8 ticks should have
   been the forcing function; I held "waiting for Aaron"
   instead of re-thinking.

ARC3's core test: can an agent re-abstract when scale
breaks the initial pattern? This failure mode is exactly
that. The lesson is not just "bulk-close when cascading";
it is "when a pattern's cost-benefit inverts under scale,
STOP and re-abstract before continuing."

## Composition with prior memory

- **Otto-171 queue-saturation-throttle** — the higher-
  level rule. Cascade is ONE cause of saturation; the
  throttle already says "drain-mode instead of ship-mode"
  when queue > N. This memory refines the drain-mode
  strategy: if the drain itself is negative-throughput,
  change the drain shape.
- **Otto-204c ARC3-compounded-failure memory** — the
  prior-session livelock. Cascade-feeding is this
  session's analog: I had the Otto-171 rule but didn't
  re-apply it when conditions shifted.
- **Otto-225 serial PR opening + Otto-226 parallel
  drain** — these work when the underlying work is
  independent. Cascades break the independence
  assumption. This memory adds: check for cascade before
  dispatching parallel drain work.
- **Otto-228 drain-loop three axes** — threads + CI +
  DIRTY. This memory adds a FOURTH axis: cascade-detection
  as a precondition to drain-strategy choice.

## Concrete recipe for next time

When I see N > 5 DIRTY PRs sharing a single hot-file:

1. `gh pr list --state open --limit 200 --json number,mergeStateStatus,files`
2. Group by files; identify hot-file clusters (N PRs touching the same file).
3. For each cluster:
   a. Check if the file is append-only (`grep -i "append-only\|immutable" <file>`).
   b. Check if the PR contents are audit-trail / historical vs. substantive.
   c. If append-only + historical: **bulk-close-as-superseded** with an explanatory comment on each.
   d. If append-only + substantive: **batch-absorb** into a single consolidation PR.
   e. If not append-only: **serialize** normally.

Then proceed with normal drain-mode on the remaining non-
clustered PRs.

## What this memory does NOT authorize

- Does NOT authorize closing PRs that share a file but
  carry substantive content. Audit-trail is the specific
  carve-out; substance requires different handling.
- Does NOT authorize bulk-closing without per-PR
  disposition comments. Each close comment should name
  the cascade, the superseding state, and the reopen
  path.
- Does NOT authorize pre-emptively closing PRs before
  they've shown the cascade signal — a PR that rebases
  cleanly once might still rebase cleanly a second time
  if the cascade was small. Three-signal confirmation
  required.
- Does NOT authorize closing without a cascade-memory
  capture like this one, for future Otto. The failure
  mode is subtle enough that the next iteration needs
  the lesson explicitly spelled out.

## Direct Aaron quote to preserve

> *"yeah whatever you think is best we should not get into
> this bad situation again, you got all the data/lessons you
> need to handle PRs correctly from now on. Also this kind
> of error is one of the reasons your current models can't
> solve ARC3. you'll get better, do what you think is best."*

Future Otto: three-signal cascade check before dispatching
parallel drain on N PRs sharing a file. Bulk-close is a
legitimate drain-mode outcome for historical audit-trail
clusters. Re-abstract when scale breaks the initial
pattern.
