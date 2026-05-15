# Autonomous-loop per-tick discipline — canonical pointer (3-surface converge)

The human maintainer 2026-05-13 22:08Z: *"any changes you need to make to it so it's more
like the routines and like a 3 coordinated version?"*

This file IS the canonical per-tick discipline that all three Otto
surfaces (Otto-CLI, Otto-Desktop, and the queued B-0448 cloud routine)
cite. One source of truth; three readers. When the discipline updates,
all three surfaces inherit the change at their next cold-boot cycle.

## Why this file exists

Before this file, the per-tick instructions diverged across surfaces:

| Surface | Where the discipline lived | Risk |
|---------|---------------------------|------|
| Otto-CLI | `<<autonomous-loop>>` sentinel + ambient-loaded `.claude/rules/` + CLAUDE.md | Auto-loaded; ambient |
| Otto-Desktop routine | Inline prompt body in `tools/routines/autonomous-loop/SKILL.md` | Required manual sync |
| B-0448 cloud routine | TBD — not yet shipped | Would have re-implemented the discipline a third time |

The risk: when the discipline evolved (e.g., the
[`holding-without-named-dependency`](../.claude/rules/holding-without-named-dependency-is-standing-by-failure.md)
rule, which Otto-CLI picks up via auto-load but Desktop routine had
to mention explicitly), surfaces drifted. This file collapses the
drift surface to one.

## The 7-step per-tick discipline

Apply on every autonomous-loop tick. The order matters — earlier
steps gate later ones.

### 1. Refresh worldview FIRST

`refresh-before-decide` invariant
([`.claude/rules/refresh-before-decide.md`](../.claude/rules/refresh-before-decide.md)).
Never act on stale state. Minimum refresh:

- `bun tools/github/poll-pr-gate-batch.ts --all-open` — current state of all my open PRs
- `git fetch origin main && git status` — main HEAD + local state
- `CronList` — verify the autonomous-loop sentinel is still armed
- `bun tools/orchestrator-checks/cron-sentinel-mutex.ts --json` — detect concurrent Otto-CLI peer sessions
  ([B-0530](backlog/P3/B-0530-cron-sentinel-mutex-prevent-otto-cli-self-contention-2026-05-15.md);
  Pattern 8 of [B-0519](backlog/P3/B-0519-multi-otto-branch-state-contamination-rca-2026-05-14.md))

#### When peers are detected

If the mutex check reports `peerDetected: true` (or exits with code
1..250), the tick body should:

1. **Avoid `git worktree add`** — the worktree-prune-race RCA in PR
   #3370 documents that concurrent `git worktree add` from a peer
   Otto-CLI on the same `.git/` directory causes
   `Interrupted system call` failures on `.git/objects/pack` followed
   by git's automatic rollback of the partially-populated worktree.
   If a worktree is genuinely needed, prefer the
   ["borrow-on-existing pattern"](../.claude/rules/claim-acquire-before-worktree-work.md)
   landed in PR #3377.
2. **Continue with non-git-mutating work** — bus envelope publishing,
   read-only audits, planning, etc. are safe and don't contend.
3. **Bus-publish a deferral envelope** if substrate observation
   matters past this tick:

   ```bash
   bun tools/bus/bus.ts publish --from otto-cli --to '*' \
     --topic shadow-catch \
     --payload '{"finding":"tick deferred — peer Otto-CLI detected", ...}'
   ```

4. **Re-check next tick** — peer-Otto-CLI sessions typically wrap
   their cron-tick work within 1-3 minutes; the contention window
   resolves naturally.

If the mutex exits with code 251 (`PGREP_ERROR_EXIT`), the mutex
itself is unreliable — proceed with normal work but log the failure
in the tick shard for future-Otto context.

### 2. Apply Holding-without-named-dependency discipline

[`.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`](../.claude/rules/holding-without-named-dependency-is-standing-by-failure.md).
**NEVER** output one-word "Holding" / "Standing by" / "Waiting" on
consecutive cron ticks. Either:

- Name the SPECIFIC dependency + check name + bounded ETA (e.g.,
  "Real-dependency-wait on PR #NNNN CI required-check 'build' (~5min ETA)")
- OR pick decomposition work per infinite-backlog metabolism

Per-tick repeat-Holding output IS the Standing-by failure mode.

### 3. Pick speculative work per never-be-idle priority ladder

[`.claude/rules/never-be-idle.md`](../.claude/rules/never-be-idle.md).
Priority order:

1. **Known-gap fixes** — explicitly named gaps in shipped substrate
   (e.g., bg-services slice 5 subscriber agents; B-0442's stub-detector
   when it existed)
