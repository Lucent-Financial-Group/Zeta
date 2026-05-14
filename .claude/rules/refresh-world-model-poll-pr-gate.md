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

## Full reasoning

`memory/feedback_prefer_ts_scripts_over_dynamic_bash_for_conversation_ux_dst_in_ts_aaron_2026_05_01.md`

`memory/feedback_amara_poll_gate_not_ending_holding_is_not_status_2026_04_30.md`
