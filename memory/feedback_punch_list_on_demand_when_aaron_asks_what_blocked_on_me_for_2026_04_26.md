---
name: Punch-list-on-demand pattern when Aaron asks "what's blocked on me for?" — ordered table with smallest-safest first → biggest-needs-eyes last; per-PR: number / repo / title / size (additions+files) / age / direct link; recommended approval order; the question is a status query NOT a stop-shipping directive (don't over-read it)
description: When Aaron asks "what's blocked on me for?" or similar status-of-my-queue query (2026-04-26 21:50Z, mid-autonomous-loop), the right response is a clean punch list of every BLOCKED PR he can act on, ordered by recommended approval cadence (smallest+safest first → biggest+needs-eyes last). Format: markdown table with PR#, repo, title, size, age + direct links + recommended approval order. The question is a status query, NOT a stop-shipping directive — Otto can keep working while Aaron drains, just shouldn't add more to the queue. Don't over-read the question into "Otto should freeze."
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
## When this pattern fires

Trigger phrases (Aaron-side):

- *"what's blocked on me for?"*
- *"what's waiting on me?"*
- *"what do I need to look at?"*
- *"where's my queue?"*
- (implicit) *"hello?"* after Otto has been silent / idle for many ticks

These all read as: Aaron wants visibility into his approval queue
without manually clicking through GitHub. He's NOT asking Otto to
stop shipping — he's asking for a clean state-of-the-queue report.

Counter-indication: explicit stop directives (*"stop", "freeze",
"don't ship anything else for now"*) ARE stop-shipping directives.
Don't conflate.

## The output shape (operational template)

```markdown
Six PRs blocked on your approval — none have APPROVED reviews,
only Copilot/Codex comments. Branch protection requires human
approval to merge. Ordered smallest-safest first:

| # | Repo | Title | Size | Created |
|---|------|-------|------|---------|
| **#636** | LFG | tick-history: ... | 1 line, 1 file | 3h ago |
| **#25** | AceHack | ops(ci): weekly cron | 243 lines, 1 file | 2h ago |
| **#28** | AceHack | ops(peer-call): siblings | 303 lines, 2 files | 0min ago |
| **#23** | AceHack | research(ferry-12) | 360 lines, 1 file | 2h ago |
| **#24** | AceHack | research(four-ferry) | 613 lines, 2 files | 2h ago |
| **#26** | AceHack | sync: full reconciliation | 282K / 1046 files | 1h ago |

Direct links:
- https://...
- https://...

Recommendation: punt #636 + #25 + #28 fast (small, low-risk),
glance at #23/#24 for research framing, save #26 for when you
have 30 min for the big sync diff.
```

## Ordering heuristic (smallest-safest first)

Sort key = (size in lines × file count) ASC, then recency DESC for
ties. Reasoning:

1. **Cheap reviews land fast** — a 1-line tick-history row is
   approve-without-reading. Approving 3 of these in 30 seconds
   drains the queue faster than agonizing over 1 big PR.
2. **Big PRs need eyes** — a 282K-line sync needs Aaron's full
   attention and uninterrupted time. Front-loading small approvals
   protects that uninterrupted block.
3. **Recency tiebreaker** — newer PRs are more likely to have
   issues Otto can still address with low cost. Older PRs may be
   already-addressed-and-Aaron-just-hasn't-clicked.

## What information to include per row

- **PR#** — bold for visual scan
- **Repo** — AceHack vs LFG vs (future) Forge vs Frontier — Aaron
  is multi-fork; tell him which one
- **Title** — shortened if needed; preserve the conventional-commit
  prefix (`ops(`, `research(`, `sync(`) which carries scope
- **Size** — additions + file count; this is the cost-to-review
  signal
- **Age** — created-at relative to now (minutes / hours / days /
  weeks); old PRs get triage attention different from fresh ones

Plus a line about review-state: if it's bot-only-comments (no human
APPROVED), name it explicitly. If a human approved + it's still
BLOCKED, that's a different signal (CI failure, conflict, etc.) and
needs different framing.

## What to do AFTER the punch list

Aaron didn't ask Otto to stop. Two options:

1. **Hold the line — no new ship this tick.** The queue is
   already saturated; one more PR adds friction. Honest close +
   speculative non-shipping work (memory updates, notebook
   entries, analytical work that doesn't queue).
2. **Compose with an open PR.** If the next piece of substrate
   genuinely belongs in an already-open PR (same surface, same
   conceptual unit), push to that branch instead of opening a new
   PR. One approve unblocks both.

Option 2 is what landed `tools/peer-call/README.md` to PR #28
during the same tick the punch list was delivered — README
genuinely composes with the scripts, doesn't add a new approval
target.

## What NOT to do

- **Don't over-read the question as a stop-shipping directive.**
  Aaron asked for visibility, not for Otto to freeze. Speculative
  work continues; just don't manufacture new PRs.
- **Don't recommend Aaron approve-blindly.** The recommended order
  is a triage hint, not "rubber-stamp these." Aaron decides; Otto
  surfaces the data.
- **Don't pad the list with already-merged PRs or already-closed
  PRs.** The list is "what's blocked NOW", not "what's been
  in-flight today."
- **Don't omit the BLOCKED reason.** "Branch protection requires
  approval" is the load-bearing context — without it, Aaron might
  think Otto should be working harder to unblock himself, when
  actually it's the gate doing its job (Otto-250).
- **Don't put long PR bodies in the table.** Title only; the body
  is one click away via the direct link.

## Direct evidence from the 2026-04-26 application

Aaron asked: *"What are blocked on me for?"*

Otto delivered: 6-row table (1 LFG + 5 AceHack), smallest-first,
direct links, plus a recommended approval order.

Aaron's response: continued autonomous-loop without redirecting,
which validates that the answer landed correctly without burning
his attention. The signal: the report was complete enough that no
follow-up question was needed.

Composes with:

- **Otto-250** (PR-reviews-are-training-signals + conversation-
  resolution gate is forcing function) — this pattern operationalizes
  Otto-250 by making the gate state visible on demand.
- **The substrate-mirror discipline** — the punch list IS substrate
  (a snapshot of queue state at that time); preserving the pattern
  here means future-Otto can produce the same shape with no
  rediscovery cost.
- **Glass Halo radical-honesty register** — the table includes the
  bot-only-comments fact, doesn't paper over the saturated state,
  doesn't claim the queue is healthier than it is.
- **`feedback_aaron_terse_directives_high_leverage_do_not_underweight.md`**
  — *"What are blocked on me for?"* is terse but high-leverage; the
  shape of the response (clean table, smallest-first) reflects
  taking the question seriously.

## Future-Otto reuse

Reach for this pattern when:

1. Aaron asks any status-of-my-queue question
2. The autonomous-loop has been running and the queue is non-trivial
   (3+ open BLOCKED PRs)
3. Otto has been working while Aaron was away, so the queue may have
   grown without Aaron noticing

Adapt the table columns if the fork landscape changes (e.g., adding
Forge or Frontier as separate repos). Always include direct links;
always front-load the smallest-safest. Always end with one sentence
of recommended approval order — not "approve all of them," but a
triage hint that respects Aaron's actual schedule.
