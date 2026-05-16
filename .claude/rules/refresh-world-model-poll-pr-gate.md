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

### Composes with counter-with-escalation

When rate-limit forces brief-acks (deferring substantive PR work), the [`.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`](holding-without-named-dependency-is-standing-by-failure.md) counter-with-escalation counter still ticks. At brief-ack #6 the rule triggers forced decomposition. **Editing this rule, a memory file, or any other substrate via pure-git workflow IS decomposition that resets the counter** — the work is bounded, concrete, committed, pushed. Counter reset condition #3 ("Actually picking real decomposition work — Concrete artifact") is satisfied.

## Full reasoning

`memory/feedback_prefer_ts_scripts_over_dynamic_bash_for_conversation_ux_dst_in_ts_aaron_2026_05_01.md`

`memory/feedback_amara_poll_gate_not_ending_holding_is_not_status_2026_04_30.md`

`memory/feedback_gh_graphql_rate_limit_cascade_cost_poll_pr_gate_batch_n_per_call_multi_agent_shared_token_2026_05_15.md` (the rate-limit empirical anchor + mitigation options)
