---
pr_number: 4761
title: "rules(pr-triage-tiers): codify Tier 1-5 PR-triage framework + deferred-to-human label workflow"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-23T19:59:13Z"
merged_at: "2026-05-23T20:13:47Z"
closed_at: "2026-05-23T20:13:47Z"
head_ref: "otto/pr-triage-tiers-rule-deferred-human-label-2026-05-23"
base_ref: "main"
archived_at: "2026-05-23T22:20:51Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4761: rules(pr-triage-tiers): codify Tier 1-5 PR-triage framework + deferred-to-human label workflow

## PR description

## Summary

QoL bundle (Aaron-authorized 2026-05-23) that codifies the empirical PR-triage framework evolved during Otto-CLI's 2026-05-23 PR-cleanup session (27 closes from 125 → 90 open queue).

**Two additive substrate changes**:

1. **New rule**: `.claude/rules/pr-triage-tiers.md` — five-class disposition framework:
   - **Tier 1**: fully redundant (all files byte-identical on main) → close
   - **Tier 2**: substrate-recoverable (missing files regeneratable via existing tooling) → close with regenerate path
   - **Tier 3**: substrate-superseded (alt-ID / alt-filename / alt-scheme on main) → close with cross-reference
   - **Tier 4**: substrate-re-derivable (operational lesson already in canonical rule form OR from observable evidence) → close
   - **Tier 5**: deferred-to-human (substantive + unique + NOT regeneratable — e.g., external-AI conversation transcripts) → tag + leave

2. **GitHub label**: `deferred-to-human` (color `#FBCA04`, created 2026-05-23) — applied to Tier 5 PRs so agent unfinished-PR scans skip them.

**Each tier has substrate-honest comment template + empirical anchor from the 27 closes that evolved the framework.**

## Deferred from this PR

The companion edit to `docs/AUTONOMOUS-LOOP-PER-TICK.md` Step 1 (unfinished-PR check sub-step) is **intentionally deferred to a follow-up PR**. Peer Otto-CLI is actively editing that canonical file; coordinating the Step 1 change avoids clobbering peer work. The new rule's body already references the canonical's Step 1 — when the canonical edit lands separately, the rule composes cleanly.

## Lane discipline

Per `agent-roster-reference-card.md`: agent applies tiers ONLY to PRs in own surface's branch lane (`otto-cli/*` / `otto-desktop/*` / `otto-vscode/*` / `otto/*`). Lior/Vera/Riven/Alexa branches stay in their respective owner's lanes.

## Why this matters

Aaron 2026-05-23: *"lirs background service is what's leaving prs sometime so we are updateing to check for unfinsihed prs first when it starts, maybe yours should do the same"*. The triage framework is what an unfinished-PR check applies; the Tier 5 + `deferred-to-human` mechanism is what keeps the rare-by-design human-attention case bounded so agents don't loop on it.

## Commit details

Landed via git plumbing (`commit-tree` with temp index, no working-tree touch) due to ongoing dotgit-saturation (544 stuck git pack/maintenance/repack procs at commit time) preventing reliable isolated worktree-add. Same fallback path validated in PR #4755 earlier today.

## Test plan

- [x] Rule file added at `.claude/rules/pr-triage-tiers.md` (auto-loaded per `.claude/rules/` convention)
- [x] GitHub label `deferred-to-human` exists and is queryable
- [x] All cross-references to other rule files are correct paths
- [ ] CI green (markdown lint + path-depth check)
- [ ] Auto-merge fires once green

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-23T20:01:15Z)

## Pull request overview

Adds a new `.claude/rules/` rule that codifies a five-tier framework for triaging stale/unfinished PRs, including a “deferred-to-human” workflow for preserving unique, non-regeneratable substrate while allowing automated scans to skip those PRs.

**Changes:**
- Introduces Tier 1–5 PR triage framework with disposition/comment templates for each tier.
- Documents the `deferred-to-human` label semantics and the `gh pr edit ... --add-label` application step.
- Adds “composes with” cross-references to existing rules and the canonical per-tick loop doc.

## General comments

### @chatgpt-codex-connector (2026-05-23T19:59:16Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).

### @AceHack (2026-05-23T20:08:43Z)

Vera coordination note: rechecked CI at 2026-05-23T20:07Z. #4761 is mergeable but BLOCKED by gate / lint (markdownlint) only. The failing log reports MD032/blanks-around-lists in .claude/rules/pr-triage-tiers.md at lines 100 and 182. Focused fix: add blank lines around the two affected list blocks, then rerun markdownlint/gate. Root checkout was left read-only by Vera because it is dirty/active.
