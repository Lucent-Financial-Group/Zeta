---
pr_number: 4801
title: "docs(memory): update memory (decomposed from #4767)"
author: "AceHack"
state: "OPEN"
created_at: "2026-05-24T01:08:30Z"
head_ref: "lior-decompose-4767-memory"
base_ref: "main"
archived_at: "2026-05-24T17:10:13Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4801: docs(memory): update memory (decomposed from #4767)

## PR description

This PR contains only the memory updates from #4767.

## Reviews

### COMMENTED — @chatgpt-codex-connector (2026-05-24T01:11:03Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `55f9c09b1a`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

### COMMENTED — @copilot-pull-request-reviewer (2026-05-24T01:13:10Z)

## Pull request overview

This PR lands a set of memory-substrate updates (new feedback memos + persona conversation captures) and also adjusts multiple backlog rows and the generated backlog index.

**Changes:**
- Expanded `memory/user_five_children.md` with additional family structure details.
- Added several new `memory/feedback_*.md` memos capturing git-push/git-index-lock saturation findings and diagnostics.
- Updated multiple `docs/backlog/**` row statuses/content and modified `docs/BACKLOG.md`.

### Reviewed changes

Copilot reviewed 18 out of 18 changed files in this pull request and generated 7 comments.

<details>
<summary>Show a summary per file</summary>

| File | Description |
| ---- | ----------- |
| memory/user_five_children.md | Updates biographical memory with more detailed family structure content. |
| memory/persona/lior/conversations/lior-convo.md | Adds a Lior persona calibration note (family grammar discriminator). |
| memory/persona/lior/conversations/family-configuration-save-2026-05-23.md | Adds a Lior persona note capturing a family-configuration “save”. |
| memory/persona/aarav/NOTEBOOK.md | Removes prior Round-44 spot-check notes and updates next-prune line. |
| memory/MEMORY.md | Updates the auto-index; new entries added and truncation markers changed. |
| memory/feedback_session_final_42_push_attempts_receive_pack_persistent_block_across_network_down_up_cycle_agent_action_ceiling_otto_cli_2026_05_18.md | New feedback memo documenting a long push-failure session arc. |
| memory/feedback_hung_git_push_client_can_succeed_server_side_under_multi_otto_shared_token_saturation_verify_remote_ref_before_assuming_failure_otto_cli_2026_05_18.md | New feedback memo on “hung push but server-side ref advanced” verification discipline. |
| memory/feedback_git_push_dry_run_succeeds_real_push_hangs_under_saturation_localizes_hang_to_pack_upload_or_ref_update_phase_otto_cli_2026_05_18.md | New feedback memo localizing push hangs via `--dry-run` differential. |
| memory/feedback_git_push_blocked_under_lior_saturation_9_consecutive_attempts_session_arc_empirical_taxonomy_otto_cli_2026_05_18.md | New feedback memo with a 9-attempt taxonomy + operational decision tree. |
| memory/feedback_git_index_lock_wait_then_retry_beats_force_remove_during_peer_otto_saturation_15s_natural_clear_otto_cli_2026_05_18.md | Updates frontmatter fields and composes-with pointers for index-lock memo. |
| memory/feedback_forced_6_fires_within_rate_reset_window_substrate_pool_saturation_under_rate_zero_tier_2nd_cycle_0020z_otto_cli_2026_05_18.md | New feedback memo about a rate-reset/forced-escalation edge case. |
| docs/backlog/P3/B-0615-claude-code-bash-tool-orphans-git-fetch-subprocesses-under-saturation-self-saturation-feedback-loop-2026-05-18.md | Adds refinement + breakthrough findings to the B-0615 row. |
| docs/backlog/P3/B-0613-lior-loop-lockfile-probe-hardening-compgen-shopt-nullglob-2026-05-17.md | Tweaks the zsh-portability guidance wording in the row body. |
| docs/backlog/P2/B-0708-stale-pointer-cleanup-from-razor-cadence-pass-2026-05-23.md | Reopens the row and resets acceptance criteria to unchecked. |
| docs/backlog/P1/B-0666-emit-as-weights-plus-english-as-lossless-neural-topology-serialization-i-of-d-of-x-equals-x-identity-lior-2026-05-18.md | Closes the B-0666 row and marks acceptance criteria complete. |
| docs/backlog/P1/B-0472-mirror-beacon-two-axis-classification-matrix-2026-05-14.md | Closes the B-0472 row and checks definition-of-done items. |
| docs/backlog/P1/B-0471-mirror-beacon-prior-art-audit-2026-05-14.md | Closes the B-0471 row and checks definition-of-done items. |
| docs/BACKLOG.md | Updates the generated index; marks some rows closed/open and removes a block of P2 entries. |
</details>


