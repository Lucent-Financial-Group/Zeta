---
name: codeql-no-source-on-docs-only-PR-is-broken-commit-canary
description: When CodeQL fails "no source code seen during build" on a docs-only PR while sibling docs-only PRs pass, the commit tree is corrupted — verify via `git ls-tree HEAD | wc -l` before treating as flake.
type: feedback
created: 2026-05-15
originSessionId: 22958e92-4210-414b-842e-875385de18d3
---
# CodeQL "no source code seen" on docs-only PR = broken commit canary, NOT a flake

## Rule

**When CodeQL shows `no source code seen during build` failure on a docs-only PR:**

1. Run `git ls-tree <PR-HEAD-SHA> | wc -l` immediately
2. Compare to `git ls-tree origin/main | wc -l`
3. If the counts differ significantly (e.g., 1 vs 52), the commit tree is BROKEN
4. Close the PR — do NOT try to fix CI; the commit itself is the problem
5. The "flake" hypothesis is INVALID if other docs-only PRs in the same window passed

## Why

**Hidden failure mode**: Lior-gemini agent's "global lock cleanup" pass (step 8 of its prompt) clears stale `.git/worktrees/.../index.lock` files. When this fires during another agent's `git worktree add` operation, the worktree's INDEX (not just the lock file) can be cleared/corrupted. Subsequent `git add <new-file>` then stages against an empty index. The resulting `git commit` captures only the staged file + its containing directory as the ENTIRE TREE — effectively deleting every other top-level entry.

**Three downstream signals fire**, all of which are easy to misread:

| Signal | Misread as | Actual cause |
|---|---|---|
| CodeQL `no source code seen` (3x: csharp, java-kotlin, javascript-typescript) | CI flake | The commit literally has no source code |
| `gh pr update-branch --rebase` → `RebaseConflictError` | Phantom conflict | Real conflict: tree-replacement vs main's actual contents |
| `gh api .../files` → ~5000 changed files for "1-commit PR" | API quirk | Real: the destructive diff vs main |

**The misread defaults are CONFIRMATION BIAS**: when 7 sibling docs-only PRs pass clean and ours fails, the natural read is "we hit a flake." The substrate-honest read is "ours has something different — investigate THAT difference, not the CI."

## How to apply

**STRONGER GUARD added 2026-05-15 1547Z** — empirical retry showed Lior corrupts indices AT WORKTREE-CREATION TIME, not just between `git add` and `git commit`. CPU dips are noise, not safe-window signals. Updated discipline:

```bash
# BEFORE creating any worktree:
if ps -A | grep -q "gemini.*Lior\|lior.*loop"; then
  echo "Lior-gemini active in process list — DO NOT create worktree"
  echo "Use memory-file + bus-envelope substrate paths instead"
  exit 1
fi

# AFTER creating worktree, BEFORE any `git add`:
cd <worktree-path>
status_lines=$(git status --short | wc -l | tr -d ' ')
if [ "$status_lines" -gt 5 ]; then
  echo "FRESH WORKTREE ALREADY CORRUPTED: $status_lines status lines (expected ~0)"
  echo "Lior cleanup fired during worktree-add — abort + clean up"
  cd / && git worktree remove <worktree-path> -f -f
  exit 1
fi

# AFTER git commit, BEFORE push (original guard, still valid):
expected=$(git ls-tree HEAD~1 | wc -l)
actual=$(git ls-tree HEAD | wc -l)
if [ "$actual" -lt $((expected - 2)) ]; then
  echo "BROKEN COMMIT: tree collapsed from $expected to $actual entries"
  git reset --hard HEAD~1
  exit 1
fi
```

## Empirical evidence (2026-05-15 session)

- **Otto-Desktop cold-boot tick 1336Z** (Aaron's claude.ai session via autonomous-loop cron)
- **Lior-gemini active**: PID 96702, 2h+ runtime, "global lock cleanup" in step 8 of prompt
- **Four worktrees created this session**:
  - `/tmp/zeta-otto-cli-cold-boot-1338z` (1338Z) — **survived**, primary substrate intact (PR #3487 merged at `0cabc085`)
  - `/tmp/zeta-otto-cli-b0531` (1345Z) — **corrupted**, tree collapsed to 1 entry; caught by Codex on PR #3492 after I dismissed CodeQL signal
  - `/private/tmp/zeta-otto-cli-codeql-canary-rule` (1521Z retry) — **corrupted DURING use**, `git status` showed 5066-line deletion staged after Lior re-fired at 3.2% CPU; aborted before commit
  - `/private/tmp/zeta-otto-cli-canary-rule-retry-1547z` (1547Z retry) — **corrupted AT CREATION**, 5032-line status diff immediately after worktree-add despite Lior being at 0.0% CPU; aborted before any user operation
- **Codex P0 review caught the first corruption** on PR #3492 (chatgpt-codex-connector bot)
- **My session-level review missed it the first time**: I dismissed CodeQL failures as flake despite 7 sibling docs-only PRs (#3487, #3490, #3491, #3494, #3495, #3496, #3497) passing clean
- **Retries 3 and 4 demonstrated**: the corrupting condition is recurring + can fire WITHOUT visible CPU spike; the only reliable safety check is `ps | grep Lior` BEFORE creating any worktree

The factory had THREE safety signals (CodeQL + GitHub rebase API + Codex review). The first TWO were dismissed by me. Only Codex catch saved main from a broken merge.

## Composes with

- [B-0519](docs/backlog/P3/B-0519-multi-otto-branch-state-contamination-rca-2026-05-14.md) — multi-Otto contamination patterns; this learning extends to "lock-cleanup-race contamination of commit tree"
- B-0530 — cron-sentinel mutex (in-flight; same multi-Otto-CLI race class)
- B-0531 (deleted, was on PR #3492) — branch-creation IS implicit claim; this learning was the meta-lesson the PR couldn't ship cleanly

## Substrate-or-it-didn't-happen status

**Memory-file-only** (this file). Future-Otto can promote to:
- `.claude/rules/` entry (auto-loaded at cold-boot) — RECOMMENDED next step when worktree-creation is friction-free
- A backlog row that mechanizes the post-commit verification check

Without a CLAUDE.md / `.claude/rules/` pointer, this is "weather" per the substrate-or-it-didn't-happen discipline — but better than no substrate at all. Future-Otto cold-boots from this machine load MEMORY.md and can find this file via the index.
