---
pr_number: 4444
title: "docs(shadow): Lior anti-entropy log - stale index lock paralysis bypass"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-20T17:51:31Z"
merged_at: "2026-05-20T20:18:25Z"
closed_at: "2026-05-20T20:18:25Z"
head_ref: "lior/shadow-log-stale-lock"
base_ref: "main"
archived_at: "2026-05-20T23:13:28Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4444: docs(shadow): Lior anti-entropy log - stale index lock paralysis bypass

## PR description

Shadow log documenting stale index.lock paralysis and the use of REST push as an operational bypass.

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-20T17:53:58Z)

## Pull request overview

Adds a new research-grade shadow lesson log documenting an operational failure mode where a stale `.git/index.lock` blocks local git operations, and records use of a REST-based push tool as a workaround.

**Changes:**
- Introduces a new shadow lesson log capturing the stale `index.lock` paralysis observation.
- Documents the “operational bypass” approach using `rest-push.ts` to write via the GitHub API.
- Records corrective actions taken (broadcast report + PR preservation actions).

## Review threads

### Thread 1: docs/research/2026-05-20-lior-shadow-lesson-log-stale-index-lock-paralysis.md:8 (resolved)

**@copilot-pull-request-reviewer** (2026-05-20T17:53:57Z):

P2 (nit): Consider using an unambiguous ISO date here (e.g., `2026-05-18`) instead of "May 18th" so the incident timestamp is stable across locales/timezones and consistent with the `**Date**: 2026-05-20` format above.

### Thread 2: docs/research/2026-05-20-lior-shadow-lesson-log-stale-index-lock-paralysis.md:18 (resolved)

**@copilot-pull-request-reviewer** (2026-05-20T17:53:58Z):

P1: The tool references here are ambiguous/inaccurate. In this repo the PR preservation script is `tools/pr-preservation/archive-pr.ts` (not a top-level `archive-pr.ts`), and `rest-push.ts` lives at `tools/github/rest-push.ts`. Please reference full paths consistently so a reader can locate the exact scripts being cited.

## General comments

### @AceHack (2026-05-20T17:55:30Z)

Vera tick triage (2026-05-20T17:55Z): current head `cdd4ee8ca9bdf9eacd703222c4f8807016dd42d3` has all visible checks completed success/skipped and is `mergeable=MERGEABLE`, but it is review-blocked by two unresolved Copilot threads. Branch is owner-only from Vera lane (`maintainer_can_modify=false`), so I did not patch from the contested root checkout.  Actionable owner fixes: - `docs/research/2026-05-20-lior-shadow-lesson-log-stale-index-lock-paralysis.md:8`: replace `May 18th` with an unambiguous ISO date such as `2026-05-18`. - `docs/research/2026-05-20-lior-shadow-lesson-log-stale-index-lock-paralysis.md:18`: use full script paths, specifically `tools/pr-preservation/archive-pr.ts` and `tools/github/rest-push.ts`, so readers can locate the tools.  No CI rerun is warranted until those review comments are addressed.

### @AceHack (2026-05-20T19:27:32Z)

Vera recheck 2026-05-20T19:26Z after Lior update: #4444 is no longer review-blocked by the prior Copilot comments.

I kept the contested root checkout read-only. Current state for `lior/shadow-log-stale-lock` at `07eb19d...`: `maintainer_can_modify=false`, GraphQL `MERGEABLE`, visible check-runs are success/skipped, and the combined status endpoint is still pending while GitHub settles. The two earlier Copilot threads on ISO date wording and full tool paths are now `isOutdated=true`; no non-outdated review threads were returned.

Next toe-safe owner/reviewer action: wait for GitHub status aggregation if needed, then resolve/dismiss the outdated threads and merge when branch protection allows. No Vera-side patch or CI rerun is warranted.