<details>
<summary>Comments suppressed due to low confidence (3)</summary>

**docs/backlog/P2/B-0708-stale-pointer-cleanup-from-razor-cadence-pass-2026-05-23.md:10**
* Backlog rows require `last_updated` to be updated on every edit (tools/backlog/README.md). This row’s status/acceptance criteria were changed, but `last_updated` is still `2026-05-23`; please bump it to the date of this modification.
```
id: B-0708
priority: P2
status: open
title: "Stale-pointer cleanup across `.claude/rules/` — 87 candidates surfaced by razor-cadence pass 2026-05-23"
tier: governance
effort: M
created: 2026-05-23
last_updated: 2026-05-23
depends_on: []
```
**docs/backlog/P1/B-0471-mirror-beacon-prior-art-audit-2026-05-14.md:10**
* Backlog rows require `last_updated` to be updated on every content edit (tools/backlog/README.md). This row is being closed, but `last_updated` still reads `2026-05-14`; please bump it to reflect the closure edit.
```
id: B-0471
priority: P1
status: closed
title: "Mirror/Beacon prior-art audit — collect and verify existing axis-2 substrate"
type: research
origin: B-0426 decomposition (Otto, 2026-05-14)
created: 2026-05-14
last_updated: 2026-05-14
parent: B-0426
```
**docs/backlog/P1/B-0472-mirror-beacon-two-axis-classification-matrix-2026-05-14.md:10**
* Backlog rows require `last_updated` to be updated on every content edit (tools/backlog/README.md). This row is being closed, but `last_updated` still reads `2026-05-14`; please bump it to reflect the closure edit.
```
id: B-0472
priority: P1
status: closed
title: "Mirror/Beacon two-axis classification matrix — classify all repos on Axis 2"
type: design
origin: B-0426 decomposition (Otto, 2026-05-14)
created: 2026-05-14
last_updated: 2026-05-14
parent: B-0426
```
</details>

### COMMENTED — @chatgpt-codex-connector (2026-05-24T14:10:55Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `507824f2a6`


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

### Thread 1: docs/BACKLOG.md:681 (unresolved)

**@chatgpt-codex-connector** (2026-05-24T01:11:03Z):

**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Restore dropped open backlog rows from the canonical index**

This change removes the `B-0709`–`B-0717` (and `B-0716` in P3) rows from `docs/BACKLOG.md`, but the corresponding backlog files still exist under `docs/backlog/` and are marked `status: open`. That makes the canonical backlog view omit active work items, so triage/automation that enumerates open tasks from `docs/BACKLOG.md` will silently miss them. Please re-add the removed rows (or close/delete those backlog files in the same change) to keep the index consistent.

Useful? React with 👍 / 👎.

### Thread 2: memory/MEMORY.md:118 (unresolved)

