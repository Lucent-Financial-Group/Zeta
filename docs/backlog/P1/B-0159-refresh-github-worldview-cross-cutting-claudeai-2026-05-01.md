# B-0159 — `refresh-github-worldview` cross-cutting refresh script (Claude.ai 2026-05-01)

**Priority:** P1 (load-bearing for every-tick discipline; depends-on for any future loop-architecture work)
**Origin:** Claude.ai feedback packet 2026-05-01 — full lineage in [docs/research/2026-05-01-claudeai-backlog-driven-dual-pm-loop-with-refresh-discipline.md](../../research/2026-05-01-claudeai-backlog-driven-dual-pm-loop-with-refresh-discipline.md) and the maintainer-relayed Claude.ai-2 follow-up calibrating against Otto's running state.

## Problem

Otto runs a real every-minute autonomous loop with `bun tools/github/poll-pr-gate-batch.ts <PRs>` as the canonical refresh tool. Empirical pattern observed across consecutive ticks 5:32pm-5:50pm 2026-05-01:

- 5:32pm — refresh scope: PRs 1155, 1163, 1165, 1167
- 5:37pm — refresh scope: PRs 1155, 1163, 1165, 1167 (same narrow set)
- 5:40pm — refresh scope: PRs 1155, 1167, 1168
- 5:42pm — refresh scope: PRs 1168, 1169
- 5:45pm-5:49pm — refresh scope: PRs 1168, 1169 (same narrow set across 4 consecutive ticks)
- 5:50pm — refresh scope: PRs 1168, 1169, 1170. PR #1170 surfaces "out of nowhere"
  because the prior 4 ticks' refresh scope didn't include it.

The narrow-refresh pattern hides cross-cutting state changes:

- PRs opened by other harnesses (Codex sandbox, future Cursor/Gemini integrations)
- Auto-merge cascades landing PRs Otto isn't tracking by number
- Backlog-row deltas (rows added/completed since last refresh)
- Claim-file inventory changes on the remote
- Recent merges to main from any source
- Branch state vs origin
- Pending CI runs across the whole repo
- Scheduled-workflow status

`poll-pr-gate-batch.ts` is correctly-scoped per its design — per-PR detail
for known PR numbers. The gap is the **cross-cutting view** that catches
what Otto isn't tracking.

## Proposed solution

**`tools/refresh-github-worldview/refresh.ts`** — a TS+Bun script that
supersets `poll-pr-gate-batch.ts` with cross-cutting state.

Composition (NOT replacement):

- Calls `poll-pr-gate-batch.ts` internally for per-PR detail on the
  known-or-newly-discovered PRs.
