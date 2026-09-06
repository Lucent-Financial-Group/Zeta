---
id: 081M1TRJ3X5087G0R0032TNP8H
type: task
state: backlog
priority: P2
slug: where-zeta-actually-grows-64-of-new-files-are-the-pr-archive
title: "Where Zeta actually grows: 64% of new files are the PR archive, 44 MB a month"
created: 2026-09-06T07:05:11.845Z
depends_on: []
composes_with: []
---

# Where Zeta actually grows: 64% of new files are the PR archive, 44 MB a month

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1TRJ3X5087G0R0032TNP8H-*.md` glob. -->

Aaron 2026-09-06, on why seven workflows are `disabled_manually`: *"we are trying to limit
our size increase on zeta and make the growth happen on other repos, zeta is trying to stay
small ... if you can make other repos grow instead that's okay but also we want to reduce
size too."* This is the measurement that ask needs, taken before proposing anything.

## Where the bytes are

| | tracked KB | files |
|---|---:|---:|
| `docs` | 299,932 | **42,102** |
| `src` | 81,208 | 4,535 |
| `db` | 64,656 | 271 |
| `memory` | 40,444 | 1,954 |
| everything else | ~50,000 | ~7,000 |

`.git` is **312 MB on disk, 285.8 MiB packed, 247,058 objects.**

`docs` alone is **~55% of tracked bytes and ~74% of tracked files**, and two of its
subtrees are most of that:

| | KB | files |
|---|---:|---:|
| `docs/history/pr-reviews` | 91,932 | 13,983 |
| `docs/github/prs` | 63,460 | 13,983 |

## Where the growth is — and this is the number that matters

Files ADDED in the last 30 days:

```
whole repo         53,944 files
PR archive pair    34,339 files   (64%)   ~44.2 MB
```

**Two-thirds of everything Zeta accretes is one mechanism**, and it is not accidental
sprawl — it is the deliberate per-PR archive.

## THEY ARE NOT DUPLICATES OF EACH OTHER, and a first read said they were

The file counts are identical (13,983 each) and that invites the obvious conclusion. It is
wrong, and it is recorded here because the next reader will reach for it too:

- `docs/history/pr-reviews/PR-N-*.md` is the **content** — description, outcome, every
  review comment and thread. Its own README calls it *"the project's most valuable
  data"* (maintainer, 2026-06-07) and *fuel* for the GitOps fine-tuning signal.
- `docs/github/prs/` is the **index** — a ~10-field JSON per PR pointing at that archive.

Both earn their place. The saving is not in deleting either.

## The internal redundancy IS real, and the stale side is the surprise

`docs/github/prs/manifest.jsonl` and `docs/github/prs/shards/*.json` carry the same record
shape. Measured across all of them:

```
manifest records            13,592
shard files                 13,982
shard identical to its line 13,475   (96.4%)
shard differs from its line    117   (fetched_at / commit_sha — the SHARD is newer)
shard absent from manifest     390
```

**The manifest is the stale copy, not the shards.** It is 390 records behind and disagrees
with 117 more, so anything reading `manifest.jsonl` today gets an incomplete and partly
wrong index — a correctness issue independent of size, inside a directory the README marks
protected. Dropping the manifest and deriving it on demand would remove a drifting
artifact; it would save one file, not fourteen thousand.

## What this says about the ask

1. **The growth is the archive, and the archive is deliberate.** "Reduce size" and "keep
   the most valuable data" point in opposite directions on the same object, so this is a
   maintainer decision and not a cleanup.
2. **The strategy Aaron already named fits it exactly**: *make the growth happen on other
   repos.* Moving `docs/history/pr-reviews` + `docs/github/prs` to a dedicated archive repo,
   leaving a pointer, removes **64% of Zeta's file growth and ~44 MB a month** without
   deleting anything. It is the one lever that changes the trajectory rather than the
   snapshot.
3. **Stopping growth and shrinking the past are DIFFERENT asks with different costs.**
   Moving the archive stops future accretion and is ordinary work. It does **not** shrink
   the existing 285.8 MiB pack — history rewriting does, and that is a gated,
   non-reversible act that only the maintainer authorises.

## Not proposed here, deliberately

No deletion, no move, and no history rewrite. The archive is marked *read-not-refactor* and
its value was asserted by the maintainer; this work-item measures and stops.

## Done when

The maintainer has decided whether the PR archive moves to its own repo — and if it does,
the pointer left behind names where it went, so `git clone` at a tag still tells a reader
where the review record lives.

