---
name: Corruption triage is a substrate health incident, not a backlog item — Aaron + Amara 2026-04-29
description: When `git fsck` reports corrupt objects, the lane narrows hard — corruption-first triage outranks all background work (PR-queue drain / tick-history shards / scanner builds / branch deletion / worktree pruning). Treat as substrate health incident; do read-only diagnosis + fresh-clone verification before any repair. Per-object classification per Amara's bucket schema. Never run `git gc` / `git prune` / `git repack -Ad` / `git fsck --lost-found` as a "fix" while investigating lost evidence.
type: feedback
---

# Corruption triage discipline — substrate health incident

## Source

Aaron 2026-04-29: *"you for sure need to make sure your future
self remembers this, this is very important"* — after a Day-2
inventory pass surfaced two corrupt git objects on this repo.

Amara synthesis 2026-04-29: *"A corrupt object is not a backlog
item. It is a substrate health incident. Do not prune the
evidence while investigating lost evidence."*

## The rule (load-bearing)

When `git fsck` reports corrupt objects, the lane narrows
**hard**. All background work stops:

```text
No PR-queue drain.
No tick-history shard generation.
No scanner builds.
No branch deletion.
No worktree pruning.
No new substrate unless it directly records corruption triage.
No git gc / git prune / git repack / git fsck --lost-found as a "fix" yet.
```

Corruption-first triage is the lane until object health is
understood. This is not "interesting extra signal"; it's
substrate floorboards creaking.

## Triage procedure (read-only first)

### Step 1: Diagnose without writing

```bash
git status --short
git fsck --full --no-reflogs --no-progress > /tmp/fsck-full.txt 2>&1
git fsck --connectivity-only --no-progress > /tmp/fsck-connectivity.txt 2>&1
git verify-pack -v .git/objects/pack/*.idx > /tmp/verify-pack.txt 2>&1
```

**Do NOT use `git fsck --lost-found` as a first move** — that
flag WRITES dangling objects into `.git/lost-found/`. It's not
read-only.

### Step 2: Per-corrupt-object inspection

For each `error: corrupt loose object <SHA>` or
`error: cannot unpack <SHA>`:

```bash
OBJ=<sha>
git cat-file -t "$OBJ"   # type (may succeed even when content corrupt)
git cat-file -s "$OBJ"   # size (may succeed even when content corrupt)
git cat-file -p "$OBJ"   # content (this is where corruption surfaces)
```

The header may be readable even when the content is corrupt —
type and size will print, but `-p` errors with `inflate: data
stream error`.

### Step 3: Fresh-clone verification (NOT just current repo)

```bash
git clone --no-checkout --quiet <origin-url> /tmp/repo-fresh-corruption-check
cd /tmp/repo-fresh-corruption-check
git cat-file -t <sha>
git cat-file -s <sha>
```

**Do NOT say "origin has it" without fresh-clone verification.**
The current repo may be the source of corruption; reading the
object via the same potentially-corrupt repo proves nothing.

### Step 4: Classify each corrupt object

Per Amara's bucket schema:

| Bucket | Definition |
|---|---|
| RECOVERABLE_FROM_ORIGIN | Object exists in fresh clone with same SHA + type + size; recovery via re-clone or `git fetch --refetch` |
| RECOVERABLE_FROM_OTHER_LOCAL_CLONE | Object exists in another local clone of the same repo |
| DANGLING_CANDIDATE_NEEDS_CLASSIFICATION | Object is dangling/unreachable; may be lost substrate; per-object `git show` inspection needed |
| CORRUPT_LOOSE_OBJECT | Loose object in `.git/objects/XX/YY*`; can't be unpacked locally |
| CORRUPT_PACK_OBJECT | Object in pack file with data-stream error |
| MISSING_UNRECOVERED | Not in current repo, not in origin, not in other local clones — lost substrate |

### Step 5: Repair plan (only after classification)