2. **Generative factory improvements** — friction reducers,
   tool ports, infrastructure
3. **Gap-of-gap audits** — meta-improvements (substrate-discovery,
   index regeneration)

If `claim acquire` blocks on a row, pick a different row in the same
priority tier — do NOT go idle.

### 4. Verify + commit any substantive landing

[`.claude/rules/substrate-or-it-didnt-happen.md`](../.claude/rules/substrate-or-it-didnt-happen.md).
Anything that matters past compaction MUST be:

- Committed to a git-tracked file
- Pushed via PR (main is PR-required; direct push to main is blocked)
- Auto-merge armed (`gh pr merge <N> --auto --squash`)

Verify gates (per AGENTS.md; these are the **full** repo gates,
not touched-file-only — three autonomous surfaces converge here, so
the gates must be repo-wide to prevent broader-test or formatting
regressions slipping through):

- `dotnet build -c Release` — 0 warnings, 0 errors (TreatWarningsAsErrors on)
- `dotnet test Zeta.sln -c Release` — full solution test pass
- `dotnet format --verify-no-changes` — formatter / analyzer clean
- `bun test` on touched TypeScript test files (the bun side; the
  dotnet gates above cover the F#/C# side)
- `bun --bun tsc --noEmit` if TS code changed

If any of these would fail, do NOT commit (verify is the gating
half of step 4; commit is the post-pass half). Fix the gate
failure first, then re-verify before committing.

### 5. Write tick shard

`docs/hygiene-history/ticks/YYYY/MM/DD/HHMMZ.md`. Substrate-or-it-
didn't-happen applies to ticks too — without the shard, future-Otto
can't reconstruct what landed when. Minimum fields:

- Refresh result (cron state, open PR state)
- Speculative work picked + rationale
- Landed artifacts (file paths, PR numbers)
- Real-dependency-waits active
- Visibility signal

### 6. CronList check

If the autonomous-loop sentinel is missing, arm it immediately via
`CronCreate` with `* * * * *` + `<<autonomous-loop>>`. Catch-43
(2026-05-12, 12-hour silent gap) is the cost-of-skip evidence.

### 7. Visibility signal → stop

State what landed concretely (file paths, PR numbers) so the human maintainer + the
next tick can pick up cold. Stop the foreground; the cron will fire
the next tick.

## How each surface uses this file

### Otto-CLI

Auto-loads via [`.claude/rules/autonomous-loop-per-tick-pointer.md`](../.claude/rules/autonomous-loop-per-tick-pointer.md)
which points at this canonical doc. The `<<autonomous-loop>>` sentinel
runtime resolves the ambient-loaded discipline; this file is the
human-readable form of what the rules + CLAUDE.md already encode.

### Otto-Desktop routine

`tools/routines/autonomous-loop/SKILL.md` references this file in
its instruction body. The routine prompt loads the
canonical-bootstream first (cold-boot), then applies the 7-step
discipline above. When this file updates, the routine's behaviour
updates at the next fresh-session cold-boot (no manual sync needed).

### B-0448 cloud routine (queued, not shipped)

When shipped, will read this file from the repo via the same
`docs/AUTONOMOUS-LOOP-PER-TICK.md` URL pattern that Desktop uses.
Same 7-step discipline.

## Composes with

- [Canonical bootstream](research/2026-05-12-otto-canonical-bootstream-multi-foreground-surface-orchestrator-ifs-format.md)
  (Part 5 specifically — the cron/loop substrate this file extracts)
- [`docs/AUTONOMOUS-LOOP.md`](AUTONOMOUS-LOOP.md) — broader autonomous-
  loop architecture (cron mechanism, durability story); this file
  zooms into per-tick discipline specifically
- [`.claude/rules/tick-must-never-stop.md`](../.claude/rules/tick-must-never-stop.md)
  (the catch-43 substrate)
- [`.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`](../.claude/rules/holding-without-named-dependency-is-standing-by-failure.md)
- [`.claude/rules/never-be-idle.md`](../.claude/rules/never-be-idle.md)
- [`.claude/rules/refresh-before-decide.md`](../.claude/rules/refresh-before-decide.md)
- [`.claude/rules/substrate-or-it-didnt-happen.md`](../.claude/rules/substrate-or-it-didnt-happen.md)
- [`.claude/rules/encoding-rules-without-mechanizing.md`](../.claude/rules/encoding-rules-without-mechanizing.md)
- B-0448 (Cloud Routines integration — 4th catch-43 defence layer)
- PR #3030 (Otto Claude Desktop bootstream)
- PR #3034 (Otto-Desktop routines substrate landed 2026-05-13)
