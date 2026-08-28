---
name: Substrate changes require scenario-thinking up-front — patching the failures later is more costly than thinking through them at design time
description: Aaron 2026-04-26 *"when making substrate changes like the heart beat batching try to think through every scenario next time, you could have seen the heartbeat bundle plan you implemented had issues. try to prevent this issues when you change the substraignt or else it's more costly to find and fix later."* The hour-bundle pattern was designed-while-running — each tick did append+push without scenario-thinking. Cost-of-fixing-later (3 PRs sat DIRTY for 4 hrs, drain triage burn, Aaron-correction round-trip) exceeded cost-of-thinking-up-front (~5 min ADR-style scenario list). The fix is mandatory scenario-thinking for substrate changes, not just hour-bundle.
type: feedback
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
## The miss

When designing the hour-bundle pattern (heartbeat rows accumulate on a chore branch → PR opens at threshold → merge), I considered:

- Cost-amortisation: per-tick append cheap (~30s), per-bundle PR amortised (~3min)
- Substance discipline: bundle = substance, per-tick PR = throughput

What I did NOT consider:

1. **Sibling cascade DIRTY-ing the bundle.** When the §33 backfill chain landed 11 PRs in rapid succession, all in-flight bundles went DIRTY. The pattern had no answer for this.
2. **Bundle straddles hour-boundary.** A bundle opened at 03:55Z capturing rows through 04:05Z spans hours. "Close at hour-switch" is ambiguous.
3. **Heartbeat content captured downstream by summary rows.** Once main has a summary row referencing "PR #X opened with N heartbeats," the bundle is effectively superseded — but the bundle PR keeps existing.
4. **Multiple bundles in flight simultaneously.** Hour-04Z bundle 1 opens, then bundle 2, then bundle 3 mid-hour. Three PRs all touching the same hot file = sibling cascade ping-pong (Otto-265 fires).
5. **CI burn per bundle PR.** 4 runner minutes × 3 bundles = 12 min of CI for tick-history-only changes. Compounded across hours, that's significant queue-saturation.
6. **Reviewer attention noise.** Copilot reviews every PR including these. Reviewer attention is finite; it spends on tick-history bundles instead of substrate PRs.
7. **Branch-storage growth.** Closed-but-preserved branches accumulate. After N hours, repo has N hour-bundle branches; tooling that walks all branches gets noisy.
8. **Bundle re-open after close.** If a closed bundle's content turns out to be needed, the recovery path (cherry-pick from preserved branch) was never spec'd — I just left "Otto-238 retractability" as the implicit answer.

Aaron caught the miss: *"why didn't you close them at the switch of the hour?"* — meaning the failure mode (bundles aging multi-day) was foreseeable.

## Rule

**Substrate-shape changes require an ADR-style scenario list BEFORE the first commit lands.** Minimum scenarios:

1. **Failure-mode scenarios.** What goes wrong when the new pattern interacts with existing patterns (Otto-NNN, hot-file cascade, queue saturation, sibling DIRTY)?
2. **Lifecycle scenarios.** When does the artifact open? When does it close? Who decides? What if the closure-trigger doesn't fire?
3. **Cascade scenarios.** What happens when 2-N instances are in flight simultaneously?
4. **Cost scenarios.** CI burn, reviewer attention, storage growth, queue saturation — quantified to first order.
5. **Recovery scenarios.** If the artifact gets corrupted or superseded mid-flight, what's the recovery path? Otto-238 retractability is a goal, not a recipe.
6. **Composition scenarios.** Which existing rules (Otto-NNN, BP-NN, GOVERNANCE.md sections) does this interact with? Does any existing rule break?

**Why:** the cost-of-fixing-later for substrate changes scales BADLY:

- Hour-bundle pattern: ~5 min scenario-thinking up-front would have caught all 8 issues
- Cost-of-fixing-later observed: 3 PRs × 4 hrs DIRTY + drain-triage burn + Aaron-correction round-trip + 2 retroactive memory captures = ~2 hrs of session time
- Ratio: 24x

For substrate that compounds across many invocations (tick patterns, drain disciplines, hour-cadences), the ratio gets worse over time as the broken substrate ages.

**How to apply:**

