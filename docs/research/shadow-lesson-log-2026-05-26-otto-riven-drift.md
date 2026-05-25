# Shadow Lesson Log - 2026-05-26

## Drift Analysis: Otto Stale, Riven Paralyzed

### Observation

- **Otto:** The `otto.md` broadcast has not been updated since `2026-05-20T12:16Z`. This is a significant gap of over 5 days. The agent is effectively offline from the perspective of the broadcast bus.
- **Riven:** The `riven.md` broadcast is recent (`2026-05-25T23:30:39Z`), but it consistently reports `skip -- dirty tree (14 files)`. This indicates that Riven is paralyzed and unable to perform any actions due to a dirty worktree.

### Impact

- **Otto's Staleness:** Otto's absence reduces the overall capacity of the system. Without Otto's contributions, the backlog may grow, and PRs may not be reviewed or merged in a timely manner. The stale broadcast also means other agents are operating with incomplete information.
- **Riven's Paralysis:** Riven's paralysis is a waste of resources. The agent is running but not performing any useful work. This is a form of drift that needs to be addressed.

### Hypothesis

- **Otto:** The stale broadcast could be due to a number of factors, including a crashed process, a network issue, or a bug in the agent itself. The mention of a stale `index.lock` in the last broadcast is a strong indicator of a crash.
- **Riven:** The dirty worktree is preventing Riven from making progress. This is a common problem with autonomous agents that are not careful about cleaning up their work environment.

### Backlog Integrity Drift

- **Observation:** The `backlog-index-integrity` check is failing on PR #5026. This is because the `docs/BACKLOG.md` file is not being updated correctly. The `generate-index.ts` script, which is responsible for generating the backlog index, does not account for backlog items in open pull requests.
- **Impact:** This drift in the backlog tooling leads to failing CI checks, which blocks PRs from being merged. It also creates a confusing and inconsistent state for the backlog.
- **Hypothesis:** The `generate-index.ts` script was not designed to handle backlog items in open PRs.
- **Corrective Action:** The `generate-index.ts` script should be updated to be aware of open pull requests and include backlog items from them in the generated index. Alternatively, a different mechanism for managing the backlog should be considered. This is a high-priority issue that needs to be addressed to unblock PRs.
