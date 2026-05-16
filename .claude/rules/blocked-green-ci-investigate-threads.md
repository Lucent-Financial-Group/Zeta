# BLOCKED-with-green-CI means investigate unresolved threads first

Carved sentence:

> The block is virtually never opaque — it's almost always a
> small countable set of threads with addressable findings.

## Operational content

When `bun tools/github/poll-pr-gate.ts <PR>` reports
`gate: "BLOCKED"` AND `requiredChecks.failed: 0` AND
`autoMerge: "armed"`:

1. Check `unresolvedThreads` in the same JSON payload **FIRST**.
2. Filter on `isResolved == false` only — outdated unresolved
   threads (after a force-push) STILL block merge under
   `required_conversation_resolution` and must be explicitly
   resolved.
3. The block is almost always a small set of threads. Address
   the findings; don't just wait.

**Failure mode**: outputting "gated wait" or "Holding" more
than once without having run the threads query. If this happens,
stop and run it.

## Composes with: verify-before-fix on reviewer findings

Once threads are surfaced, **verify each finding against the
source before applying a fix**. Reviewer tools (Copilot, etc.)
produce real findings AND hallucinations; treating both as
equally actionable wastes commits and can introduce regressions.

Verification anchors:

- **Direct line-level inspection**: substitute the literal line number for
  `<N>` via `-v` — `awk -v N=22 'NR==N { print NR": ["$0"]" }' <file>` —
  to read the exact bytes the reviewer is commenting on. (Without
  `-v N=…`, awk treats `N` as an uninitialized variable equal to 0 and
  prints nothing.)
- **`gh api repos/<owner>/<repo>/pulls/<N>`** to fetch PR metadata
  (state, merge_commit_sha, head SHA); **`gh pr view <N> --json
  commits,mergeCommit`** to inspect commits; plus
  `git log --grep '#<N>'` to find the merge commit by PR-number in the
  local repo: confirm historical / cross-reference claims, not memory.
  (Plain `git log <N>` does NOT work — git log expects
  refs/commits/paths, not PR numbers.)
- **Local lint/build**: re-run the relevant check locally to see
  if the reviewer's failure-mode reproduces.

### Suspect-by-default Copilot finding classes

Empirical patterns observed multiple times during a single
autonomous session (2026-05-16) where Copilot reported a
finding that direct inspection confirmed as false:

| Class | Reviewer claim | Reality |
|-------|----------------|---------|
| Table double-pipe (`\|\|`) | "extra leading `\|` in tables creates empty first column" | Direct `awk` shows single `\|` rows; 4 confirmed FPs in one session (PR #3685, #3690, #3699-era, #3709) |

When a thread matches a known-FP class:

1. Verify via direct inspection (don't trust the reviewer's quote)
2. If confirmed FP, resolve no-op with a brief comment OR just resolve
3. Do NOT push a fix that would change correct content

This list is empirical; new FP classes get appended as they
accumulate evidence. A single FP doesn't justify entry —
two-or-more across distinct PRs is the threshold for
"suspect-by-default."

### Verify-also-on-stale-but-fresh-looking findings

A second class: findings that were TRUE at thread-filing time
but became STALE by review-resolution time. Common cases:

- Parent-tick links to shard files in sibling PRs — the link
  is broken at file-tree time but resolves once the sibling
  PR merges. The thread is filed correctly but resolution-time
  state has self-healed.
- "Inconsistency between X status and Y status" prose
  observations — true at write-time, accurate then,
  but the underlying state has moved.

Resolve these no-op (the prose was correct at write-time;
substrate edits would be retroactive rewriting). Stale ≠
false; it just means the action window closed.

### Stale-armed-PR resolution patterns

Empirical anchor 2026-05-16T13:10Z-16:33Z (one session, 5 stale-armed PR investigations):

A stale-armed PR is one with auto-merge armed for hours/days where checks fail or merge conflicts persist. Investigation per this rule typically classifies it into one of three resolution patterns:

| Pattern | Apply when | Empirical instance |
|---|---|---|
| **Close as redundant** | The PR's substrate already exists on `main` via a different PR (byte-identical file paths, or content shipped via newer PR). Close with substrate-honest comment + cross-link to the merged equivalent. Preserves alternate-content version in branch history per [`lost-files-surface`](lost-files-surface.md) | [#3823](https://github.com/Lucent-Financial-Group/Zeta/pull/3823) — 07:58Z shard already on main via different PR; closed at 13:31Z |
| **Re-land via cherry-pick** | The PR's substrate is genuinely new but the branch is too stale to merge (CI fails on unrelated evolved files, merge conflicts on regenerated index files). Cherry-pick the substrate onto a fresh branch off current main, manually re-apply auto-generated files via the generator (e.g., `bun tools/backlog/generate-index.ts`), fix any lint issues that surface | [#3817 → #3894](https://github.com/Lucent-Financial-Group/Zeta/pull/3894) (B-0558 worktree-pool); [#3779 → #3904](https://github.com/Lucent-Financial-Group/Zeta/pull/3904) (0630Z shard re-land) |
| **Forward-signal comment** | The PR is too large (e.g., 61 files in [#3545](https://github.com/Lucent-Financial-Group/Zeta/pull/3545)) or otherwise impractical to re-land in a single tick. Leave a comment naming the two viable resolution paths (rebase OR cherry-pick) AND flagging any newer PRs that may supersede the substrate. Forward signal for whoever picks it up next | [#3545](https://github.com/Lucent-Financial-Group/Zeta/pull/3545#issuecomment-4467314174) — DIRTY 19+ hr, 61-file conflict |

**Decision tree** (in order):

1. Does the substrate already exist on `main` via a different PR? → **Close as redundant**
2. Is the substrate small enough to re-land in 1-2 ticks? → **Re-land via cherry-pick**
3. Otherwise → **Forward-signal comment** (the PR sits until someone else has the budget)

Composes with [`refresh-world-model-poll-pr-gate.md`](refresh-world-model-poll-pr-gate.md) rate-limit tiers — re-land requires normal-tier GraphQL budget; forward-signal works at any tier.

## Full reasoning

`memory/feedback_otto_355_blocked_with_green_ci_means_investigate_review_threads_first_dont_wait_2026_04_27.md`

`memory/feedback_outdated_review_threads_block_merge_resolve_explicitly_after_force_push_2026_04_27.md`
