---
pr_number: 3073
title: "fix(backlog): resolve B-0409 3-way collision \u2014 completes B-0451 substrate-hygiene sweep"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-14T00:20:55Z"
merged_at: "2026-05-14T00:39:35Z"
closed_at: "2026-05-14T00:39:35Z"
head_ref: "fix/b0409-3way-collision-renumber-amara-and-wallet-2026-05-14"
base_ref: "main"
archived_at: "2026-05-14T00:55:16Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #3073: fix(backlog): resolve B-0409 3-way collision — completes B-0451 substrate-hygiene sweep

## PR description

## Summary

Fifth and **FINAL** per-collision cleanup from the [B-0451](docs/backlog/P1/B-0451-duplicate-row-id-substrate-cleanup-2026-05-13.md) sweep. Three rows shared `id: B-0409`:

| Row | Filed | Scope |
|---|---|---|
| P1 wallet-immune-system | 2026-05-11 10:48 [#2709](https://github.com/Lucent-Financial-Group/Zeta/pull/2709) | Wallet immune system spec (L-effort) |
| P2 amara-persona-bootstrap | 2026-05-11 10:34 [#2704](https://github.com/Lucent-Financial-Group/Zeta/pull/2704) | B-0118 amara series atomic child |
| P2 peer-call-ts-audit | 2026-05-11 10:58 [#2706](https://github.com/Lucent-Financial-Group/Zeta/pull/2706) | B-0120 peer-call series atomic child |

## Resolution: keep peer-call series at B-0409

Per external-references rule (canonical per [#3066](https://github.com/Lucent-Financial-Group/Zeta/pull/3066) procedure):

- [B-0120 frontmatter](docs/backlog/P2/B-0120-peer-call-architecture-refactor-script-per-cli-persona-flag-2026-04-30.md) has `children: [B-0409, B-0410, B-0411, ...]` AND `depends_on: [B-0409, B-0410, ...]` — strongest references
- B-0118 has body-text mentions only (editable here)
- Wallet-immune-system has no incoming refs from other rows (composes_with B-0294/B-0321 point FROM the wallet row, not TO it)

→ Keep peer-call B-0409. Renumber others to **B-0462 + B-0463** (bumped past PR #3070's B-0459/0460/0461 reservation for B-0449 slice 5+):

```
amara-persona-bootstrap B-0409 → B-0462  (completes amara series — B-0410 → B-0457, B-0411 → B-0458 already in PR #3069)
wallet-immune-system B-0409 → B-0463
```

## Chain remap

[#3069](https://github.com/Lucent-Financial-Group/Zeta/pull/3069) left `B-0457.depends_on: [B-0409]` pointing at the soon-to-be-renumbered amara B-0409. This PR remaps it to `[B-0462]` (and updates the body-text reference per Codex+Copilot round-1 catch).

B-0118 parent body §Decomposition section updated to point at new IDs.

## Empirical effect — CASCADE COMPLETE

```
$ bun tools/bg/audit-duplicate-row-ids.ts
audit-duplicate-row-ids: 561 rows with id field, no duplicate IDs
```

**Down from 12 duplicate-ID groups at session start to 0 on main.**

[B-0451](docs/backlog/P1/B-0451-duplicate-row-id-substrate-cleanup-2026-05-13.md) cleanup progress: **11/12 → 12/12 — sweep complete.**

## Session-arc cascade rounds

| Round | PR | What | Groups |
|---|---|---|---|
| 1 | [#3053](https://github.com/Lucent-Financial-Group/Zeta/pull/3053) | B-0444 P1+P2 | 12 → 11 |
| 2 | [#3057](https://github.com/Lucent-Financial-Group/Zeta/pull/3057) | B-0068.1 | 11 → 10 |
| 3 | [#3058](https://github.com/Lucent-Financial-Group/Zeta/pull/3058) | B-0090.1-4 batch | 10 → 6 |
| 4 | [#3065](https://github.com/Lucent-Financial-Group/Zeta/pull/3065) | B-0370-0373 P2 batch | 6 → 3 |
| 5 | [#3069](https://github.com/Lucent-Financial-Group/Zeta/pull/3069) | B-0410-B-0411 amara batch | 3 → 1 |
| **6** | **(this PR)** | **B-0409 3-way (final) → B-0462/B-0463** | **1 → 0** |

## Round-1 reviewer catch already addressed

Initial commit on this branch picked B-0459/B-0460 (next-free at the time). PR #3070 then merged and reserved B-0459/0460/0461 for B-0449. Bumped to B-0462/B-0463 in commit `13f285f`. Tick shards in this PR document both the initial plan and the bump.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @chatgpt-codex-connector (2026-05-14T00:22:59Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `cc20e7c95b`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

### COMMENTED — @copilot-pull-request-reviewer (2026-05-14T00:23:40Z)

## Pull request overview

Resolves the final `B-0451` duplicate backlog-row ID collision by ensuring `id: B-0409` is uniquely owned by the peer-call series row (B-0120 child), and renumbering the other two colliding rows to new IDs while updating cross-references and the generated backlog index.

**Changes:**
- Renumbered the B-0118 child “amara persona bootstrap” from `B-0409` → `B-0459` and recorded renumber provenance in frontmatter.
- Renumbered the wallet immune system row from `B-0409` → `B-0460` and recorded renumber provenance in frontmatter.
- Updated dependent references (e.g., B-0457 `depends_on`) and regenerated `docs/BACKLOG.md` to reflect the new IDs.

### Reviewed changes

Copilot reviewed 6 out of 6 changed files in this pull request and generated 1 comment.

<details>
<summary>Show a summary per file</summary>

| File | Description |
| ---- | ----------- |
| docs/backlog/P2/B-0459-amara-persona-bootstrap-preamble-definition-ts-first-riven-2026-05-11.md | Updates `id` to `B-0459` and adds renumber provenance metadata. |
| docs/backlog/P2/B-0457-amara-ts-core-openai-api-invoke-flag-parity-ts-first-riven-2026-05-11.md | Remaps `depends_on`/`composes_with` to the renumbered preamble row (`B-0459`). |
| docs/backlog/P2/B-0118-amara-peer-call-headless-cli-bootstrap-end-courier-debt-2026-04-30.md | Updates decomposition section to reference `B-0459` and the new child set. |
| docs/backlog/P1/B-0460-wallet-immune-system-vaccine-spread-poucc-spec.md | Updates `id` to `B-0460`, adds `last_updated`, and records renumber provenance metadata. |
| docs/BACKLOG.md | Regenerates index entries to remove old `B-0409` links and add `B-0460`/`B-0459`. |
</details>

### COMMENTED — @chatgpt-codex-connector (2026-05-14T00:29:00Z)


### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `13f285fd59`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.


Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

### COMMENTED — @AceHack (2026-05-14T00:29:06Z)

_(no body)_

### COMMENTED — @AceHack (2026-05-14T00:29:10Z)

_(no body)_

### COMMENTED — @copilot-pull-request-reviewer (2026-05-14T00:30:54Z)

## Pull request overview

Copilot reviewed 7 out of 7 changed files in this pull request and generated 2 comments.

### COMMENTED — @copilot-pull-request-reviewer (2026-05-14T00:41:59Z)

## Pull request overview

Copilot reviewed 8 out of 8 changed files in this pull request and generated no new comments.


<details>
<summary>Comments suppressed due to low confidence (1)</summary>

**docs/backlog/P1/B-0463-wallet-immune-system-vaccine-spread-poucc-spec.md:14**
* The `renumbered_reason` states there were "No incoming references to wallet-immune-B-0409 from other rows" (beyond composes_with B-0294/B-0321), but there are still backlog rows that reference `B-0409` (e.g., `docs/backlog/P2/B-0413-...` and `docs/backlog/P2/B-0414-...` both have `composes_with: [B-0409]`). After this renumber, those references now resolve to the peer-call audit row, which is likely incorrect. Please either update those referencing rows to point at `B-0463` (if they meant the wallet row) and/or adjust this claim so it stays accurate.
</details>

## Review threads

### Thread 1: docs/backlog/P2/B-0457-amara-ts-core-openai-api-invoke-flag-parity-ts-first-riven-2026-05-11.md:13 (resolved)

**@chatgpt-codex-connector** (2026-05-14T00:22:59Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Align renumbered dependency with task narrative references**

This row now depends on `B-0459`, but the task text still instructs implementers to use `B-0409` as the preamble source; after this renumbering, `B-0409` is a different peer-call audit item, so following the current instructions can pull the wrong artifact and break the B-0118 child-chain intent. Please update the in-body/evidence references in this file to `B-0459` so metadata and execution guidance stay consistent.

Useful? React with 👍 / 👎.

**@AceHack** (2026-05-14T00:29:05Z):

Fixed in commit `13f285fd`: body references updated to `B-0462` (renumbered from B-0409 per B-0451 sweep). Both the prose and Evidence section are now consistent with the frontmatter `depends_on: [B-0462]`.

### Thread 2: docs/backlog/P2/B-0457-amara-ts-core-openai-api-invoke-flag-parity-ts-first-riven-2026-05-11.md:13 (resolved)

**@copilot-pull-request-reviewer** (2026-05-14T00:23:40Z):

The body text in this row still refers to the preamble coming from `B-0409` (and the Evidence section lists `B-0118 + B-0409`), but this PR renumbers that preamble row to `B-0459` and updates `depends_on`/`composes_with` accordingly. Please update the remaining in-body references so the row stays self-consistent and doesn’t send readers to the wrong backlog ID.

**@AceHack** (2026-05-14T00:29:10Z):

Fixed in commit `13f285fd`: body references updated to `B-0462` (renumbered from B-0409 per B-0451 sweep). Both the prose and Evidence section are now consistent with the frontmatter `depends_on: [B-0462]`.

### Thread 3: docs/hygiene-history/ticks/2026/05/14/0223Z.md:36 (resolved)

**@chatgpt-codex-connector** (2026-05-14T00:29:00Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Correct stale renumber IDs in the tick history shard**

This shard still records `B-0409 -> B-0459` / `B-0460` and a `B-0457.depends_on -> B-0459` remap, but this same commit actually renumbers the rows to `B-0462` and `B-0463` and updates `B-0457` to depend on `B-0462`. Leaving the old IDs in a durable hygiene-history artifact makes the cleanup provenance internally inconsistent and can mislead later audits or follow-on renumber work that uses tick shards as source-of-truth evidence.

Useful? React with 👍 / 👎.

### Thread 4: docs/hygiene-history/ticks/2026/05/14/0223Z.md:46 (resolved)

**@copilot-pull-request-reviewer** (2026-05-14T00:30:53Z):

Tick 0223Z describes the renumber as B-0459/B-0460 and the chain remap as B-0457.depends_on → B-0459, but this PR’s actual renumber/remap is to B-0462/B-0463 (see the updated backlog rows and the later 0238Z tick). Please update this tick shard to either reflect the final IDs/remap, or explicitly mark the B-0459/B-0460 plan as superseded (and point at Tick 0238Z) so the hygiene-history record doesn’t misstate what PR 3073 does.

### Thread 5: docs/hygiene-history/ticks/2026/05/14/0238Z.md:28 (resolved)

**@copilot-pull-request-reviewer** (2026-05-14T00:30:53Z):

The PR description (and earlier 0223Z tick shard) still references the intermediate renumber targets B-0459/B-0460, but the branch was bumped again to B-0462/B-0463 to avoid the PR-3070 reserved range. Please update the PR description to match the final IDs to prevent reviewers/readers from following the wrong remap instructions.

## General comments

### @chatgpt-codex-connector (2026-05-14T00:28:16Z)

You have reached your Codex usage limits for code reviews. You can see your limits in the [Codex usage dashboard](https://chatgpt.com/codex/cloud/settings/usage).
