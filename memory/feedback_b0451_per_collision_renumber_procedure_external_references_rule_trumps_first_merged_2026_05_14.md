---
name: B-0451 per-collision renumber procedure
description: Procedure for resolving duplicate-row-ID collisions in docs/backlog/ surfaced by tools/bg/audit-duplicate-row-ids.ts. Captures the external-references-rule precedence, the connected-component batching pattern, and the worktree-isolation gotcha. Derived from PRs #3053 (B-0444), #3057 (B-0068.1), #3058 (B-0090.x batch), #3065 (B-0370-0373 batch) shipped 2026-05-13/14.
type: feedback
created: 2026-05-14
---

# B-0451 per-collision renumber procedure

## Carved sentence

> External-references-rule trumps first-merged-wins. The row that
> would cost more to migrate keeps its ID, regardless of who filed
> first. Batch connected components (parent + dependency chain) in
> one PR.

## When this procedure applies

When `bun tools/bg/audit-duplicate-row-ids.ts` (shipped via PR
#3056) reports `N duplicate-ID group(s) found across M rows with
id field`. Each group is a set of 2+ files claiming the same
frontmatter `id:` value.

## Per-collision procedure (the 9-step recipe)

### 1. Identify the colliding rows

```bash
bun tools/bg/audit-duplicate-row-ids.ts
```

Lists every duplicate group with file paths. Pick one group to
resolve per PR (or batch a connected component, see step 7).

### 2. Find external references to each row

For each colliding row, grep for its bare ID. Use **fixed-string
match** (`-F`) so dotted sub-row IDs like `B-0068.1` aren't treated
as regex (where `.` matches any character):

```bash
# Whole-row ID like B-0444 (no dot)
grep -rnF "B-0XXX" docs/ memory/ tools/ .claude/ \
  | grep -vE "docs/backlog/.*/B-0XXX-" \
  | grep -E "B-0XXX([^0-9.]|$)"   # word-boundary substitute (portable)

# Sub-row ID like B-0068.1 — fixed-string for the literal, then
# portable word-boundary filter (with escaped dot in the regex)
# so a search for B-0068.1 doesn't also match B-0068.10 or B-0068.1.1.
grep -rnF "B-0068.1" docs/ memory/ tools/ .claude/ \
  | grep -vE "docs/backlog/.*/B-0068\\.1-" \
  | grep -E "B-0068\\.1([^0-9.]|$)"   # word-boundary on the renumbered ID
```

(The `\b` word-boundary GNU-extension is not portable to BSD grep
on macOS; the `[^0-9.]|$` filter is the portable equivalent. The
trailing filter on the sub-row case prevents matching
`B-0068.10` / `B-0068.1.1` when searching for `B-0068.1`. Codex /
Copilot round-2 caught both issues in PR #3066 review.)

Note where each row is referenced externally:
- Parent row's body (e.g., `## Decomposition` section listing children)
- Sibling rows' `depends_on:` / `composes_with:` / `children:`
- Memory files (`memory/feedback_*.md`)
- PR history docs (`docs/history/pr-reviews/`)
- Already-merged commit messages (search `git log`)
- BACKLOG.md (always — regenerated from rows)

### 3. Apply the precedence rules (in order)

1. **External-references rule**: KEEP the row with more external
   references (especially uneditable ones: PR commit messages,
   memory files outside this PR). Renumber the orphan(s).
2. **First-merged-wins**: if external-references are tied or both
   uneditable, keep the earlier-filed row.
3. **Status-precedence**: if one row is `status: closed` and others
   are open, keep the closed one (its work shipped; the ID is
   baked into commits).

The external-references rule trumps first-merged-wins. PR #3057
is the canonical example of this rule bending the temporal order:

- PR #3057 (B-0068.1): kept Riven's LATER row because B-0068.2/
  B-0068.3 sibling rows reference it; renumbered Aaron's EARLIER
  but orphan row. External-references actively overrode
  first-merged-wins here.

PR #3065 (B-0370-0373) is a different case — both rules pointed
the SAME direction (keep the P1 set):

- First-merged-wins: P1 set was filed 2 days earlier (PR #2269
  on 2026-05-09 vs PR #2683 on 2026-05-11).
- External-references: B-0370 + B-0373 (P1) are shipped, with
  references in PR-history doc + memory file.
- Status-precedence: B-0370 + B-0373 (P1) are `status: closed`
  effectively.

PR #3065 is therefore the re-check pattern (substrate-honest
re-examination after initial-analysis pointed at keeping P2
because of its parent body description). The procedure's value
isn't just mechanical — it's the re-examination step that catches
when the first instinct doesn't match all the rules.

### 4. Pick next-free IDs

```bash
git ls-tree -r origin/main -- docs/backlog/ \
  | grep -oE "B-04[0-9]{2}" \
  | sort -u \
  | tail -10
```

Also check open PRs that claim B-04XX IDs to avoid claim-collision:

```bash
gh pr list --state open --json title \
  | grep -oE "B-04[0-9]{2}"
```

For sub-row collisions (`B-0090.M`), the new IDs are next-free
within the parent's series (e.g., `B-0090.5..B-0090.8`).

### 5. Create isolated worktree (multi-Otto split-brain prevention)

```bash
git worktree add /tmp/zeta-<short-name> \
  -b fix/<descriptive-branch>-2026-MM-DD origin/main
```

The main checkout may be raced by parallel Otto instances (see
PR #3043 + #3057 tick shards). Worktree isolation prevents working-
tree resets.

### 6. Rename files + edit frontmatter

For each renumbered row:

```bash
cd /tmp/zeta-<short-name>
git mv docs/backlog/PX/B-OLD-<slug>.md docs/backlog/PX/B-NEW-<slug>.md
```

Edit the renamed file's frontmatter to:

- Change `id: B-OLD` → `id: B-NEW`
- Update body H1 title (`# B-OLD —` → `# B-NEW — (renumbered from B-OLD)`)
- Add `renumbered_from: B-OLD` field
- Add `renumbered_reason: "..."` explaining the collision + which
  row kept the original ID + reference to the B-0451 sweep
- Bump `last_updated:` to today
- Add `renumbered` to `tags:`

### 7. Batch connected components

If the renumbered rows have an internal `depends_on:` chain (e.g.,
B-0090.2/.3/.4 all `depends_on: [B-0090.1]`), batch the WHOLE chain
in one PR:

- Renumbering them serially would require either temporary chain
  breakage (bad) or two-step chain updates (verbose)
- Batching does the chain remap as a single atomic operation
- Pattern: when collisions form a connected component of the
  dependency graph, fix the whole component in one PR

Update internal `depends_on:` / `composes_with:` in each
renumbered row to reflect new IDs.

### 8. Update parent row's body + regen index

If the renumbered set is a parent's decomposition (e.g., B-0092 →
B-0370..B-0373), update the parent body's `## Decomposition`
section to list the new IDs.

Always regenerate `docs/BACKLOG.md`:

```bash
BACKLOG_WRITE_FORCE=1 bun tools/backlog/generate-index.ts
```

### 9. Verify + commit + push + PR

```bash
bun tools/bg/audit-duplicate-row-ids.ts
# Confirm dup-group count dropped by exactly the number of groups resolved.
```

Commit message template (copy from PR #3065's body):

```
fix(backlog): resolve B-0XXX ID collision — renumber <set> → B-NNNN

Per the B-0451 sweep.

## The collisions
| ID | Earlier filer | Later filer |
|---|---|---|
| ... |

## Resolution
Per external-references-rule + first-merged-wins:
- <reasoning>
→ Keep <set A>; renumber <set B> to next-free B-NNNN..

## Empirical effect
Duplicate-ID groups: N → N-K
```

Open PR with auto-merge armed:

```bash
gh pr create --title "..." --body "..."
gh pr merge <N> --auto --squash
```

## Procedure pitfalls (substrate-honest)

### Pitfall 1: BLOCKED state ≠ failed CI

After the PR opens, `gh pr view --json mergeStateStatus` may show
`BLOCKED` even when required checks are green. The cause is usually
"branch is out-of-date with main." Resolve via:

```bash
gh api -X PUT repos/Lucent-Financial-Group/Zeta/pulls/<N>/update-branch
```

(per PR #3056 tick 0024Z shard — installation-level rate-limit on
the `gate` workflow's `mise` toolchain installer can show as 8 lint
failures that are ALL `non-required check failed`; required checks
remain green; branch-update + auto-merge retry resolves.)

### Pitfall 2: Initial analysis can point wrong direction

PR #3065's first read said "keep P2 set (described by B-0092
parent body)." Re-checking the timeline + status-precedence flipped
to "keep P1 set (filed 2 days earlier, B-0370 + B-0373 shipped,
external references in PR-history + memory)." The substrate-honest
discipline is: when external-references and first-merged-wins
disagree, RE-EXAMINE both before committing.

