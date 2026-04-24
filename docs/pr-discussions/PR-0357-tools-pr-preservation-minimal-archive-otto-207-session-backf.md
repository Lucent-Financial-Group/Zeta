---
pr_number: 357
title: "tools: PR-preservation minimal archive + Otto-207 session backfill (10 PRs)"
author: "AceHack"
state: "OPEN"
created_at: "2026-04-24T11:23:49Z"
head_ref: "tools/pr-preservation-phase-2-minimal"
base_ref: "main"
archived_at: "2026-04-24T13:21:06Z"
archive_tool: "tools/pr-preservation/archive-pr.sh"
---

# PR #357: tools: PR-preservation minimal archive + Otto-207 session backfill (10 PRs)

## PR description

## Summary

Maintainer Otto-207: *"are we saving these yet gitnative and have we backfilled them yet?"*

Honest answer was NO. The PR-preservation BACKLOG row (Otto-150..154, PR #335 in queue elevating to P1 + phased plan) specifies the discipline but never shipped capture tooling. This PR ships **Phase 0 minimal viable implementation** + **backfills 10 PRs** from this session.

## Tool

`tools/pr-preservation/archive-pr.sh` — one-shot bash script:

- Fetches review threads + reviews + comments via `gh api graphql`
- Writes `docs/pr-discussions/PR-<N>-<slug>.md` with YAML frontmatter
- Sections: PR description · Reviews · Review threads (with resolved/unresolved) · General comments
- No external deps beyond `gh` + `python3` stdlib + `bash 4+`

## Backfill (10 PRs this session)

| PR | Status | Threads | Reviews | Comments |
|---|---|---|---|---|
| #354 backlog-split Phase 1a | OPEN | 20 | 16 | 1 |
| #352 Server Meshing research | OPEN | 6 | 8 | 0 |
| #336 KSK naming doc | OPEN | 8 | 8 | 1 |
| #342 calibration-harness design | MERGED | 5 | 1 | 1 |
| #344 Amara 19th ferry absorb | MERGED | 8 | 1 | 1 |
| #346 DST compliance criteria | MERGED | 5 | 1 | 1 |
| #350 Frontier rename pass-2 | MERGED | 4 | 2 | 0 |
| #353 BACKLOG split design | MERGED | 6 | 1 | 0 |
| #355 Codex peer-review absorb | MERGED | 5 | 1 | 1 |
| #356 PR-resolve-loop row | MERGED | 5 | 1 | 0 |

Total: 72 threads + 40 reviews + 6 comments across ~97KB markdown.

## Long-term plan (per maintainer directive)

Remaining phases kept in the PR-preservation BACKLOG row (PR #335 in queue):

- **Phase 1** — GHA workflow on merge (automatic archive)
- **Phase 2** — historical backfill (all merged PRs)
- **Phase 3** — reconciliation (drift detection)
- **Phase 4** — redaction layer (privacy-pass for human-reviewer comments)

Scope out of this PR per maintainer *"make sure you backlog then to a proper long term solution"*.

## Composes with

- Otto-204c livelock-diagnosis (the gap this closes part of)
- Otto-204 PR-resolve-loop skill (this is step 4 of its 6-step cycle)
- PR #335 PR-preservation elevation (authoritative phased plan)

## Test plan

- [x] Script runs cleanly on test PR (#354)
- [x] Shellcheck exit 0 (SC2016 single-quote in GraphQL is intentional)
- [x] Output format validated across 10 varied PRs
- [x] No external dependencies beyond gh CLI + python3 stdlib

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @chatgpt-codex-connector (2026-04-24T11:25:56Z)

### 💡 Codex Review

Here are some automated review suggestions for this pull request.

**Reviewed commit:** `cc217ae031`


<details> <summary>ℹ️ About Codex in GitHub</summary>
<br/>

[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you
- Open a pull request for review
- Mark a draft as ready
- Comment "@codex review".

If Codex has suggestions, it will comment; otherwise it will react with 👍.




Codex can also answer questions or update the PR. Try commenting "@codex address that feedback".

</details>

### COMMENTED — @copilot-pull-request-reviewer (2026-04-24T11:28:45Z)

## Pull request overview

Adds a minimal, git-tracked PR-conversation preservation tool (`tools/pr-preservation/archive-pr.sh`) and backfills 10 PR discussion archives into `docs/pr-discussions/`, aligning with the project’s “git-native preservation” direction.

**Changes:**
- Add a one-shot bash + `gh api graphql` + Python-stdlib script to export PR metadata, reviews, review threads, and general comments into markdown files under `docs/pr-discussions/`.
- Add usage + output-schema documentation for the preservation tool.
- Commit 10 backfilled PR archive markdown files for this session.

### Reviewed changes

Copilot reviewed 12 out of 12 changed files in this pull request and generated 7 comments.

<details>
<summary>Show a summary per file</summary>

| File | Description |
| ---- | ----------- |
| tools/pr-preservation/README.md | Documents scope, usage, and the intended archive schema/location for PR preservation. |
| tools/pr-preservation/archive-pr.sh | Implements the PR fetch + markdown archive writer via GitHub GraphQL + Python formatting. |
| docs/pr-discussions/PR-0356-backlog-otto-204-pr-resolve-loop-skill-close-the-pr-cycle-au.md | Backfilled archive for PR #356 discussion content. |
| docs/pr-discussions/PR-0355-ferry-codex-first-completed-peer-agent-deep-review-absorb-4.md | Backfilled archive for PR #355 discussion content. |
| docs/pr-discussions/PR-0354-tools-backlog-split-phase-1a-generator-schema-example-row-aa.md | Backfilled archive for PR #354 discussion content. |
| docs/pr-discussions/PR-0353-docs-backlog-md-split-design-phase-0-aaron-otto-181-3rd-ask.md | Backfilled archive for PR #353 discussion content. |
| docs/pr-discussions/PR-0352-backlog-otto-180-server-meshing-spacetimedb-deep-research-ga.md | Backfilled archive for PR #352 discussion content. |
| docs/pr-discussions/PR-0350-docs-frontier-rename-pass-2-hindu-ff7-egyptian-greek-norse-s.md | Backfilled archive for PR #350 discussion content. |
| docs/pr-discussions/PR-0346-docs-dst-compliance-criteria-dst-held-foundationdb-grade-bar.md | Backfilled archive for PR #346 discussion content. |
| docs/pr-discussions/PR-0344-ferry-amara-19th-absorb-dst-audit-5-5-corrections-10-tracked.md | Backfilled archive for PR #344 discussion content. |
| docs/pr-discussions/PR-0342-docs-calibration-harness-stage-2-design-amara-18th-ferry-b-f.md | Backfilled archive for PR #342 discussion content. |
| docs/pr-discussions/PR-0336-docs-ksk-naming-definition-doc-canonical-expansion-locked-ot.md | Backfilled archive for PR #336 discussion content. |
</details>

## Review threads

### Thread 1: tools/pr-preservation/archive-pr.sh:60 (unresolved)

**@chatgpt-codex-connector** (2026-04-24T11:25:56Z):

**<sub><sub>![P1 Badge](https://img.shields.io/badge/P1-orange?style=flat)</sub></sub>  Paginate GraphQL connections before writing archive**

The archive query hard-limits review threads and nested comments (`first: 100` / `first: 50`) without checking `pageInfo.hasNextPage` or following cursors, so high-activity PRs are silently truncated in the generated markdown. This breaks the stated preservation/audit goal because archives can look complete while dropping part of the discussion; the same pattern appears for reviews and general comments later in the query as well. Please paginate each connection (or fail loudly when truncated) before emitting the archive file.

Useful? React with 👍 / 👎.

### Thread 2: tools/pr-preservation/archive-pr.sh:107 (unresolved)

**@chatgpt-codex-connector** (2026-04-24T11:25:56Z):

**<sub><sub>![P2 Badge](https://img.shields.io/badge/P2-yellow?style=flat)</sub></sub>  Validate pullRequest exists before dereferencing fields**

The script assumes `d['data']['repository']['pullRequest']` is always present and immediately calls `pr.get(...)`, but GitHub GraphQL can return valid JSON with `pullRequest: null` (for example, an invalid PR number or missing access). In that case this path crashes with a Python traceback instead of the script's documented fetch-failure handling, making operational failures noisy and non-actionable for operators.

Useful? React with 👍 / 👎.

### Thread 3: tools/pr-preservation/archive-pr.sh:49 (unresolved)

**@copilot-pull-request-reviewer** (2026-04-24T11:28:44Z):

P0: With `set -e`, if `gh api graphql` exits non-zero (auth failure, network error), the script aborts immediately and never reaches the intended “fetch failed …” diagnostics / exit-code mapping. Wrap the `gh api graphql … > "$TMP"` call in an explicit error-handling block so failures produce a clear message and the documented exit code (2).

### Thread 4: tools/pr-preservation/archive-pr.sh:108 (unresolved)

**@copilot-pull-request-reviewer** (2026-04-24T11:28:44Z):

P0: The JSON check only validates that the response is parseable JSON; GraphQL error payloads (or `pullRequest: null`) will pass this check and then the Python block will crash on `d['data']...` / `pr.get(...)` with a stack trace. Detect `errors` in the response and/or a null `pullRequest` and exit 2 with a concise error message (e.g., not found / permission / auth).

### Thread 5: tools/pr-preservation/archive-pr.sh:47 (unresolved)

**@copilot-pull-request-reviewer** (2026-04-24T11:28:44Z):

P1: The GraphQL query hard-codes `repository(owner: "Lucent-Financial-Group", name: "Zeta")`, so the script won’t work when run from forks or after a repo transfer/rename. Consider deriving owner/name from `gh repo view --json owner,name` (or `gh repo set-default`) and pass them as GraphQL variables.
```suggestion
OWNER="$(gh repo view --json owner --jq '.owner.login')"
REPO_NAME="$(gh repo view --json name --jq '.name')"

TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

gh api graphql -F owner="$OWNER" -F name="$REPO_NAME" -F number="$PR" -f query='
  query($owner: String!, $name: String!, $number: Int!) {
    repository(owner: $owner, name: $name) {
```

### Thread 6: tools/pr-preservation/archive-pr.sh:90 (unresolved)

**@copilot-pull-request-reviewer** (2026-04-24T11:28:44Z):

P1: The script and header comment say it writes “all review threads + reviews + comments”, but the GraphQL query is capped at `reviewThreads(first: 100)`, per-thread `comments(first: 50)`, `reviews(first: 50)`, and `comments(first: 100)` with no pagination. Either implement pagination (pageInfo/endCursor loops) or record in the output/frontmatter that results may be truncated at these limits.

### Thread 7: tools/pr-preservation/archive-pr.sh:134 (unresolved)

**@copilot-pull-request-reviewer** (2026-04-24T11:28:45Z):

P1: YAML frontmatter values like `author`, `head_ref`, and `base_ref` are emitted without quoting/escaping. Some valid ref names can include `#` or `:` which would break YAML parsing (treating the remainder as a comment or creating a mapping). Emit these scalars using a safe quoting routine (e.g., JSON-style quoting) for all string fields, not just `title`.
```suggestion
lines.append(f'author: {json.dumps((pr.get("author") or {}).get("login") or "unknown")}')
lines.append(f'state: {json.dumps(pr.get("state") or "")}')
lines.append(f'created_at: {json.dumps(pr.get("createdAt") or "")}')
if pr.get('mergedAt'):
    lines.append(f'merged_at: {json.dumps(pr.get("mergedAt") or "")}')
if pr.get('closedAt'):
    lines.append(f'closed_at: {json.dumps(pr.get("closedAt") or "")}')
lines.append(f'head_ref: {json.dumps(pr.get("headRefName") or "")}')
lines.append(f'base_ref: {json.dumps(pr.get("baseRefName") or "")}')
lines.append(f'archived_at: {json.dumps(archived_at)}')
```

### Thread 8: tools/pr-preservation/README.md:33 (unresolved)

**@copilot-pull-request-reviewer** (2026-04-24T11:28:45Z):

P0: README says archives are written to `docs/pr-discussions/PR-<N>-<slug>.md`, but the script actually writes `PR-<N>` zero-padded to 4 digits (e.g., `PR-0356-...`). Update the documented filename pattern so operators can reliably locate files and avoid accidental duplicates.

### Thread 9: docs/pr-discussions/PR-0352-backlog-otto-180-server-meshing-spacetimedb-deep-research-ga.md:68 (unresolved)

**@copilot-pull-request-reviewer** (2026-04-24T11:28:45Z):

P0: The backfilled `docs/pr-discussions/*.md` files include whitespace-only lines (e.g., after “Reviewed commit”) which violate markdownlint MD009 (no trailing spaces). Since the CI job runs markdownlint over `**/*.md` and `docs/pr-discussions/**` isn’t ignored, this will likely fail CI unless the archive output is normalized or the directory is added to `.markdownlint-cli2.jsonc` ignores (similar to `docs/amara-full-conversation/**`).
```suggestion

```
