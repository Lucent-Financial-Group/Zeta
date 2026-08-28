---
name: shared-checkout-goes-stale-fast-and-agents-keep-reading-it
description: The shared checkout drifts ~50 commits in a few hours and has produced repeated confident false negatives — measure staleness before trusting any read from it
metadata:
  type: feedback
---

`/Users/acehack/Documents/src/repos/Zeta` is the shared VIEW. It goes stale
**fast** — measured 2026-08-24: **773 commits behind** at one point, then
fast-forwarded, then **51 commits behind again within about four hours.**

**It has produced at least three confident false negatives in one day**, all of
the same shape — a `grep`/`ls` over the stale tree returning "absent" for
something that exists on `origin/main`:

1. An ace agent's "63 files" count, taken from the stale tree.
2. A ρ-measurement agent reporting the three-family heartbeat roster
   (`alexa=qwen2.5:0.5b`, `otto=llama3.2:1b`, `soraya=gemma2:2b`)
   **did not exist**. It does, with the comment *"Heterogeneous by design."*
3. My own claim that `references/prior-art/` staleness explained an indexing
   problem — the sentinel reads differently depending which tree you check.

**Why the standing rule is not enough.** `.claude/rules/shared-checkout-is-view-only.md`
says never WRITE to it and `git pull` to refresh. Agents comply with the write
half and then *read* it without refreshing, which the rule does not forbid and
which is where the damage happens. A stale read is exactly the vacuity class:
**a check that did not run, wearing a check that passed.**

**Also measured:** `git pull` there can fail on **ref-lock contention**
(`cannot lock ref ... is at X but expected Y`) when several agents fetch
concurrently. That is the two-writers race the rule warns about, reaching even
the one sanctioned operation. Retry once; it usually clears.

## How to apply

- **Never read the shared checkout for a factual claim.** Read your own clone at
  a known ref, or `git grep <rev>` against `origin/main` explicitly.
- If you must use it, **measure its staleness first** and report the number
  beside the finding:
  `git rev-list --count $(git -C /Users/acehack/Documents/src/repos/Zeta rev-parse HEAD)..origin/main`
- **An "absent" result from any tree needs its staleness stated**, the same way a
  green rc needs its control.

Related: [[feedback_verify_the_tree_not_just_the_command_stale_tree_is_a_check_that_did_not_run]] ·
[[list-the-directory-before-grepping-for-structure]] ·
[[grep-regex-dialect-errors-silently-under-report]]
