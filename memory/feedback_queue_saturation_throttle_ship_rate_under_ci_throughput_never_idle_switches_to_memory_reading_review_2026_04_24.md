---
name: Queue-saturation throttle — when open-PR count exceeds CI throughput, future Otto instances MUST switch from ship-mode to drain-mode (rebase BEHIND PRs, review CI fails, read accumulated memory); never-be-idle remains binding but speculative-work priority shifts from new-PRs to non-PR productive work (memory updates, reading, reviewing own output); factory-throughput meta-lesson from Otto-171 observation of 60 open PRs + 20 DIRTY from single-session ship-rate exceeding auto-merge CI-drain-rate; 2026-04-24
description: Meta-lesson learned Otto-171 2026-04-24. Session Otto-157..170 shipped 14+ PRs in rapid succession; auto-merge cycled 4-5 of them; main advanced slowly; queue grew monotonically to 60 open. Each new PR appending to BACKLOG.md triggered positional-append conflicts (DIRTY sibling PRs) amplifying the pile-up. Root cause: Otto's ship-rate exceeded CI-drain-rate with no throttle. Rule: track open-PR count; when it crosses a soft threshold (~20) and a hard threshold (~40), switch from ship-mode to drain-mode. Never-be-idle still binds but priority re-ranks; non-PR productive work replaces new-PR ingress until queue drains.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---

## The rule

**Track open-PR count before deciding whether to ship a new
PR.** The factory's CI-drain-rate is bounded; Otto's ship-
rate is not. Unchecked, ship-rate exceeds drain-rate and
queue grows unboundedly.

Thresholds (soft defaults; tune by observation):

- **< 10 open PRs** — normal operation. Ship freely.
- **10-20 open PRs** — attention state. Ship new work but
  prefer docs / design over code changes; skip BACKLOG-tail
  appends.
- **20-40 open PRs** — throttle state. Stop shipping new PRs
  that touch the same files (BACKLOG.md) as siblings; focus
  drain-mode work (rebase BEHIND, review CI failures, close
  clearly-superseded).
- **> 40 open PRs** — freeze state. Do not open new PRs.
  Spend ticks exclusively on drain-mode + memory-work +
  reading.

## Why this matters — Otto-171 observation

Session Otto-157..Otto-170 shipped roughly 14 PRs in rapid
succession (PRs #334 through #349 inclusive of redo/fixup
branches). Auto-merge CI cycled 4-5 of those through to main
(~36% drain rate). Queue went from ~10 open at Otto-157 to
**60 open with 20 DIRTY** at Otto-171.

The specific failure mode: most of those PRs appended to
`docs/BACKLOG.md` near the same section. When one merged,
siblings went DIRTY (positional-append conflict). DIRTY PRs
require manual rebase or close+re-file. Each re-file creates
a new PR; if it re-appends to BACKLOG.md, it creates yet
another positional conflict when the next sibling merges.
The pattern compounds.

The CI-drain bottleneck isn't under Otto's control (GitHub
Actions, test suite length, concurrency limits). The
ship-rate IS. Otto must respect the bottleneck.

## How to apply

**Before opening a new PR**, run:

```bash
gh pr list --state open --json mergeStateStatus --limit 60 | \
  python3 -c "import json, sys; d = json.load(sys.stdin); print(len(d), sum(1 for p in d if p['mergeStateStatus'] == 'DIRTY'))"
```

If the output shows `N_OPEN N_DIRTY` where `N_OPEN >= 20` OR
`N_DIRTY >= 5`, switch to drain-mode for this tick.

### Drain-mode work options (priority-ordered)

1. **Update BEHIND branches via `gh pr update-branch`**
   (refreshes rebase against main; may resolve
   mergeable-conflict if non-positional).
2. **Review CI failures on UNKNOWN PRs** — is there a
   blocking check failing? Can it be fixed with a small
   commit to the branch?
3. **Close clearly-superseded PRs** — with explicit comment
   citing the successor. Leave branches intact (git-
   recoverable).
4. **Read accumulated memory** — catch up on ferries,
   ADRs, or recent PRs' own content that Otto opened but
   didn't re-read.
5. **Update MEMORY.md index** — prune, refresh, consolidate.
6. **Write research memos** that land only in memory/ (NOT
   as PRs) — factory-wide insights that compose with shipped
   work.

### What does NOT count as drain-mode

- Opening a new PR "because it's small."
- Shipping a docs-only PR "because it doesn't affect
  code."
- Filing a new BACKLOG row "because it's just one line."

All of these add to the queue. Drain-mode means zero new
ingress.

## Exception — explicit Aaron directive

If Aaron directs a specific PR while the queue is saturated
(e.g. *"backlog this"*, *"file it"*, *"ship the docs"*),
ship it. Aaron's explicit directive overrides the throttle.
Otto should still note in the commit message or PR body
that queue is saturated.

## The composition with other memories

- **Otto-105 graduation cadence** — one small graduation per
  tick was the original discipline. That cadence was
  correct; this session drifted past it by shipping 14
  graduations + docs across 14 ticks without factoring in
  CI throughput.
- **CC-002 close-on-existing** — this memory is a
  generalization: close-on-existing at the PR level + don't-
  ship-when-queue-saturated at the session level are the
  same discipline applied at different scopes.
- **Verify-before-deferring** — when Otto is about to ship
  a PR, verify the queue state first. "Queue looks fine"
  without checking is the same failure mode as "the BACKLOG
  row exists" without checking.
- **Never-be-idle** — still binding. Drain-mode IS
  productive work. Memory updates and reading and rebasing
  are all non-idle actions.
- **Positional-append-conflict pattern** — known failure
  mode from #334 → #341 re-file. This memory generalizes:
  the pattern isn't just about BACKLOG.md; it's about any
  file where multiple PRs append to the same section.

## Direct observation quote (preserve for future Otto)

> *Session Otto-157..Otto-170 shipped 14 PRs; 4-5 merged;
> queue grew from ~10 to 60 open with 20 DIRTY. Auto-merge
> CI-drain-rate is the bottleneck; Otto's ship-rate exceeded
> it. The factory doesn't have a built-in throttle — Otto
> must self-throttle by watching the open-PR count.*

## What this memory does NOT authorize

- **Does NOT** authorize closing any PR without an explicit
  "superseded by #N" rationale in the close comment.
- **Does NOT** authorize closing PRs Aaron has explicitly
  asked for. "Backlog this" → ship it.
- **Does NOT** authorize pausing the autonomous loop. The
  cron continues; ticks continue; drain-mode work fills
  ticks when ship-mode is inappropriate.
- **Does NOT** authorize ignoring new Aaron directives
  because queue is saturated. Aaron's directives override.
- **Does NOT** replace verify-before-deferring. When
  saving this memory, note that the thresholds (20/40) are
  soft defaults; tune with observation.
- **Does NOT** apply to other repos. Each repo's CI-drain-
  rate differs. Observe and calibrate.
