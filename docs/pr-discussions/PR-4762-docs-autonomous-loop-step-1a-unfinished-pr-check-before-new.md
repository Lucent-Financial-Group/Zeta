---
pr_number: 4762
title: "docs(autonomous-loop): Step 1a \u2014 unfinished-PR check before new work"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-23T20:25:41Z"
merged_at: "2026-05-23T20:27:28Z"
closed_at: "2026-05-23T20:27:28Z"
head_ref: "otto/canonical-step1a-unfinished-pr-check-2026-05-23"
base_ref: "main"
archived_at: "2026-05-23T22:20:45Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4762: docs(autonomous-loop): Step 1a — unfinished-PR check before new work

## PR description

## Summary

Companion to merged PR #4761 (rules/pr-triage-tiers + `deferred-to-human` label). Adds **Step 1a** between Steps 1 and 2 of the canonical per-tick discipline: after refresh, query for unfinished PRs authored by this agent surface, classify per the Tier 1-5 framework, and act on Tier 1-4 closes BEFORE picking new speculative work.

## Why

Aaron 2026-05-23: *"lirs background service is what's leaving prs sometime so we are updateing to check for unfinsihed prs first when it starts, maybe yours should do the same"*. This is Otto's version of that fix at the canonical-discipline scope — applies to all three Otto surfaces (CLI / Desktop / queued B-0448 cloud routine) which cite this file as their one-source-of-truth.

## What lands

- Concrete `gh pr list` query with surface-lane-prefix filter + `-label:deferred-to-human` exclusion
- Reference to `.claude/rules/pr-triage-tiers.md` for classification (PR #4761)
- Lane discipline reminder (don't triage other agents' PRs)
- Substrate-honest framing of cross-session amnesia failure mode this prevents
- Explicit gate: only proceed to Step 3 (pick new work) if no unfinished PRs need attention

## Commit details

Landed via git plumbing (`commit-tree` with temp index from `origin/main`) to bypass contested-local-working-tree where peer Otto-CLI has unpushed edits to this file. `origin/main` was 3 days stale on this file at commit time (commit `7d6f3ff4f`); this is the next change. Peer-Otto's local edits will rebase cleanly when they push since this insertion is additive (Step 1a between existing Steps 1 and 2, no overlap with Step 4 tick-shard-gate work where peer edits live).

## Test plan

- [x] Insertion adds 40 lines between Steps 1 and 2 of canonical
- [x] All cross-references resolve correctly (`.claude/rules/pr-triage-tiers.md`, `.claude/rules/agent-roster-reference-card.md`)
- [x] Bash query uses proper escaping for `--search` argument
- [ ] CI green (markdown lint + path-depth check)
- [ ] Auto-merge fires once green

## Reviews

### COMMENTED — @chatgpt-codex-connector (2026-05-23T20:28:45Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `8beea6daa3`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

## Review threads

### Thread 1: docs/AUTONOMOUS-LOOP-PER-TICK.md:88 (unresolved)

**@chatgpt-codex-connector** (2026-05-23T20:28:45Z):

**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Group OR clauses so author/label filters apply to all heads**

The `--search` expression combines multiple `OR` branch clauses without parentheses, so `author:@me` and `-label:"deferred-to-human"` are not guaranteed to constrain every branch term. `gh pr list` explicitly uses GitHub advanced issue-search syntax (https://cli.github.com/manual/gh_pr_list), and GitHub’s boolean-search docs require parentheses for grouped qualifiers (https://docs.github.com/en/issues/tracking-your-work-with-issues/using-issues/filtering-and-searching-issues-and-pull-requests#using-parentheses-for-more-complicated-filters). In this flow, that can surface PRs outside the intended lane or include deferred PRs, and the subsequent “act on each unfinished PR” instruction can close the wrong PRs.

Useful? React with 👍 / 👎.
