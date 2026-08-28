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
