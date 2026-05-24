---
pr_number: 3616
title: "chore(bg): B-0502 launchd plist and docs for backlog-ready-notifier"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-15T22:58:14Z"
merged_at: "2026-05-15T23:30:51Z"
closed_at: "2026-05-15T23:30:51Z"
head_ref: "feat/b0502-launchd-plist"
base_ref: "main"
archived_at: "2026-05-16T00:14:11Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3616: chore(bg): B-0502 launchd plist and docs for backlog-ready-notifier

## PR description

Implements backlog row **B-0502** (Slice 6 of B-0441). Wires up the launchd plist for the  background service and updates the architecture documentation. Also updates the backlog row status tables to reflect that slices 3 and 5a have shipped.

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-15T22:59:41Z)

## Pull request overview

Wires up slice 6 of B-0441 (launchd plist + AUTONOMOUS-LOOP.md update for the backlog-ready-notifier background service) and brings backlog row status tables in line with what has now shipped (slices 3, 5a, and 6).

**Changes:**
- Adjust the maintainer comment in the new `com.zeta.backlog-ready-notifier.plist` to drop a reference to a non-existent `install-launchd-services.sh` and replace with manual path-update instructions.
- Update `tools/bg/README.md` "Current services" table to reflect newly-live slices for the backlog-ready notifier.
- Mark B-0502 as shipped (acceptance criteria boxes + frontmatter) and update B-0441's slice-status table to reflect 5a and 6 shipped.

### Reviewed changes

Copilot reviewed 4 out of 4 changed files in this pull request and generated 1 comment.

| File | Description |
| ---- | ----------- |
| `.gemini/launchd/com.zeta.backlog-ready-notifier.plist` | Replaces reference to a non-existent install script with manual maintenance instructions. |
| `tools/bg/README.md` | Bumps backlog-ready-notifier slice-status entry. |
| `docs/backlog/P1/B-0502-...md` | Flips status to shipped and ticks acceptance boxes. |
| `docs/backlog/P1/B-0441-...md` | Marks slices 5a (B-0501) and 6 (B-0502) as shipped in the parent row. |

### COMMENTED — @chatgpt-codex-connector (2026-05-15T22:59:52Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `76177bc375`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

### COMMENTED — @AceHack (2026-05-15T23:28:31Z)

_(no body)_

### COMMENTED — @AceHack (2026-05-15T23:28:32Z)

_(no body)_

## Review threads

### Thread 1: tools/bg/README.md:32 (resolved)

**@copilot-pull-request-reviewer** (2026-05-15T22:59:41Z):

The slice status here reads "1+2+3+4+5+6 live", but per the B-0441 status table updated in this same PR, slice 5 for the backlog-ready-notifier is split: 5a (assignment-history dedup, B-0501) is shipped, but 5.2 (agent-side `work-assignment` subscriber handler, B-0460) is still ❌ open. The shorthand "5" here implies the whole slice is live, which contradicts B-0441 and the "What's still pending" section below (lines 88-92) that lists "Slice 5 for all three — subscriber agents that react to bus envelopes" as pending. Consider writing this as `1+2+3+4+5a+6 live (5.2 pending B-0460)` to match B-0441's substrate-honest framing.

**@AceHack** (2026-05-15T23:28:31Z):

Fixed in 6ef1b491 — line now reads `1+2+3+4+5a+6 live (5.2 pending B-0460)` per your suggested phrasing. Matches B-0441's substrate-honest framing (5a = assignment-history dedup B-0501 shipped; 5.2 = `work-assignment` subscriber handler B-0460 still ❌) and stays consistent with the "What's still pending" section below.

### Thread 2: tools/bg/README.md:32 (resolved)

**@chatgpt-codex-connector** (2026-05-15T22:59:52Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Keep backlog-ready slice status aligned with pending 5.2**

Update this status to avoid overclaiming slice 5 as fully landed: this row now says `1+2+3+4+5+6 live`, but the same commit still records `5.2` (`work-assignment` subscriber handler) as open in `docs/backlog/P1/B-0441-backlog-row-ready-to-grind-notifier-background-service-2026-05-13.md` (table row for slice 5.2). Marking full `+5` here can mislead operators into thinking the subscriber path is shipped and suppress follow-up on B-0460.

Useful? React with 👍 / 👎.

**@AceHack** (2026-05-15T23:28:32Z):

Fixed in 6ef1b491 — slice-5 status updated to `1+2+3+4+5a+6 live (5.2 pending B-0460)` so it no longer suggests the subscriber path is shipped. Keeps follow-up on B-0460 visible.
