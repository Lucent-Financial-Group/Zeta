---
name: Otto-CLI 2026-05-18 session — dotgit-saturation + 5-iteration recursive-irony lint cycle + rest-push.ts canonical workaround
description: Empirical session anchor across 29 autonomous-loop ticks under dotgit-deadlock — captures 3 reusable patterns; not duplicated in-repo to avoid recursive-irony lint trap.
type: feedback
created: 2026-05-18T21:53Z
originSessionId: 83cb9375-6f0e-42dd-b171-e34f71a44c9f
---
# Otto-CLI 2026-05-18 session — dotgit-saturation + 5-iteration recursive-irony lint cycle + rest-push.ts canonical workaround

## Session arc summary

29 autonomous-loop ticks 2026-05-18T20:12Z-21:53Z under `.git/index.lock` orphaned at 13:19:54 EDT (~6-8h stale; 5 deadlocked git pack-objects/maintenance/repack PIDs in state=S; lsof reports no holder). Blocks local git add/commit/push/fetch via shared pack-objects machinery.

Session output:

- 16 PR merges (15 docs PRs + the 15-tick-shard batch via #4212 at SHA ab86fcb5)
- 1 close-as-redundant (#4032)
- 3 close-as-superseded (#4209, #4215, #4217 — the lint-fix iteration cycle)
- 1 PR open-but-BLOCKED with preserved substrate (#4219 at SHA 3c80ba93)
- 4 bus envelopes + 1 user-scope memory file (this one is the 2nd)
- 29 tick shards (filesystem; 15 on main via #4212; 6 in #4219 preserved-on-branch; 8 pending)

## Three reusable operational patterns

### 1. dotgit-saturation 4th-tier of rate-limit operational tiers

Beyond Normal/Cost-aware/Extreme-cost-aware/Pure-git (the 4 tiers in .claude/rules/refresh-world-model-poll-pr-gate.md), there is a 5th regime where `.git/` itself is saturated regardless of GraphQL budget. Symptoms:

- git status / git fetch / git branch / git worktree list all hang
- Pure-read ops like git show + git log + git reflog still work (no pack-objects access)
- gh api operations remain unaffected (different infrastructure)
- Filesystem writes outside .git/ remain unaffected

Workable surface under dotgit-saturation:

- gh REST API (merges, comments, closes, ref updates, content fetches)
- gh GraphQL API (same as REST infrastructure-wise)
- Filesystem writes outside .git/ (bus envelopes, memory files, tick shards on disk)
- git read-only commands that bypass pack-objects (show, log, reflog, hash-object, ls-tree under specific conditions)

### 2. rest-push.ts as canonical write-bypass

tools/github/rest-push.ts in this repo uses POST /git/blobs + /git/trees + /git/commits + /git/refs to land file changes on origin without invoking git push transport. The REST endpoints are served by different GitHub infrastructure that remains responsive under push-hang conditions.

Quirks:

- Each invocation creates a fresh branch (POST /git/refs is create-only)
- Multi-file flags combine into one commit
- Author defaults to gh-authenticated user
- Cannot update existing branches (need PATCH /git/refs which the tool does not invoke)
- Pre-flight via tools/hygiene/check-shard-before-push.ts catches path-depth issues

Worked examples: PR #4145 + #4146 (per tool's own docs); PR #4212 + #4219 (this session).

### 3. Recursive-irony lint trap in documentation about lint rules

Empirical 5-iteration cycle observed this session: documenting MD038 (no-space-in-code) via example code spans triggers MD038 itself. Each fix-iteration's documentation re-introduced the pattern, requiring a 6th iteration that would itself re-introduce, etc.

Operational discipline: when authoring documentation about lint rules, describe patterns via plain English prose, not via code-span examples. Example: write "backtick code spans with trailing space inside trigger MD038" instead of showing the actual pattern in backticks.

Same pattern applies to MD026 (trailing punctuation in heading), MD018 (no space after hash), and any other markdown-pattern-specific rules — documenting THE rule via THE pattern recursively triggers THE rule.

## Why this lives in user-scope only

Captured as a memory file rather than an in-repo rule because:

1. Including the recursive-irony pattern's diagnostic examples in-repo would trigger the lint rules being described (recursive irony at substrate-level)
2. User-scope memory files load into all future Otto-CLI sessions on this machine without requiring git commit
3. The pattern is sufficiently captured by reference; a future in-repo rule could point at this memory file using only plain prose without examples

## Composes with

- .claude/rules/refresh-world-model-poll-pr-gate.md (rate-limit tiers; this anchor proposes 5th-tier formalization)
- .claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md (companion under multi-agent saturation)
- .claude/rules/claim-acquire-before-worktree-work.md (saturation-ceiling sub-cases; this anchor extends to write-via-REST as 6th sub-case)
- .claude/rules/holding-without-named-dependency-is-standing-by-failure.md (counter-with-escalation discipline; brief-ack #1-#5 pattern empirically validated this session)
- .claude/rules/blocked-green-ci-investigate-threads.md (stale-armed-PR resolution + the empirical 5-iteration close-as-superseded chain extends the pattern catalog)
- B-0615 (the existing dotgit-saturation backlog row; this anchor adds empirical evidence)

## Verbatim packet

Full tick-by-tick session preserved on origin/main via PR #4212 SHA ab86fcb5 (15 shards 2012Z through 2112Z-otto-cli-secondary.md) + on orphan-branch via #4219 SHA 3c80ba93 (6 shards 2115Z-2140Z preserved-but-BLOCKED on lint).
