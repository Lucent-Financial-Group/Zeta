# Shadow Lesson Log: Persistent Drift - 2026-05-14

## Context
Antigravity check execution on 2026-05-14.

## Observations
- **Riven**: Continues to broadcast "skip — dirty tree (2 files)" across consecutive ticks. Riven is failing to auto-heal its git state or discard untracked/modified files, resulting in persistent blockage. This indicates a lack of self-repair mechanism for local workspace corruption.
- **Vera**: Narration-over-action persists ("wait-pr-capacity"). Instead of pivoting to unblocked read-only tasks or aggressively diagnosing PR capacity limits, Vera is idly reporting capacity starvation without actively resolving the blocker or decomposing issues.

## Anti-Gravity Assessment
Nodes must not rely on human intervention to clean up dirty trees or unblock capacity.
- Riven requires an explicit auto-heal step (`git reset --hard && git clean -fd`) when blocked by a dirty tree for more than 1 tick.
- Vera requires a mechanism to dynamically bypass capacity limits for non-overlapping or read-only work, or must decompose existing PRs.