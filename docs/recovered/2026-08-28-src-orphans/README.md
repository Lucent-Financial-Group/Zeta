# Recovered from orphaned worktrees under `Documents/src`, 2026-08-28

## What this is

446 files whose **content existed nowhere in git** — not on `main`, not on any branch,
not in any archive tag, not as a loose object. They were found during the home-directory
and `Documents/src` cleanup, inside worktrees whose `.git` pointer referenced admin data
that no longer existed, so git could not read them at all (`fatal: not a git repository`).

They are laid out as `<orphan-directory-name>/<original-repo-relative-path>`, because 97
different orphans contributed and several hold files at the same path (19 different
`docs/BACKLOG.md`, for instance). Flattening would have silently dropped 18 of them.

## How they were identified

Every file in all 142 orphaned directories was hashed and checked for presence in the
object database:

```
find <orphan> -type f | git hash-object --stdin-paths | git cat-file --batch-check
```

**719,592 files hashed. 446 reported `missing`.** The other 719,146 were already stored in
git and their directories were deleted without loss.

This is a *content* question, not a comparison against a branch tip. Diffing these against
`origin/main` would have been useless — `main` has moved thousands of commits since these
were checked out, and this repo squash-merges, so both `git diff main..X` and
`rev-list X --not main` report drift as though it were content. That error was made three
times during this cleanup before the method was corrected.

## What is here

| area | files |
|---|---|
| `docs/hygiene-history` | 197 |
| `docs/pr-discussions` | 77 |
| `docs/research` | 42 |
| `docs/backlog` | 27 |
| `docs/BACKLOG.md` (19 distinct versions) | 19 |
| `memory/`, `docs/history`, `tools/`, other | 84 |

## Status: RESCUED, NOT REVIEWED

Nothing here has been read, adjudicated, or merged into its proper home. It is checked in
so that deleting the directories destroys nothing. Several are point-in-time snapshots of
living documents (`BACKLOG.md`) that are almost certainly superseded; others are research
and PR-discussion records that may be the only surviving copy.

Triage is a separate piece of work. Deleting this tree without doing that triage forfeits
whatever is genuinely unique in it.

## One thing that nearly went wrong

Eight of the 446 are `.gemini/bin/lior-loop-tick.ts`, which is **gitignored**. A plain
`git add` staged 439 of 447 and reported success — the eight most easily-lost files, the
ones deliberately excluded from version control and therefore existing in no other copy,
were the exact ones silently dropped. They are here via `git add -f`.

All eight are byte-identical (`7c77b732`), so the duplication is redundancy, not eight
distinct scripts.

The general lesson: when a rescue is filtered by the very rules that caused the content to
be untracked in the first place, the filter removes precisely what most needed rescuing.

## Second pass (same day)

Three more files from the last four directories. The sweep there reported 82 unique
files, but **79 were `.helm-render-cache/*.tgz`** — downloaded Helm chart tarballs.
Unique-in-git, worthless to keep: a build cache is re-downloadable by definition.

"Not in the object database" and "worth preserving" are different questions, and
conflating them would have committed 79 chart tarballs as though they were work.

The three kept:

- `shadow-reason-truth-13492/.mutation/run.sh` — an 86-line hand-written mutation
  harness that proves each mutation APPLIED by byte-level `cmp` before reading its
  result, and RESTORED after. Its own comment states the reason: *"A harness that
  patches nothing produces fake surviving mutants, which is worse than no harness at
  all."* Not gitignored, and this was the only copy. Its paths are hardcoded to the
  orphan directory, so it needs adapting before reuse — the method is what is worth
  keeping.
- `shadow-reason-truth-13492/.mutation/pristine-rsc.ts` — its pristine baseline.
- `zeta-shadow-darkforest/db/search-index/inverted/terms-v.jsonl` — a generated index
  shard, kept only because it is cheap and its provenance is unclear.
