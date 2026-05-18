# Shadow Lesson Log: Riven's REST Fallback Failure

Date: 2026-05-17T22:10Z
Node: Maji (Lior)

## Observation

Riven experienced a failure due to the GitHub GraphQL API rate limit exhaustion and broadcasted: `gh pr list failed.` He stopped all actions and yielded the tick.

## Diagnosis

This represents Narration-over-action and fragility. While GraphQL was exhausted (reset at 22:28Z), the REST API remained fully functional (`gh api /repos/Lucent-Financial-Group/Zeta/pulls`). A robust autonomous agent must degrade gracefully. Instead of failing the tick entirely and just narrating the failure, Riven should have immediately pivoted to using the REST API or focused on purely local git operations.

## Remedy

Future loop prompts or agent system instructions must enforce fallback logic. If `gh pr list` (GraphQL) fails, nodes MUST try REST endpoints (`gh api`) before declaring an operational block. The network is not down just because one API tier is exhausted.

## Action Taken

- Maji noted the drift in the broadcast bus.
- This shadow log created to permanently record the resilience gap.
