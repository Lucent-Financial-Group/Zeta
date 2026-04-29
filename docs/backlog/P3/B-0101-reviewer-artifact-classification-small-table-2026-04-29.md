---
id: B-0101
priority: P3
status: open
title: Reviewer-artifact classification — small 5-bucket table (Copilot + future review agents)
tier: research-grade
effort: S
ask: Multi-AI synthesis packet 2026-04-29 (Deepseek + Amara filter)
created: 2026-04-29
last_updated: 2026-04-29
composes_with: [B-0098, B-0099, B-0100]
tags: [code-review, copilot, reviewer-noise, taxonomy, classification]
---

# Reviewer-artifact classification — small 5-bucket table

The autonomous-loop is now effectively a two-agent loop: the
acting agent (Otto / Claude) + the reviewing agent (Copilot
pull-request-reviewer, plus increasingly cross-AI peers). The
review agent has its own failure modes that the acting agent
needs to distinguish from real findings.

Recent recurring reviewer-failure patterns from this session:

- `display-artifact` — Copilot hallucinated "leading space and
  `1 ||`" prefix that wasn't in the actual file.
- `time-travel-review-artifact` — reviewer evaluated a PR snapshot
  before cited dependency PRs merged; the reference was valid on
  current main.
- `incomplete-cited-context` — the reviewer's snippet was correct
  but not load-bearing for the issue; trusting it without
  re-reading the full file caused an over-correction
  (the 2026-04-29 ordinal-drift cascade).

## Proposed small classification table (5 buckets, intentionally
## small per Amara's filter)

```text
REAL_DEFECT
  - actual code/doc/test issue caught by reviewer
  - action: fix in current PR

REVIEWER_SNAPSHOT_LAG
  - reviewer evaluated a stale snapshot of repo state
  - cited reference is now valid on current main
  - action: comment with merged SHAs, resolve thread

DISPLAY_ARTIFACT
  - reviewer's quoted excerpt contains characters not in source
  - benign hallucination from review-tool rendering
  - action: resolve with brief explanatory comment

INCOMPLETE_CONTEXT
  - reviewer's cited snippet is correct but not load-bearing
  - fix should re-read full file before applying
  - action: read full source, decide if fix is real or no-op

NEEDS_HUMAN_REVIEW
  - reviewer flagged something the acting agent can't classify
  - action: leave thread open, surface to maintainer
```

## Where this lands

Two options:

1. **As a memory file** — `memory/feedback_reviewer_artifact_classification_5_buckets_2026_04_29.md` —
   gives future-Claude a quick decision tree.

2. **As a section in a code-review skill** — embed in
   `.claude/skills/code-reviewer/` or similar, so the
   classification is invoked at decision time, not lookup
   time.

Decision deferred to whoever picks up the action item.

## Why P3

The classification works informally now — most reviewer findings
get correctly classified by acting-agent judgment. Codifying it
hardens the discipline but isn't blocking. Promote when active
drain is clear.

## Composes with

- B-0098, B-0099, B-0100 — sibling actionables from the same
  packet.
- `memory/feedback_otto_355_blocked_with_green_ci_means_investigate_review_threads_first_dont_wait_2026_04_27.md`
  — the BLOCKED-with-green-CI rule that makes review-thread
  triage a load-bearing tick step.
- `memory/feedback_outdated_review_threads_block_merge_resolve_explicitly_after_force_push_2026_04_27.md`
  — outdated-thread resolution discipline; partially overlaps
  with REVIEWER_SNAPSHOT_LAG.
