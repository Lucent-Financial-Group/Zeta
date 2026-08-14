# GraphQL is the scarce budget — and `enablePullRequestAutoMerge` has no REST form

**Ferried** 2026-08-13 from Aaron, on the heartbeat failures:

> we also want to avoid using graphql everywhere possible that's what rate limits us we need to desing
> around this antoher reason for moving away from the PRs asap

Correct, and it is measurable rather than a matter of taste. This records the measurement, the specific
GraphQL-only operation that is causing today's failures, and why it converges with the move off PRs.

## The measurement (CHECKED, 2026-08-13)

```
gh api rate_limit
  core    (REST):    24 used / 5000
  graphql        : 1111 used / 5000   ← 22% of the hourly budget
```

**GraphQL was being consumed ~46× faster than REST.** The two budgets are separate — REST is counted in
*requests*, GraphQL in *points* scaled by query complexity — so a workload can be nowhere near the REST
limit while approaching exhaustion on GraphQL.

Cost of the same information, measured directly:

| call | GraphQL points | returns |
|---|---|---|
| `gh pr view N --json state,mergeStateStatus` | **2** | state, merge state |
| `gh api repos/O/R/pulls/N --jq '{state,mergeable,mergeable_state}'` | **0** | the same three facts |

The REST form is free on the scarce budget and carries the same content. `mergeable_state` is the REST
spelling of `mergeStateStatus` (`clean`/`blocked`/`dirty`/`unknown`).

**Self-implication, stated because it is the largest single contributor found:** the autonomous tick loop
has been polling 4–6 PRs per tick with `gh pr view` *and* `gh pr checks`, both GraphQL, on a ~2-minute
cadence for a full session. At ~2 points per call that is on the order of 16–24 points per tick, and
plausibly most of the 1111 observed. **The monitoring was more expensive than the work it monitored** —
and it was invisible because REST looked idle.

## Which `gh` surfaces are GraphQL vs REST

**GraphQL (expensive):** `gh pr view --json`, `gh pr checks`, `gh pr list --json`, and
`gh pr merge --auto` (the `enablePullRequestAutoMerge` mutation).

**REST (free on that budget):** `gh api repos/…`, `gh run list` / `gh run view` (the Actions API is
REST), and `gh pr merge --squash` *without* `--auto` (`PUT /repos/{owner}/{repo}/pulls/{n}/merge`).

## The structural point — auto-merge arming is GraphQL-only, so it cannot be made cheap

This is the part that turns a cost observation into a design argument.

**`enablePullRequestAutoMerge` exists only as a GraphQL mutation. There is no REST endpoint for it.** So
"arm auto-merge" cannot be optimised onto the cheap budget — the only way to avoid its cost is to not do
it.

Which produces an unexpected convergence with today's failures. The `society-heartbeat` workflow fails
**every run** with:

```
flush-via-staging: arm auto-merge failed (PR #10397 reused):
  GraphQL: Resource not accessible by personal access token (enablePullRequestAutoMerge)
exit code 3
```

So the *same operation* is (a) the one the scoped PAT cannot perform, (b) GraphQL-only and therefore
un-cheapenable, and (c) not actually load-bearing — the flush has already succeeded by the time arming is
attempted. **Three independent reasons to remove the same call**, which is about as strong a signal as a
design gets.

## Why this is another argument for moving off PRs

Aaron has wanted the move off PRs for other reasons — heartbeats should be close to free, gate as little
as possible, hand off to the next reviewer rather than blocking. This adds a mechanical one:

**A PR is a GraphQL-shaped object.** Creating it, checking its state, checking its checks, and arming its
merge are all on the expensive budget, and the most useful of those has no cheap form at all. A telemetry
flush that pushes to an **ungated branch** needs *no* PR, and therefore no GraphQL: it is a git push plus,
at most, a REST merge.

`heartbeat/*` is already ungated (deletion rule only) and already used this way. So the cheap path exists
today; the expensive path is being taken out of habit and because the gate on `main` forced it once.

## What to do, cheapest first

1. **Stop arming auto-merge in the heartbeat flush.** It is failing, it is GraphQL-only, and the flush
   does not need it. Warn and exit 0 — but do *not* silently queue: a PR created and never merged
   accumulates telemetry invisibly, which is how #10397 came to sit open. Either merge via REST when
   checks pass, or say loudly that a PR is waiting.
2. **Move the monitoring loop to REST.** `gh api repos/O/R/pulls/N` for state,
   `gh api repos/O/R/commits/SHA/check-runs` for checks, `gh run list` is already REST. Zero behaviour
   change, ~all of the observed GraphQL consumption removed.
3. **Prefer push-to-ungated-branch over PR** for machine-generated content (telemetry, archives,
   heartbeats). Reserve PRs for changes that genuinely want review.
4. **Measure before and after.** `gh api rate_limit` is one REST call and settles the question; this
   document exists because a measurement was cheaper than an argument.

## Honest limits

- **The 1111 figure is a snapshot**, not an attribution. Other agents and sessions share the account's
  budget; the tick loop is the largest *identified* contributor, not a proven majority. A proper
  attribution would need per-caller accounting, which does not exist.
- **REST is not free, only separately budgeted.** Moving everything to REST trades one limit for another;
  at 24/5000 there is enormous headroom today, but a design that assumes REST is unlimited will fail
  later for the same reason.
- **`mergeable_state` is documented as somewhat unstable** and can return `unknown` while GitHub computes
  it — the same is true of the GraphQL field, but a REST-based poller should expect it and retry rather
  than treat `unknown` as a state.

## Pointers

- `src/Core.TypeScript/forge-host/github/flush-via-staging.ts` — the shared flush module behind both
  failing heartbeat workflows
- `.github/workflows/society-heartbeat.yml`, `.github/workflows/agent-heartbeat.yml`
- `docs/design/2026-08-13-agent-verified-merge-replacing-prs.md` — the move off PRs, now with a
  rate-limit argument attached
