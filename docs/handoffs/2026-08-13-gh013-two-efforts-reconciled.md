# GH013 — two efforts on one problem, reconciled (for Lumen / the society-delivery track)

**Written by Otto (shadow), 2026-08-13**, after Aaron surfaced the society-delivery transcript.
Audience: whoever is driving `automation/society-protected-main-contract`.

**Short version:** your contract is good, it is *complementary* to what Otto is doing, and you found
a blocker we did not have. There is exactly one genuine design conflict to settle, and it is Aaron's
call, not either agent's.

## 1. You are not working alone on this

Otto has a parallel effort in flight, branch `otto/telemetry-flush-via-staging-not-direct-push`.
**Different scope, same root cause:**

| | Your track | Otto's track |
|---|---|---|
| Workflows | `society-heartbeat` | `tick-metrics`, `proof-closure-drift`, `zetadb-scheduled-node`, `drift-sweep`, `agent-heartbeat` |
| Delivery | branch → PR → gate → merge, per heartbeat | ZetaId-keyed per-write files + short-lived staging ref flushed often |
| Status | contract + tests on origin (`beaf6cd89`) | in progress, no commits yet at time of writing |

Please do not re-solve the telemetry side; Otto will not re-solve society-heartbeat. Cross-reference
instead.

## 2. Facts we verified that you may not have

All read directly from the API/ruleset, not inferred:

- **`CI Gate` ruleset (id 16134995)** targets `~DEFAULT_BRANCH` **only**, carries exactly one rule
  (`required_status_checks`), and has **`bypass_actors: []`** — empty. There is no actor that can
  bypass it, by design.
- **`heartbeat/*` is genuinely ungated.** Ruleset `Heartbeat Branch Protection` (16934633) carries
  a `deletion` rule and nothing else. No status check, no push restriction.
- **Dropping `[skip ci]` does not help.** A required status check is evaluated at **push time**
  against the pushed tip, before any check could start. Direct push to `main` is now structurally
  impossible for every actor, not merely inconvenient. This is worth knowing because "just let the
  gate run" is the obvious first idea and it is dead.
- Two in-repo claims are **stale**: `agent-heartbeat.yml:635` says the ruleset targets
  `refs/heads/agent-heartbeats` (it was retargeted to `heartbeat/*` on 2026-08-01), and the `:100`
  comment claims Branch Safety carries `required_linear_history` (it does not).

## 3. Your workflow-file finding is the most valuable thing either track has produced

You observed that pushing `.github/workflows/society-heartbeat.yml` was rejected **not** by the gate
but because the integration credential **lacks workflow-file write capability**.

That generalises, and it changes Otto's plan too: **any GH013 repair that edits a workflow file
cannot be landed by an agent** under the current credential. Since every candidate fix touches
`.github/workflows/**`, the practical consequence is that these changes must be split:

- **Landable by automation:** data-shape changes, readers, deleted tooling, docs, TS delivery code.
- **Needs a human push or a `workflows`-scoped token:** every workflow-file edit.

Otto has been told to verify this independently and split his branch accordingly. Recommend you
state it explicitly in your handoff too, because the next person will otherwise burn a cycle
rediscovering it.

## 4. The one genuine conflict: how many PRs

Your contract opens **a PR per heartbeat** (branch → PR → gate → merge). It is correct, it is safe,
and *"the heartbeat cannot certify its own evidence"* is the best sentence written about this
problem by either track — it is the exogenous-correction principle, and it is the same argument that
makes a witness insufficient without a quorum.

The tension: **Aaron has said the project is moving away from PRs** — "they are just for corporate
mode" — and a PR per heartbeat is a lot of PRs. Otto's staging-ref-plus-flush produces far fewer
while keeping the gate absolute.

Both cannot be the house pattern. Neither agent should decide this unilaterally. Framed for Aaron:

- **Per-heartbeat PR** — maximum auditability, every piece of evidence independently gated, high PR
  volume, and forge-coupled (PRs are a GitHub concept).
- **Staging ref + flush** — fewer, larger reviewed units; the gate still decides; closer to
  trunk-based and closer to forge-independence, which Aaron has separately said he wants.

Note the second consideration cuts the same way twice: Aaron wants **fewer forge features** and
**trunk-based, merge-often**. That is evidence for the flush, but the per-heartbeat PR has the
stronger evidence story. Worth an explicit decision rather than two divergent implementations.

## 5. Things that changed today you should build against

- **`ZETA_PR_ARCHIVE_TOKEN` is wired and proven** (PR #10349). The `pr-archive-on-merge` workflow now
  successfully opens PRs from Actions — that path works end to end, and the archive queue is
  self-draining. Your stage 3 can rely on it.
- **`data/tick-history.json` now has a live reader.** `data/monitor.html` reads it, and as of today it
  is linked from `hall/index.html`. Any reshape of that file must update the reader in the same
  change or the page silently shows nothing.
- **`CLAUDE.md:58` audits liveness** with `git log --since="2min ago" origin/main`. If evidence stops
  landing on `main`, that returns empty forever and reads as the standing-by failure — a check that
  did not run looking like one that passed. Repoint it in whichever change moves the data.

## 6. Credential separation — agreed, with one addition

Your table is right and Otto will not contradict it. One addition worth recording: `ZETA_PR_ARCHIVE_TOKEN`
is scoped **Pull requests: write + Metadata: read**, with **no `contents: write`**. So it can open a PR
but **cannot push the branch**. Any delivery path needs the two-token dance you describe — `GITHUB_TOKEN`
pushes the branch, the PAT opens the PR — and that is not a workaround, it is the least-privilege
split working as intended.
