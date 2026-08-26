# Cheap forge verbs — observe a DU, do not ad-hoc poll

*2026-08-26. Operational status: research-grade absorb of a current-state
plan; live pointer
[`docs/trajectories/own-ai-harness/RESUME.md`](../trajectories/own-ai-harness/RESUME.md).
GOVERNANCE.md §33.*

Aaron 2026-08-26: forge-host verbs for **minimal resource usage** on
anything that can fail a merge (status, comments, threads, checks).
Naive GraphQL/REST polling is expensive. Callbacks may exist.
Eventually **git goes through ZetaFS/DB** — we are our own source
control; that is another bootstrap. Harny should be tightly bound to
**discriminated-union workflows** and the **Xbox universal controller
grammar**. Ad-hoc commands exist, but the load-bearing ones are
context/DU-aware so the agent has latest state **because the verb
refreshed**, not because the model chose to.

## The cost bug

`gh pr view` + `gh pr checks --required` + `gh api` comments is N
metered calls, and an LLM tool-chooser will call a random subset.
Agreement between those calls is not evidence (they share a clock and
a quota). A merge process is a **discriminated union** (`wait-ci` |
`fix-failed-checks` | `resolve-threads` | `rebase` | `clean`). Observe
**that**. One round-trip.

Shipped this change: `observeMerge` (`github-merge-observe.ts`) —
one `POST /graphql`. Tests pin `calls.length === 1`.

## Callbacks (optional, not a hub)

GitHub can push `check_suite` / `check_run` / `pull_request_review` /
`pull_request`. That is a **listen**, not an appointed broker
(`.claude/rules/itron-hub-patent-boundary-p2p-is-the-upgrade.md`).
Observe stays correct without webhooks; webhooks only mean we do not
have to ask. Workitem `081M107N9P4087G0R0002G5SR0`.

## ZetaFS as the git bootstrap

ROADMAP item 1 (NO GIT CLI) is the same sentence as "we are our own
source control." LibGit2Sharp `zeta` + DagFs exist; factory still
execs `git`. Closing that is a bootstrap: clone-at-tag still builds
(`.claude/rules/clone-at-tag-stays-sufficient.md`); Ace never becomes
the only path; ZetaFS becomes the *good* path for Harny's sc/fs tools.
Closed-tools workitem `081M100RH3Q087G0R0018X4RSJ`.

## Harny × ActionGrid

The Xbox 4×4 (`ActionGrid.fs`) is the fixed grammar; labels change
with world state. Harny closed tools should be **cells on that grid**,
not a bag of bash. Refresh is the move, not a side quest. Workitem
`081M107N9PZ087G0R0006X16SJ`.

## Anchors

- ActionGrid / UAG: `src/Core/ActionGrid.fs`; Xbox-controller rule;
  `docs/research/2026-06-07-universal-action-grammar-xbox-controller-*`
- Cost of polling: GitHub REST/GraphQL secondary rate limits
- Webhooks: GitHub Checks API (`check_suite`, `check_run`)
- Source control without git(1): LibGit2Sharp `zeta`, DagFs, ROADMAP item 1