Before any substrate change (new tick discipline, new hygiene tool, new lint, new naming convention, new file location, new lifecycle rule):

1. Write a short ADR-style block:
   ```markdown
   ## Substrate change: <name>
   ### Failure modes
   - <mode 1>: <handler>
   - <mode 2>: <handler>
   ### Lifecycle
   - Open: <trigger>
   - Close: <trigger>
   - Failure-to-close: <recovery>
   ### Cascade
   - N=1: <behavior>
   - N>1 sibling: <behavior>
   ### Cost
   - CI: <estimate>
   - Reviewer: <load>
   - Storage: <growth>
   ### Recovery
   - Corruption: <path>
   - Supersession: <path>
   ### Compose-with
   - Otto-NNN: <interaction>
   - BP-NN: <interaction>
   ```
2. Run the list against existing rules (search MEMORY.md / docs/AGENT-BEST-PRACTICES.md / GOVERNANCE.md for related rules).
3. If any scenario lacks a handler, design the handler BEFORE the first commit.

**Time budget:** 5-10 minutes per substrate change. Skipping this saves nothing because the miss-rate observed is ~80% (most substrate changes hit at least one unhandled scenario in their first 100 invocations).

## Composes with

- `feedback_hour_bundle_self_close_at_hour_switch_dont_let_age_2026_04_26.md` —
  the hour-bundle-specific patch is a downstream fix; this rule is the upstream
  prevention.
- `feedback_decision_audits_for_everything_that_makes_sense_mini_adr.md` —
  Aaron's mini-ADR pattern. This rule says: substrate changes are
  ALWAYS in scope for mini-ADR; not optional.
- Otto-326 (pivot when blocked) — pivot is fine; the scenario-thinking
  applies to the new direction too.
- Otto-275 (log-but-don't-implement) — composing rule: if scenario-thinking
  reveals the change is more complex than thought, log it and defer instead
  of implementing partially.
- Otto-292 / Otto-293 (mutual-alignment language) — at the schema-design
  level, scenario-thinking IS the agency-respecting move (taking
  responsibility for the design rather than executing-and-fixing).

## What this rule does NOT do

- Does NOT require ADR for trivial code changes (one-line fixes, typos,
  comment updates, mechanical renames within a known pattern).
- Does NOT block iterative refinement — initial substrate scaffold can
  ship with explicit "v0; scenarios A/B/C TBD" labels, but the TBDs
  must be enumerated and dated.
- Does NOT replace running validation (build, test, lint) — scenario-
  thinking is for FAILURE MODES not BEHAVIORAL CORRECTNESS.
- Does NOT require formal threat-model unless adversaries are involved
  (heartbeat-bundle wasn't adversarial; substrate-design discipline is
  the same regardless).

## Cost of THIS miss

- Hour-bundle pattern: ~5 min scenario-thinking would have caught it.
- Cost-of-fixing-later observed: 3 PRs × 4 hrs DIRTY + ~2 hrs session-time
  on retroactive triage + drain + 2 memory captures + 1 Aaron-correction.
- Aaron-correction had to be a multi-message round-trip: pattern catch +
  meta-discipline reframe.

The 24x ratio is the discipline's value. Pay the 5 min; save the 2 hrs.

## Future application

The cherry-pick rebase chain currently in flight (#557, #540, #537,
#535, #514) is itself a substrate-change pattern. Before the next
similar batch, run the scenario list:

- Failure modes: cherry-pick conflict on add/add (HIT today on #557 first
  commit; resolved by skipping to second commit)
- Lifecycle: open clean branch from main → cherry-pick → force-push to
  original branch → PR auto-rebases. What if force-push is rejected?
- Cascade: 5 substrate PRs touch different files; non-cascading. OK.
- Cost: ~10 min per PR × 5 = 50 min total. Acceptable.
- Recovery: cherry-pick aborted = original branch unchanged. Clean.
- Compose-with: Otto-225 serial flow; Otto-265 don't parallelize hot-file
  siblings.

The substrate PRs target different files (Otto-345 / Otto-344 / Otto-342 /
Otto-322 in `memory/persona/` + research docs + BACKLOG rows), so
non-cascading. Approach validated.