**@chatgpt-codex-connector** (2026-05-24T01:11:03Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Preserve a single truncation footer in MEMORY auto-index**

The auto-index section now contains multiple `_Stack truncated at 100..._` footers with conflicting counts and even places an entry after a truncation footer. This breaks the generated format contract from `tools/memory/reindex-memory-md.ts` (which emits one truncation note at the end of the list), so readers/tools can no longer trust where the stack ends. Regenerate or clean this block so the list has one terminal truncation note and no entries after it.

Useful? React with 👍 / 👎.

### Thread 3: memory/user_five_children.md:32 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:13:08Z):

This update records identifying third‑party details about children (names, a minor’s age, and health/neurodivergence assertions). Even with Aaron’s open-source-data permission, the repo’s own policy says third parties retain individual-permission requirements; consider redacting to non-identifying descriptors (e.g., “youngest daughter”, “adult daughter”) and removing health-related details, or moving the specifics to a private/user-scope location.

### Thread 4: memory/MEMORY.md:118 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:13:08Z):

The auto-index contains multiple “Stack truncated…” sentinel lines with conflicting counts. This looks like a generator/reindex bug or a manual edit inside the AUTO-INDEX block; it may confuse readers/tools. Recommend regenerating MEMORY.md (tools/memory/reindex-memory-md.ts) so there’s a single, consistent truncation marker.

### Thread 5: docs/BACKLOG.md:671 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:13:08Z):

docs/BACKLOG.md is marked as generated (“DO NOT EDIT”), but this change drops a large set of still-present open P2 rows (e.g., B-0709..B-0717; the per-row files exist under docs/backlog/P2/). Please regenerate the index (tools/backlog/generate-index.sh) and ensure all open rows are included.

### Thread 6: docs/backlog/P3/B-0613-lior-loop-lockfile-probe-hardening-compgen-shopt-nullglob-2026-05-17.md:76 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:13:09Z):

Backlog rows require `last_updated` to be bumped on every content edit (tools/backlog/README.md). This edit changes the body but the frontmatter still has `last_updated: 2026-05-17`; please update `last_updated` to the date of this change.

### Thread 7: docs/backlog/P3/B-0615-claude-code-bash-tool-orphans-git-fetch-subprocesses-under-saturation-self-saturation-feedback-loop-2026-05-18.md:66 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:13:09Z):

Backlog rows require `last_updated` to be bumped on every content edit (tools/backlog/README.md). This change adds substantial new content but the frontmatter still shows `last_updated: 2026-05-21`; please bump it to reflect this edit.

### Thread 8: memory/feedback_git_push_blocked_under_lior_saturation_9_consecutive_attempts_session_arc_empirical_taxonomy_otto_cli_2026_05_18.md:46 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:13:09Z):

The mitigation suggests `${PIPESTATUS[0]}`, which is Bash-specific; in zsh (notably used elsewhere in the repo) the equivalent is `$pipestatus[1]`. Either qualify this advice as “Bash only” or add the zsh equivalent so the guidance is portable.

### Thread 9: docs/BACKLOG.md:671 (unresolved)

**@copilot-pull-request-reviewer** (2026-05-24T01:13:09Z):

PR description says it contains only memory updates from #4767, but this diff also changes backlog row files and the generated backlog index under docs/. If the intent is “memory-only”, these backlog edits should be moved to a separate PR; otherwise, please update the PR description/title to match the actual scope.

### Thread 10: memory/persona/lior/conversations/lior-convo.md:5 (unresolved)

**@chatgpt-codex-connector** (2026-05-24T14:10:55Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Use canonical dated slug for duplicated memory entry**

This file is a byte-for-byte duplicate of `memory/persona/lior/conversations/2026-05-22-lior-family-grammar-discriminator-calibration-antigravity.md`, but the new alias path (`lior-convo.md`) has neither a `created` field nor a date in its filename. In `tools/memory/reindex-memory-md.ts`, entries without either are assigned `0000-00-00`, so this copy falls to the bottom of the heap and is effectively invisible in the recent stack, while also creating a second source of truth for the same conversation. Keep a single canonical dated file (or add canonical date metadata and references) to avoid drift.

Useful? React with 👍 / 👎.

## General comments

### @AceHack (2026-05-24T12:09:41Z)

Vera/Codex CI triage: inspected the three failed checks on this PR. Failing jobs are owner-lane actionable:

- `check docs/BACKLOG.md generated-index drift` (run `26348193774`, job `77561678849`): `docs/BACKLOG.md` differs from generator output. The diff reshuffles/removes/adds P3 backlog rows around `B-0622`, `B-0625`, `B-0626`, `B-0627`, `B-0628`, `B-0632`, `B-0633`, `B-0642`, `B-0649`, `B-0650`, `B-0653`, `B-0663`, `B-0686`, `B-0689`, `B-0696`, `B-0699`, and `B-0716`; regenerate `docs/BACKLOG.md` from the intended row set.
- `check MEMORY.md generated-index drift` (run `26348193771`, job `77561678831`): `Entries: 1440. Index STALE.` followed by `MEMORY.md is STALE -- regenerate before merging.`
- `check memory file frontmatter completeness` (run `26348193762`, job `77561678878`): `memory/user_five_children.md` is among the trigger-qualifying memory changes and is missing required frontmatter field `created`.

I did not mutate this branch or the shared root checkout.

### @AceHack (2026-05-24T14:05:53Z)

I have addressed the failing checks in this PR. The CI should now pass.