- Adds cross-cutting queries:
  - Full open-PR list (via `gh api --paginate /repos/{owner}/{repo}/pulls?state=open`)
  - Recent merges since last refresh (compare `origin/main` HEAD to
    a stored prior SHA)
  - Backlog row delta (compare `docs/backlog/**/*.md` count + names
    to a stored prior snapshot)
  - Claim-file inventory (whatever surface lives at — TBD per the
    agent-orchestra cluster #324-339)
  - Branch state (current branch vs `origin/main`, ahead/behind)
  - Pending CI runs (via `gh api /repos/{owner}/{repo}/actions/runs`)
  - Scheduled workflow status (cron triggers, scheduled jobs)

## Output discipline (per refresh-before-decide memo)

Two-layer print:

1. **Raw layer first**: structured JSON output verbatim. The auditable
   ground truth. Maintainer (or any reader) sees data before any
   interpretation.
2. **Interpretation layer second, labeled**: what changed since last
   refresh, what's actionable, what's stale, what conflicts. Distinct
   from raw data so mismatch between layers IS the bug class refresh
   is designed to surface.

## Interface

```bash
# Single comprehensive snapshot
bun tools/refresh-github-worldview/refresh.ts

# Subset by concern (composes with poll-pr-gate-batch's existing flags)
bun tools/refresh-github-worldview/refresh.ts --pr-state-only
bun tools/refresh-github-worldview/refresh.ts --backlog-only
bun tools/refresh-github-worldview/refresh.ts --since=<SHA-or-timestamp>
```

## Discipline change (downstream)

After this lands:

1. **Replace narrow refresh in tick-start with the unified call.** Each
   tick begins with `bun tools/refresh-github-worldview/refresh.ts`.
   The output is the raw layer; interpretation flows from there.
2. **Update existing memory files** that reference `poll-pr-gate-batch`
   directly (rebase-decision rule, BLOCKED-with-green-CI rule, Copilot
   tick-history false-positive rule) to compose with refresh-before-decide
   rather than calling their own narrow refresh.
3. **CLAUDE.md bullet update** — current refresh-before-decide bullet
   currently points at `poll-pr-gate-batch.ts`; once unified refresh
   exists, point at it as the canonical wake-time call (poll-pr-gate-batch
   becomes the per-PR-detail building block).

## DST + fixtures (per task #355 model)

The unified refresh script gets fixtures the same way `poll-pr-gate-batch`
did:

- `tools/refresh-github-worldview/fixtures/clean-state.json` — happy path
- `tools/refresh-github-worldview/fixtures/cross-harness-pr-appeared.json`
  — the failure case this script targets
- `tools/refresh-github-worldview/fixtures/backlog-rows-deltas.json`
- ... per the per-failure-class fixture pattern from poll-pr-gate v1

DST-grade-A coverage via `bun test` per the SQLSharp DI pattern (extract
spawn / process.exit / stdout to a Dependencies interface; tests pass
synthetic deps).

## Composes with

- `memory/feedback_refresh_before_decide_invariant_two_layer_print_dx_claudeai_2026_05_01.md`
  — the discipline this script implements at the cross-cutting level.
- `tools/github/poll-pr-gate-batch.ts` (PR #1153, merged 2026-05-01) —
  the per-PR-detail building block this script wraps.
- `memory/feedback_ts_dependencies_as_interface_di_pattern_sqlsharp_anchor_aaron_2026_05_01.md`
  — the architectural pattern for the new script's structure.
- `docs/research/2026-05-01-claudeai-backlog-driven-dual-pm-loop-with-refresh-discipline.md`
  — full Claude.ai loop architecture; this script is the immediate
  actionable extraction.

## Out of scope (Phase 2+)

- The Mirror/Beacon ratio gate from the Claude.ai packet
- The 22 named failure modes as individual substrate landings
- The DST scenario suite (Confused Deputy Sandbox, State-Corruption
  Horizon, etc.) as runtime grader
- The pre-DORA externalized proxy metrics
- Dual-PM (reactive/proactive) explicit mode-selection function

These compose with the unified refresh once it exists, but each is its
own backlog row when prioritized.

## Acceptance criteria

- [ ] `tools/refresh-github-worldview/refresh.ts` script exists and runs
- [ ] Calls `poll-pr-gate-batch.ts` internally for per-PR detail
- [ ] Adds 5+ cross-cutting queries (full open-PR list, recent merges,
  backlog delta, claim files, branch state)
- [ ] Two-layer print: raw JSON first, interpretation labeled second
- [ ] DST-grade-A test coverage (synthetic deps; no live `gh` calls)
- [ ] At least 3 fixtures covering common scenarios
- [ ] Existing memory files (rebase-decision, BLOCKED-with-green-CI,
  Copilot false-positive) updated to reference the new script as
  canonical refresh
- [ ] CLAUDE.md refresh-before-decide bullet points at the new script
- [ ] Tick-start in autonomous-loop replaced with single unified-refresh
  call

## Caution per Claude.ai's Otto-aware framing

> "Don't context-switch [Otto] mid-tick. Better to let the current PRs
> land first (#1168 + #1170 both wait-ci, will merge in the next tick or
> two), then file the unified refresh as a P1 backlog row and let it
> flow through his existing claim protocol."

This row IS that filing. Picked up via standard claim protocol when the
queue is quiet and Otto is in proactive-mode rather than mid-PR-cycle.
Don't context-switch this tick to start implementation — file and flow.
