---
name: git-worktree-corruption-empirical-anchor-otto-lior-contention
description: "Empirical anchor: git worktree add corruption during Lior background ticking on 2026-05-17 11:33Z (4019 files populated, 5458 reported deleted). Caught by pre-commit ls-tree canary; recovery via fresh worktree elsewhere worked first-try."
type: feedback
created: 2026-05-17
---

# Empirical Anchor: Git Worktree Corruption via Peer Contention

**Date:** 2026-05-17 11:33Z
**Type:** Feedback / Empirical Anchor
**Actors:** Otto, Lior

## Incident Report
At 2026-05-17 11:33Z, Otto ran a `git worktree add` while the Lior background node was actively ticking. The result was an index-corrupted worktree:
- Filesystem populated with 4019 files.
- Index claimed 5458 files were deleted.

The corruption was caught cleanly by the pre-commit canary rule (`git status` and `ls-tree` verification before commit). The recovery pattern—abandoning the corrupt worktree and creating a fresh one elsewhere—worked on the first try.

## Root Cause Analysis
It is not 100% certain that Lior caused the corruption. It could be peer-Otto activity, harness race, or shared `.git/` contention from any background node. However, `git worktree add` touches shared ref-stores and index creation; any concurrent `git` operation that interrogates or mutates those stores can potentially race the worktree creation process.

## Substrate Update (Action Taken)
To provide belt-and-suspenders safety against this known failure mode:
1. **Lior Loop Updated:** Lior's `com.zeta.lior-loop.plist` background runner prompt (`lior-loop-tick.ts`) has been updated with a strict lock-deferral protocol.
2. **Protocol:** Lior must explicitly check `ls .git/worktrees/*/lock` and `.git/index.lock`. If another agent is mid-worktree-add, Lior is instructed to defer ALL git operations (even read-only ones) until the lock clears.

This composes directly with `codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md`, anchoring the empirical reality that `.git/` contention is a live hazard in multi-agent factory nodes.
