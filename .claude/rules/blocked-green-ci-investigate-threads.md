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

- **Direct line-level inspection**: `awk 'NR==N { print NR": ["$0"]" }' <file>`
  to read the exact bytes the reviewer is commenting on.
- **`gh api repos/.../pulls/<N>` + `git log <PR-cited-PR>`**: confirm
  historical / cross-reference claims, not memory.
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

## Full reasoning

`memory/feedback_otto_355_blocked_with_green_ci_means_investigate_review_threads_first_dont_wait_2026_04_27.md`

`memory/feedback_outdated_review_threads_block_merge_resolve_explicitly_after_force_push_2026_04_27.md`
