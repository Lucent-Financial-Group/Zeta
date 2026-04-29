# Lane A — sticky `Analyze (python)` ownership investigation

**Lane**: A — Live unblock on PR #849 (TS port of `tools/hygiene` Python scripts)
**Probe question**: Who owns the sticky `Analyze (python)` check that flips PR #849 to UNSTABLE?
**Status**: Owner identified. Closure-state proposal below.
**Last updated**: 2026-04-29T23:05:07Z

## Probe results (one probe, single-purpose)

### Failing-check identity

| Field | Value |
|---|---|
| Failing check name | `Analyze (python)` |
| Failing run id | 25134077654 (PR #849 head) |
| Workflow path | `dynamic/github-code-scanning/codeql` (GitHub-managed dynamic, NOT a checked-in workflow file) |
| Run event | `dynamic` |
| Workflow display name | `Code Quality: PR #849` |
| `isRequired` | `null` (NOT a required check under branch protection) |
| Conclusion | `failure` (configuration error: `CodeQL detected code written in GitHub Actions, C#, JavaScript/TypeScript and Java/Kotlin, but not any written in Python.`) |

### Repo-level Code Scanning state

```json
{
  "state": "not-configured",
  "languages": ["actions", "csharp", "java-kotlin", "javascript",
                "javascript-typescript", "python", "typescript"],
  "query_suite": "extended",
  "threat_model": "remote",
  "runner_type": "standard"
}
```

Repo-level Default Setup is `not-configured`. The repo-level `code-security-configuration` endpoint returns `204 No Content` — no configuration is explicitly attached to Zeta.

### Latest CodeQL analyses (verified working)

```text
csharp           (CodeQL)  2026-04-29T22:45:46Z  refs/heads/main
java-kotlin      (CodeQL)  2026-04-29T22:44:10Z  refs/heads/main
javascript-ts    (CodeQL)  2026-04-29T22:44:00Z  refs/heads/main
```

These are from the in-repo `.github/workflows/codeql.yml` per-language source-presence gate (PR #857). Python is correctly excluded by that workflow because Zeta has no Python source at root (only `tools/lean4/.lake/packages/mathlib/scripts/*.py` upstream + the two `tools/hygiene/*.py` scripts being ported in #849).

### Owner: org-level `default_for_new_repos: "all"`

LFG org Code Security has 6 configurations. Configuration `244997` ("Code Scanning enabled") carries:

```json
{
  "default_for_new_repos": "all",
  "configuration": {
    "id": 244997,
    "target_type": "organization",
    "code_scanning_default_setup": "enabled",
    "code_scanning_default_setup_options": {
      "runner_type": "not_set",
      "runner_label": null
    }
  }
}
```

This `default_for_new_repos: "all"` policy auto-applies Code Scanning Default Setup to every LFG repo, including Zeta — even though no explicit attachment shows on the `repos/Zeta/code-security-configuration` endpoint. The auto-applied Default Setup spawns the GitHub-managed dynamic Code Quality run that fires `Analyze (python)` on PR diffs containing Python paths (whether or not the in-repo workflow's `paths-ignore` filter would skip them).

PR #849's diff includes the two `tools/hygiene/*.py` scripts being deleted as part of the port → the dynamic run sees Python paths in the diff → tries to extract Python sources at repo root → fails because the `paths-ignore` filter is in `codeql-config.yml` (which the in-repo workflow honors) but the GitHub-managed dynamic run does not honor.

### Branch protection on `main`

```json
{
  "required_approving_review_count": 0,
  "dismiss_stale_reviews_on_push": false,
  "required_reviewers": [],
  "require_code_owner_review": false,
  "require_last_push_approval": false,
  "required_review_thread_resolution": true,
  "allowed_merge_methods": ["squash"]
}
```

- 0 approvals required
- All review threads must be resolved (currently 0 unresolved on #849)
- Squash-merge only

### PR #849 mergeability

| Field | Value |
|---|---|
| `state` | OPEN |
| `mergeable` | MERGEABLE |
| `mergeStateStatus` | UNSTABLE (failed checks present, but none required) |
| Required failing checks | 0 |
| Unresolved review threads | 0 |
| Auto-merge | NOT armed |

PR #849 is **mergeable** under branch protection. The UNSTABLE state reflects only the non-required `Analyze (python)` failure.

## Closure-state proposal

Per the locked Lane A closure states (4 options):

> 1. `merged`
> 2. `abandoned_with_reason`
> 3. `blocked_on_authority_action_with_exact_next_step`
> 4. `non_actionable_by_otto_with_evidence`

**Proposed state**: `non_actionable_by_otto_with_evidence` for the sticky check itself, with the next-action being a routine squash-merge that any maintainer (including Otto under standing authority) can perform.

### Evidence (per locked evidence types)

Evidence type 5 from the locked list — *"specific stale/non-required check evidence showing no further technical action needed"* — is met:

- The sticky check is `isRequired: null`
- Branch protection allows merge with non-required failing checks
- All required checks pass (23 SUCCESS at last count)
- 0 unresolved review threads
- The PR is `MERGEABLE` per GitHub's mergeability calculation

The sticky check is **noise**, not a blocker. The actual path to close Lane A is to merge PR #849 as-is.

### Why not change the org config?

Modifying `default_for_new_repos: "all"` on configuration 244997 would affect every LFG org repo, not just Zeta. Big blast radius. Alternative: detach Zeta specifically — but Zeta isn't explicitly attached, so detachment isn't the operation. Either path requires changes that go beyond the scope of unblocking #849. **Out of scope for Lane A.**

The right framing: the org-level Code Quality dynamic run is host-side noise. Zeta's in-repo `codeql.yml` (PR #857) correctly handles per-language source-presence gating. The dynamic run firing alongside is a known multi-master pattern that produces non-required failures. Living with the noise (and merging PRs despite UNSTABLE) is the operational path until/unless the org-level policy is revisited. That revisit is **not** part of Lane A — it's a separate trajectory that would belong in Lane B+ work.

## Recommended next action

Squash-merge PR #849 as-is.

- It's the TS port of `tools/hygiene/sort-tick-history-canonical.py` + `fix-markdown-md032-md026.py` (B-0086).
- All in-repo CI is green.
- The sticky `Analyze (python)` is non-required and informational only.
- Branch protection allows the merge.
- This advances the TS migration trajectory by ~3% in PR → ~3% landed (per the punch-list earlier).

The merge could proceed under standing authority. The PR is substantive code (~825 lines) so I'm flagging it here rather than auto-merging without acknowledgment — Aaron's call on whether to merge it via standing authority or to drive it manually.

Either way, **the sticky check is not the blocker** — that's the load-bearing finding from this probe.

## Composes with

- `docs/research/2026-04-29-multi-ai-troubleshooting-mode-mixing-lane-discipline-trajectory-aggregator.md` (round 1)
- `docs/research/2026-04-29-multi-ai-troubleshooting-round-2-deferred-note-destination-and-evidence-standards.md` (round 2)
- `memory/feedback_host_mutation_receipt_2026_04_29_ruleset_15256879_code_quality_removed.md` (PR #861 — earlier host mutation removed the ruleset-level code_quality severity rule; the `default_for_new_repos: "all"` policy is a different surface)
- `.github/workflows/codeql.yml` (in-repo workflow with PR #857's per-language gate)
- `.github/codeql-config.yml` (paths-ignore filter, honored by in-repo workflow but NOT by dynamic run)

## Deferred notes

(Per Amara's round-2 closing rule: deferred notes go in this file's `## Deferred notes` section rather than creating a new file. Goes here only if the deferral is durable substrate that would otherwise be lost.)

- Round-close meta-observations on review-surface health are optional. The data is in the diff. Commentary can rest for several rounds.
- The org-level `default_for_new_repos: "all"` policy is a candidate for Lane B+ trajectory work (post-#849 closure). If Lane B's trajectory enumeration walks branches/PRs/tasks, it should pick this up. Until then, parking here as a deferred note rather than a new task (per the zero-fan-out rule).
- The github-settings-drift workflow is failing on every push event (separate pre-existing tech debt). Also a Lane B+ candidate, not a Lane A subtask.
