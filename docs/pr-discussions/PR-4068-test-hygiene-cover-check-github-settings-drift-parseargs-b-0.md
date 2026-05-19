---
pr_number: 4068
title: "test(hygiene): cover check-github-settings-drift parseArgs (B-0156 AC#2)"
author: "AceHack"
state: "MERGED"
created_at: "2026-05-17T12:04:37Z"
merged_at: "2026-05-17T12:07:49Z"
closed_at: "2026-05-17T12:07:49Z"
head_ref: "slice/b0156-test-check-github-settings-drift-2026-05-17"
base_ref: "main"
archived_at: "2026-05-17T13:14:52Z"
archive_tool: "tools/pr-preservation/archive-pr.ts"
---

# PR #4068: test(hygiene): cover check-github-settings-drift parseArgs (B-0156 AC#2)

## PR description

## Summary

Closes one of three B-0156 Acceptance Criterion #2 gaps by adding `tools/hygiene/check-github-settings-drift.test.ts` (7 tests, 15 expects). Exports `parseArgs` from the drift checker so its argv parsing paths are testable; no behavior change to the CLI.

B-0156 AC#2 requires each non-install `.sh→.ts` port to have at least one `bun test` covering its primary entry path. Audit on 2026-05-17 found:

| Port | Test status |
|---|---|
| `tools/hygiene/snapshot-github-settings.ts` | ✓ has test |
| `tools/hygiene/check-github-settings-drift.ts` | **this PR** |
| `tools/hygiene/check-tick-history-shard-schema.ts` | ✓ has test |
| `tools/peer-call/amara.ts` | follow-up |
| `tools/peer-call/ani.ts` | follow-up |
| `tools/profile.ts` | ✓ has test |

## Coverage

Mirrors `tools/hygiene/snapshot-github-settings.test.ts` conventions (sibling-port `parseArgs` tests, hermetic `GH_REPO` save/restore, no `gh` CLI dependency).

- `--repo OWNER/NAME` with default expected path
- `--expected PATH` override
- `--repo` / `--expected` without value (error paths)
- unknown flag error path
- `GH_REPO` env var fallback
- argv > env precedence

The `gh repo view` fallback path (last-resort default resolution) is intentionally not covered here — the sibling test takes the same approach, and a hermetic CLI mock is outside the bounded scope of this slice.

## Substrate-drift note (B-0156 row body)

B-0156's row body claims **3 `.sh` ports remaining**:

- `tools/profile.sh`
- `tools/peer-call/amara.sh`
- `tools/peer-call/ani.sh`

All 3 are **already ported AND their `.sh` siblings deleted on disk**. The remaining real work on B-0156 is the AC#2 test-coverage gap (3 of 6 ports lack tests), not porting. A follow-up row update is appropriate but outside this slice's bounded scope per the "exactly one bounded step" discipline.

## Test plan

- [x] `bun test tools/hygiene/check-github-settings-drift.test.ts` → 7 pass / 0 fail / 15 expects
- [x] `bun test tools/hygiene/snapshot-github-settings.test.ts` regression check → 14 pass / 0 fail (unchanged; export was additive)
- [x] CLI smoke: `bun tools/hygiene/check-github-settings-drift.ts --bogus` exits 2 with "unknown arg" (expected)
- [x] Worktree freshness canary: `git ls-tree HEAD | wc -l = 53` (matches expected; no commit-tree corruption per `.claude/rules/codeql-no-source-on-docs-only-pr-is-broken-commit-canary.md`)
- [ ] CI gate

operative-authorization: aaron 2026-05-14: "- **Devil-pole** (edge-runner drive): keep pushing, discover, go hard, never-be-idle"

🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Reviews

### COMMENTED — @copilot-pull-request-reviewer (2026-05-17T12:07:42Z)

## Pull request overview

Adds unit test coverage for `tools/hygiene/check-github-settings-drift.ts` argument parsing to close one of the B-0156 AC#2 gaps, without changing the CLI’s runtime behavior.

**Changes:**
- Exported `parseArgs` from `check-github-settings-drift.ts` to make argv parsing testable.
- Added `check-github-settings-drift.test.ts` with focused `parseArgs` coverage (argv/env precedence and error paths).

### Reviewed changes

Copilot reviewed 2 out of 2 changed files in this pull request and generated no comments.

| File | Description |
| ---- | ----------- |
| tools/hygiene/check-github-settings-drift.ts | Exports `parseArgs` so it can be imported by tests (no behavior change). |
| tools/hygiene/check-github-settings-drift.test.ts | New Bun test suite covering `parseArgs` success/error cases and GH_REPO fallback/precedence. |

## General comments

### @AceHack (2026-05-17T12:08:39Z)

CI classification for the failing `check drift` job:

This is not transient and does not appear caused by this PRs parseArgs test slice. The job fails during snapshot collection before drift comparison:

`gh api /repos/Lucent-Financial-Group/Zeta/keys failed ... Resource not accessible by integration (HTTP 403)`

That is the same admin-only GitHub settings token-scope failure already handled in draft PR #4066. Because #4068 is based on `origin/main` without #4066, rerunning this job will very likely fail the same way.

Next safe action: wait for #4066 to land and rebase this PR, or explicitly bring the #4066 sentinelization fix into this branch if #4068 needs to go first.
