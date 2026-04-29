---
id: B-0102
priority: P3
status: open
title: PR-liveness race during merge cascade — micro-class rename + mechanical guard + recovery-note format
tier: research-grade
effort: S
ask: Multi-AI synthesis packet 2026-04-29 (Deepseek + Amara filter on Otto's micro-class)
created: 2026-04-29
last_updated: 2026-04-29
composes_with: [B-0103]
tags: [github-platform, force-push, pr-aliveness, merge-cascade, micro-class-refinement]
---

# PR-liveness race during merge cascade — refinement

The 2026-04-29 autonomous-loop session arc surfaced a real GitHub
operational trap: PR #806 was unexpectedly auto-closed by GitHub
1 second after PR #808 merged, while #806's branch had been
freshly rebased + force-pushed. The branch still had 476 lines of
unique unmerged substrate. The original micro-class name
`force-push-triggers-pr-auto-close` overclaimed GitHub internals.

## Better naming (per Amara's filter)

```text
pr-liveness-race-during-merge-cascade
```

or empirically:

```text
force-push-during-merge-cascade can collapse PR uniqueness
```

Reason: the dangerous condition is not force-push alone — it's
`history rewrite + active base movement + GitHub PR
reachability/diff computation`. GitHub's "indirect merge"
detection (head reachable from base = auto-merge marker) can
race with mid-cascade rebases.

## Operational rule

```text
Do not rebase or force-push open tick-history PR branches
while adjacent auto-merge PRs are landing.

Branch protection "up-to-date" is a merge-readiness gate.
PR-aliveness is a separate head/base reachability and diff
invariant. Do not confuse them.
```

## Mechanical guard (before any force-push/rebase of an open PR)

```bash
PR=<number>

gh pr view "$PR" \
  --json number,state,headRefName,headRefOid,baseRefName,baseRefOid,mergeStateStatus,isDraft,title \
  > "/tmp/pr-$PR-before.json"
git log --oneline "origin/main..HEAD" > "/tmp/pr-$PR-unique-commits-before.txt"
git diff --stat "origin/main...HEAD" > "/tmp/pr-$PR-diff-before.txt"

# ... do the rebase / force-push ...

gh pr view "$PR" \
  --json number,state,headRefName,headRefOid,baseRefName,baseRefOid,mergeStateStatus,isDraft,title \
  > "/tmp/pr-$PR-after.json"
git log --oneline "origin/main..HEAD" > "/tmp/pr-$PR-unique-commits-after.txt"
git diff --stat "origin/main...HEAD" > "/tmp/pr-$PR-diff-after.txt"
```

## Enforcement after the action

```text
If PR state != OPEN:
  stop and recover with successor PR.

If unique commits == 0 and diff == empty:
  do not force-push again; classify as merged/covered/collapsed.

If unique commits or diff still exist but PR is closed:
  open successor PR and record old→new mapping.
```

## Recovery-note format (when opening a successor PR)

```text
old PR: #<num>
new PR: #<num>
branch: <name>
before head SHA: <sha>
after head SHA: <sha>
diff-stat proving remaining content: <output>
reason reopen failed (if applicable): <message>
```

## Why P3 (research-grade, not blocking)

The trap was caught and recovered (PR #811 successor opened
within minutes). The mechanical guard would prevent future
recurrence but isn't blocking. Promote when active drain is
clear AND the same trap recurs (composition signal).

## Composes with

- B-0103 (computed-metadata-discipline) — same family of
  agent-asserted-state vs derived-truth checks.
- The auto-merge fix in PR #811 + #814 — the safer alternative
  to manual rebase + force-push during cascade.
- `memory/feedback_outdated_review_threads_block_merge_resolve_explicitly_after_force_push_2026_04_27.md`
  — sibling force-push-affects-PR rule.
