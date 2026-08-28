---
name: tools-that-succeed-at-something-other-than-what-you-asked
description: Distinct from the vacuity class — not "a check that cannot fail" but "a command that returns success for a different act than the one requested." Eleven instances in one session; the repo has little defence against it.
metadata:
  type: reference
---

Named by a subagent 2026-08-26, and it is the session's largest structural finding:

> **The repo is well defended against checks that can't fail, and much less
> defended against tools that return success for something other than what you
> asked.**

**Two different failures.** The vacuity class is *the check passed and could not
have failed* — falsifiers, mutation testing, and the whole `toy/unmetered/metered`
ladder exist for it. This one is *the command succeeded, at something else*, and
almost nothing guards it. A non-answer wearing the costume of an answer.

**Instances measured in one session:**

| tool | returned | actually did |
|---|---|---|
| `gh pr merge --auto` | rc 0 | merged immediately (already mergeable) |
| `gh pr merge --auto` | rc 0 | nothing (draft PR — GraphQL refusal swallowed) |
| `gh pr merge --auto` | rc 0 | merged onto another agent's topic branch (unprotected base) |
| `gh run rerun` | rc 0 | replayed the ORIGINAL merge ref — cannot see a base-branch fix |
| `gh pr checks` | `fail` | check was `cancelled` — never ran |
| `statusCheckRollup` | 6 checks | 43 existed on the same SHA |
| `drift (loud)` | "drought since 08-18" | completed verdicts existed within the hour |
| empty `gh` read | `""` | treated as "PR closed"; was a transient |
| `npx tsc \| head` | rc 0 | tsc exited 1; TypeScript wasn't installed |
| `perl -pi` mutation | rc 0 | matched nothing — mutant never applied |
| `markdownlint` | rc 0 | path is in the ignore list; file never linted |
| `gh api .../logs` | empty | refused (terminal escape sequences); needs `--allow-escape-sequences` |

**How to apply — the defence is a second observation of a different kind:**

- Never infer an effect from an exit code. After `--auto`, read
  `autoMergeRequest != null`. After a rerun, read the new run's `head_sha`.
- Read exit codes **directly**, never through a pipe (`cmd | head` reports `head`).
- An empty result from a query you authored is a fact about your query. Run a
  **control** that should return something.
- A mutation that "survived" may never have applied — assert the edit landed.
- `rc=0` from a linter says nothing if the path is carved out of its config.

Same family as [[gh-pr-checks-renders-cancelled-as-fail]],
[[exit-code-2-is-a-check-that-never-ran-not-one-that-failed]],
[[gh-pr-merge-auto-does-not-always-arm-three-causes]],
[[grep-regex-dialect-errors-silently-under-report]], and
[[running-a-ci-tool-locally-without-ci-env-fakes-a-finding]] — this is the hub
they all point at.
