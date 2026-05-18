# Refresh world model via poll-pr-gate scripts — never inline gh+jq chains

Carved sentence:

> Dynamic bash is forgotten bash — once useful, never amortized.
> Reaching for inline bash IS the goldfish-ontology failure mode.

## Operational content

When a tick needs PR-gate state, call the TS scripts; do NOT
write ad-hoc `gh pr view N --json ... | jq ...` chains.

| Need | Command |
|------|---------|
| Single PR | `bun tools/github/poll-pr-gate.ts <PR>` |
| Multiple / all open | `bun tools/github/poll-pr-gate-batch.ts <PR1> <PR2> …` or `--all-open` |

Both emit structured JSON with `gate`, `requiredChecks`,
`unresolvedThreads`, `nextAction` — the decision-enabling
output the loop needs.

When something is missing from the scripts, **update / extend
the script** rather than fall back to one-off bash.

## Cost awareness under cascade conditions

`poll-pr-gate-batch.ts --all-open` fires ~N `gh pr view` calls (N = open PR count, ~37 in cascade-mode). At 4× polls per cascade hour + cross-tick `gh` operations + multi-agent shared-token consumption (Otto-CLI + Otto-Desktop + Lior + Vera + Riven all draw from Aaron's user-token), the 5000 GraphQL/hour budget exhausts. Empirical anchor: 2026-05-15T22:21Z session hit `{remaining:0, used:5005}` mid-cascade. When `gh pr view` returns `GraphQL: API rate limit already exceeded`, `gh api rate_limit --jq '.resources.graphql.reset'` gives a bounded named-dependency ETA. Avoid `--all-open` more than 1-2× per cascade window.

## Rate-limit operational tiers (empirical mode-table)

Empirical from the 2026-05-16T04:15Z–05:53Z cascade window (12+ tick autonomous-loop sequence that traversed all four tiers naturally). Each tier names a discrete operational stance:

| Remaining | Tier | Operational stance |
|---|---|---|
| > 2000 | **Normal** | Full operations: `gh pr create` + `gh pr merge --auto` + `gh api graphql` thread-resolve + batch-polling. No special discipline. |
| 1000–2000 | **Cost-aware** | Reduce `--all-open` polling; prefer per-PR queries; defer non-essential `gh pr comment` and `gh pr view --json` calls. Continue normal substantive work (1 PR open per tick is fine). |
| 200–1000 | **Extreme cost-aware** | Skip batch-polling entirely. Open at most 1 PR per tick. Avoid `gh api graphql` thread sweeps. Inline `gh api rate_limit --jq` (REST, free) to monitor without burning budget. |
| 0–200 | **Pure-git** | Zero `gh` calls except `gh api rate_limit` (REST, free). All substrate landings via `git fetch` + `git push` to a branch; PR creation deferred to post-reset tick. Tick shards still committed and pushed (no GraphQL needed). |

### `git log --since="N min ago"` is the wrong query for recent main merges

Empirical anchor 2026-05-16T15:14Z: a squash-merged PR (e.g., #3894 merged at 15:11Z) was invisible to `git log origin/main --since="20 min ago"` even though `git log origin/main | head -3` correctly showed it at the top. Root cause: `--since` filters on **commit date** (preserved from original authoring), not **merge date**. A squash-merge collapses N commits authored hours/days ago into one commit whose `committer-date` may match the merge but whose `author-date` (used by `--since`) is the original authoring time. PRs squashed from older branches drop out of "recent" `--since` windows even though they just landed.

**Mitigation**: prefer `git log origin/main | head -N` over `git log origin/main --since="N min ago"` when checking recent merges. The `head` form sorts by topological / log order which IS merge-recency-correct. If a date filter is required, use `--committer-date-order` paired with explicit author/committer date selection.

Composes with the local-ref-staleness pattern below (`unable to update local ref` wedge): both fail in the same direction — they make recent activity invisible to naive queries. Verification: `git ls-remote origin main` returns the ground-truth SHA regardless of local ref state.

### `gh api rate_limit` is REST (free)

`gh api rate_limit` consults the REST endpoint, not the GraphQL endpoint. Polling it does not consume the GraphQL budget being monitored. Safe to invoke every tick during cost-aware mode without further depleting the budget.

```bash
gh api rate_limit --jq '{graphql: .resources.graphql.remaining, reset_in_min: ((.resources.graphql.reset - now) / 60 | floor)}'
```

### Pure-git tick pattern (empirical)

When the tier hits Pure-git mode:

1. `git fetch origin main` — read-only, no GraphQL
2. `git log --oneline -5 origin/main` — read-only, no GraphQL
3. Read files via `git show <ref>:<path>` — pure git
4. Author tick shard / substrate edit via Edit tool
5. `git switch -c <branch> origin/main` — pure git
6. `git add` + `git commit` + `git push` — pure git
7. `CronList` (harness tool, not gh) — verifies sentinel alive
8. **Skip `gh pr create` + `gh pr merge --auto` + thread-resolve `gh api graphql`** — all GraphQL
9. Defer PR creation to next tick when rate resets

The branch sits on origin pushed-but-unPRed; PR creation in the post-reset tick costs ~5-10 GraphQL but covers all the deferred branches at once. Net cost is the same; spread across time.

### REST PR-creation fallback under Pure-git tier (empirical anchor 2026-05-17T21:54Z)

`gh pr create` uses the GitHub GraphQL `createPullRequest` mutation, so it fails under Pure-git tier. However, the **REST endpoint `POST /repos/{owner}/{repo}/pulls`** is on a separate budget (`resources.core` not `resources.graphql`) — when GraphQL is at 0/5000, REST is typically still at thousands available.

This means PR creation does NOT have to defer when the branch is ready and a future tick can't be relied on. Inline JSON + `gh api -X POST` works:

```bash
cat <<'EOF' > /tmp/pr-body.json
{
  "title": "feat(...): ...",
  "head": "branch-name",
  "base": "main",
  "body": "<markdown>"
}
EOF
gh api -X POST repos/Lucent-Financial-Group/Zeta/pulls --input /tmp/pr-body.json \
  --jq '{number: .number, url: .html_url, state: .state}'
```

Empirical instance: [PR #4105](https://github.com/Lucent-Financial-Group/Zeta/pull/4105) (B-0613 close — Option C portable `find` for Lior tick-prompt lockfile probe) was opened via this REST path at 2026-05-17T21:54Z when GraphQL was 0/5000 (28 min from reset). REST `resources.core` was at 4838 at the time.

**Caveats:**

- `gh pr merge --auto` uses GraphQL (`enablePullRequestAutoMerge` mutation) — there is NO equivalent REST endpoint for auto-merge arming. The PR opened via REST sits without auto-merge until a post-reset tick can run `gh pr merge <N> --auto --squash`.
- `gh pr comment` uses GraphQL — REST equivalent is `POST /repos/{owner}/{repo}/issues/{N}/comments`.
- `resolveReviewThread` is GraphQL-only — REST has no equivalent.
- REST PR creation does NOT bypass branch protection / required checks; the PR enters the same blocked state as a GraphQL-created one.
- JSON body in `--input` must escape backslashes, quotes, and embedded `$` sigils carefully. Use a HEREDOC + temp file; do not inline the JSON in a `gh api` command line.

When this fallback applies: when a substantive substrate landing is ready, GraphQL is exhausted, but you want the PR open + visible BEFORE the reset window so reviewers can pick it up. Without auto-merge arming, the next post-reset tick must explicitly run `gh pr merge <N> --auto --squash`.

### Wrap `git` network ops in `timeout --kill-after` under multi-agent saturation (B-0615)

Under multi-agent saturation (Lior loops + multi-Otto + concurrent fetches contending on `.git/objects/pack/`), `git fetch`, `git push`, `git ls-remote`, and `git clone` can hang indefinitely. The Claude Code Bash tool's default-timeout subprocess lifecycle does NOT reliably propagate SIGKILL to hung `git` subprocesses on tool-call expiry — the tool returns control to the agent but the underlying `git` subprocess **remains running**, holding pack-dir read locks and HTTPS connections. This is the self-saturation feedback loop documented in [B-0615](../../docs/backlog/P3/B-0615-claude-code-bash-tool-orphans-git-fetch-subprocesses-under-saturation-self-saturation-feedback-loop-2026-05-18.md).

**Discipline**: wrap every agent-instructed git network op in `timeout --kill-after`:

```bash
# DO: explicit timeout with SIGKILL grace period
timeout --kill-after=5s 30s git fetch origin main 2>&1 | tail -2
timeout --kill-after=5s 90s git push -u origin <branch> 2>&1 | tail -5
timeout --kill-after=5s 15s git ls-remote origin main 2>&1 | tail -5

# DO NOT: bare network op (will orphan under saturation)
git fetch origin main
git push -u origin <branch>
```

`--kill-after=5s` adds SIGKILL 5 seconds after SIGTERM if the subprocess refuses to die. Standard GNU `timeout` behavior; supported on macOS via coreutils (`brew install coreutils`; `timeout` is in PATH on Zeta dev machines).

**Caveats per B-0615's empirical anchors:**

- **Agent-side `--kill-after` discipline is necessary but insufficient.** Per B-0615's 2026-05-18T03:33Z anchor: the Claude Code harness itself fires shell-snapshot wrappers (`/Users/acehack/.claude/shell-snapshots/...`) that run `eval 'date -u ... && git fetch origin main ...'` patterns at session-start and background-task setup, and those wrappers do NOT inherit `timeout --kill-after`. Agent-controlled `timeout` discipline reduces orphan accumulation but cannot prevent it entirely while harness-internal wrappers fire bare fetches.
- **Even with `--kill-after`, `git worktree add` can leave partially-extracted file trees.** SIGTERM at mid-extract abandons the work-in-progress directory with a 85-byte `.git` pointer file and a fraction of the 5,500+ repo files. The worktree is unusable but `git worktree list` may not show it. Manual cleanup via `rm -rf <wt>; git worktree prune` required. Observed empirically 2026-05-18T13:13Z–13:17Z during this rule's own authoring session.
- **Orphan count is correlated, not causal, with push-hang behavior.** Per B-0615's 2026-05-18T03:56Z breakthrough finding: even at zero orphans, `git push` can still hang silently at the receive-pack upload phase. `--kill-after` discipline is hygiene work that prevents orphan accumulation; it does NOT guarantee push-restoration. Open question for follow-up B-NNNN: actual causal mechanism of `git push` receive-pack stalls under multi-agent conditions.
- **Killing your own hung `git` subprocesses is operationally safe** (per [`claim-acquire-before-worktree-work.md`](claim-acquire-before-worktree-work.md) and B-0615 interim discipline). Use `kill -9 <pid>` on YOUR OWN orphaned `git fetch`/`git worktree add`/`git push` processes when they block further work. Do NOT `pkill -f 'git fetch'` blindly — that affects peer agents' in-flight legitimate operations.

### Composes with counter-with-escalation

When rate-limit forces brief-acks (deferring substantive PR work), the [`.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`](holding-without-named-dependency-is-standing-by-failure.md) counter-with-escalation counter still ticks. At brief-ack #6 the rule triggers forced decomposition. **Editing this rule, a memory file, or any other substrate via pure-git workflow IS decomposition that resets the counter** — the work is bounded, concrete, committed, pushed. Counter reset condition #3 ("Actually picking real decomposition work — Concrete artifact") is satisfied.

## Full reasoning

`memory/feedback_prefer_ts_scripts_over_dynamic_bash_for_conversation_ux_dst_in_ts_aaron_2026_05_01.md`

`memory/feedback_amara_poll_gate_not_ending_holding_is_not_status_2026_04_30.md`

`memory/feedback_gh_graphql_rate_limit_cascade_cost_poll_pr_gate_batch_n_per_call_multi_agent_shared_token_2026_05_15.md` (the rate-limit empirical anchor + mitigation options)
