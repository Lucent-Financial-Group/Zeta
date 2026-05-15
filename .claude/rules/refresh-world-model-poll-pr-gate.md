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

## Full reasoning

`memory/feedback_prefer_ts_scripts_over_dynamic_bash_for_conversation_ux_dst_in_ts_aaron_2026_05_01.md`

`memory/feedback_amara_poll_gate_not_ending_holding_is_not_status_2026_04_30.md`

`memory/feedback_gh_graphql_rate_limit_cascade_cost_poll_pr_gate_batch_n_per_call_multi_agent_shared_token_2026_05_15.md` (the rate-limit empirical anchor + mitigation options)