```text
RECOVERABLE_FROM_ORIGIN          → git fetch --refetch origin (or re-clone)
RECOVERABLE_FROM_OTHER_LOCAL     → cherry-pick or fetch from local sibling
DANGLING_CANDIDATE               → git show <sha>; preserve before any GC
CORRUPT_LOOSE/PACK + recoverable → re-fetch; verify with git fsck
MISSING_UNRECOVERED              → record in lost-substrate ledger; substrate-loss event
```

## What this discipline forbids during triage

- **No `git gc` / `git prune` / `git repack -Ad`.** These can
  destroy unreachable evidence.
- **No `git fsck --lost-found` as a first move.** It writes
  to `.git/lost-found/`; not read-only.
- **No `stash pop` / `stash apply`.** Stash entries reference
  objects that may be the only path to lost work.
- **No "origin has it" without fresh-clone verification.**
- **No background tasks** — single-lane until corruption
  health understood.

## Specific worked example: 2026-04-29 incident

Two corrupt objects identified during Day-2 inventory pass:

| Object | Type | Size | Classification | Recovery |
|---|---|---|---|---|
| `9bf2daee3ce53c88633824f9532a0158aaa92ed9` | blob | 16,455,417 bytes | RECOVERABLE_FROM_ORIGIN | Fresh clone has it clean; recoverable via `git fetch --refetch` |
| `8d5e67fd313573855848705e4af114f3ff0eecbc` | blob | 439,327 bytes (early `docs/hygiene-history/loop-tick-history.md` content) | MISSING_UNRECOVERED | Fresh clone returns "could not get object info"; origin doesn't have this exact blob; local-only intermediate version |

The `8d5e67fd` finding is the more significant: it's a local-
only blob that origin doesn't have. The repo's `git fsck`
flagged it as "missing blob" — meaning some tree/commit
expects it to exist. Investigation pending; could be from a
stash, dangling commit, or unpushed branch.

This worked example is the canonical failure-mode template:
**a local-only intermediate version with no origin recovery
path is the unrecovered-substrate boundary case.**

## Related discipline

- **Dangling objects are CANDIDATES, not lost-substrate-confirmed.**
  1,109 dangling objects on this repo include real factory
  substrate (Aaron's merge commits, round-44 tick-history).
  Apply Candidate-count Goodhart: classify before acting.
- **Rerere cache is merge-immune-memory, NOT a cleanup target.**
  293 rerere records on this repo encode codified conflict-
  resolution knowledge. Do NOT prune.
- **Stashes need ranked triage, not bulk.** Inspect each stash
  via `git stash show --stat stash@{N}`; no `pop` or `apply`
  until a recovery branch is created.

## Composes with

- `docs/lost-substrate/inventory-ledger-2026-04-29.md` — the
  inventory ledger that surfaced these findings.
- `docs/research/escrowed/aurora-autonomous-flywheel-thesis-2026-04-28.md`
  — the escrow primitive; corruption-triage uses similar
  bounded-preservation pattern.
- `memory/feedback_candidate_count_goodhart_raw_hits_are_not_violations_aaron_amara_2026_04_28.md`
  — Candidate-count Goodhart applies to dangling objects.

## Distilled rules (keepers)

```text
A corrupt object is not a backlog item.
It is a substrate health incident.
```

```text
Do not prune the evidence while investigating lost evidence.
```

```text
Verify recoverability from a fresh clone before declaring recovered.
```

```text
A count is not a clearance. A bucket is not proof.
```

## Why this is in memory/, not just a doc

Aaron explicitly asked: *"you for sure need to make sure your
future self remembers this, this is very important."* Per the
auto-memory protocol + Aaron's natural-home-of-memories-is-in-
repo rule (2026-04-24), this is durable substrate that future-
Claude must consult on cold-start when corruption is observed.
The ledger itself is point-in-time; this memory is the
discipline.