### Pitfall 3: ID collisions hide in the substrate for weeks

The B-0444 collision survived 9 PR landings before discovery
(PR #3053). The B-0370..B-0373 collisions survived 4 days. The
audit tool (PR #3056) breaks this recursion — run it BEFORE
filing a new row, not AFTER reviewers catch the collision.

## Composes with

- `tools/bg/audit-duplicate-row-ids.ts` (PR #3056) — the detector
- `docs/backlog/P1/B-0451-...md` (PR #3056) — the sweep parent row
- PR #3053 (B-0444 — first collision resolution, established precedent)
- PR #3057 (B-0068.1 — first per-collision cleanup, simple case)
- PR #3058 (B-0090.x — batched 4 collisions in one PR)
- PR #3065 (B-0370-0373 — batched 4 collisions + parent body update)
- `.claude/rules/claim-acquire-before-worktree-work.md` — multi-Otto
  coordination discipline the audit tool addresses at the row layer
- `.claude/rules/honor-those-that-came-before.md` — recovery rather
  than discard for orphaned prior work

## Remaining work (as of 2026-05-14)

After PRs #3058 + #3065 land, the audit tool will report **3
remaining collision groups**:

- `B-0409` (3-way: wallet-immune P1 vs amara-persona-bootstrap P2 vs
  peer-call-ts-audit P2 — all 2026-05-11)
- `B-0410` (amara-ts-core P2 vs peer-call-persona-loader P2 — same date)
- `B-0411` (amara-ts-readme-courier P2 vs grok-ts-persona-flag P2 — same date)

All three are 2026-05-11 within-priority decomposition races (pre-
claim-acquire-rule). Each takes ~5-10 minutes following this
procedure. A future tick can clear them in one batched PR if
desired, or three serial PRs for cleaner review.
