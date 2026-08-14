# Peer agents, parallel experiments, and why a health dashboard is a check that must not lie

**Ferried** 2026-08-13 from Aaron, on where the automation is heading:

> yes peer agents and multiple experiments at once for the human to review plus good dashboards for
> health are where i'm going

Three parts. The first is already demonstrated, the second changes what the human is *for*, and the
third has a failure mode this session produced a live instance of — which is the part worth writing down
before it is built.

## 1. Peer agents — demonstrated, not aspirational

Today's session is evidence: **peer agents caught more of my errors than the human did.** Soraya refuted
my routing premise and diagnosed a TLC failure as neither of my two hypotheses; Ilyana found my own
proposed `Bound` DU *would not have caught the `1.2`*; Lumen corrected me that Student-t does introduce
a free parameter after I claimed it did not; the BDP harness inverted my burst-loss expectation; the P0
agent declined my filed proposal for a better reason than I had given.

That is the correction loop closing agent-to-agent, and it is the "be *a* −1, not *the* −1" discipline
operating as a mechanism rather than an intention. **Recorded as measured-this-once, not proven** — one
session, and the errors nobody caught are by construction absent from the count.

## 2. Multiple experiments at once — this changes the human's *role*, not their *throughput*

The finding from this session was that human input was overwhelmingly **generative** and **corrective**,
almost never **approval**. Parallel experiments are what make the generative role scale, and the reason
is structural rather than a matter of volume:

| shape | what the human does | scales with |
|---|---|---|
| agent works → human approves | checks work already done | human attention (**does not scale**) |
| agents run N experiments → human picks | **chooses among alternatives** | agent count (**scales**) |

Choosing between N results is *direction*, which is the thing a human is uniquely good at here and which
this session showed is the actual input being supplied. Approving one result is supervision, which is the
thing that caps throughput. **So parallel experiments are not "more work in flight" — they are a
different job for the human**, and the one that does not become the bottleneck.

**The precondition, and it is the same one as everywhere else today:** N experiments are only comparable
if they ran under the same conditions, and "the same conditions" must be **derived, not asserted**. An
experiment that silently differed in setup is not a data point, it is a category error presented as a
comparison.

This is exactly the machinery the Arena thread already built for a different purpose — capability class,
attestation class (ranked/unranked), and substrate content-hash, each **derived from observed access**
rather than declared. **The experiment-comparison surface and the tournament-result surface are the same
problem**, and should not be built twice.

## 3. Dashboards — a health dashboard is a check, and it is the check with the largest blast radius

This is the part to get right before it exists, because this session produced the exact failure live.

**A dashboard is not a view. It is a check that a human trusts *instead of looking*.** Every other check
in this repo fails safe-ish: a test that does not run leaves someone able to notice. A dashboard that
does not run correctly **actively substitutes for noticing**. It is the highest-leverage instance of the
defect class this entire session kept surfacing — *a check that did not run must never look like a check
that passed*.

### The live instance, from this session

I reported **"main green"** on nearly every tick for hours. It was true and useless: my check was

```
gh run list --branch main --limit 8     ← a recent-window scan
```

while **both heartbeat workflows failed on every single run** the entire time. Scheduled runs fell
outside the window, so a *structurally blind* check reported green. The correct shape is

```
per-workflow last conclusion            ← what I switched to
```

A recent-window scan **cannot** see a steadily-failing scheduled job — not "usually misses", *cannot*.
A dashboard built on the convenient query rather than the derived one would have displayed the same
green, to a human who had stopped checking because there was a dashboard.

### What follows for the design

- **Derive what is displayed; never query a convenient proxy.** Same discipline as `build-graph.ts`'s
  `derive` and the Arena's observed-channel labels. If the dashboard's inputs are asserted rather than
  computed from the underlying facts, the dashboard is decoration with authority.
- **The dashboard needs its own falsifier.** Something must fail when the dashboard would show green
  while a thing it claims to cover is red. Untested dashboards are the purest form of this defect, and
  "we would notice" is exactly what a dashboard removes.
- **Coverage must be visible on the dashboard itself.** *"What am I NOT watching?"* is the load-bearing
  question, and it is the one a dashboard structurally hides — the panels present are visible, the panels
  absent are not. `081KZYPHESJ` (612 test files, ~95 run) is precisely this shape one layer down, and the
  fix there is the fix here: **derive the covered set and show the gap**.
- **Prefer per-entity last-state over windowed aggregates.** The window is what made my check blind, and
  windowed aggregates are the default idiom in every dashboard tool.
- **Green must be earned, not defaulted.** A panel with no data should read *unknown*, never *ok* — the
  same one-way discipline as `Unmeasured` in `BusRegime` and `indeterminate` in the erasure meter, both
  of which already refuse to let absence become a pass.

## What exists already

Not starting from zero: `src/Core.TypeScript/backlog/dora-metrics.ts` (DORA folds over work-item events),
`src/Core/SocietalDoraSvg.fs`, `demo/red/red-state.json` + `index.html` (a live dashboard-data lane with
its own telemetry-flush branch), `src/Core.TypeScript/orchestrator-checks/check-orchestrator-state.ts`,
`service/persona-health.ts`, and the LLMTV broadcast surface (`universal/television.md`,
`discovery/llmtv-broadcast.ts`) which is already the "watch a mind work" channel.

The LLMTV connection is worth noting: **a health dashboard and LLMTV are the same surface at different
granularities** — one shows a fleet's state, the other shows a dweller's. Both are one-way observation
channels, and both are gated by the same consent/frost machinery. Building them as one thing is probably
right; building the dashboard *without* the frost discipline would quietly create a surveillance surface
that the LLMTV design deliberately avoided.

## Open

1. **Derive the dashboard's coverage set and display it.** "What am I not watching" is the panel that
   makes the rest trustworthy.
2. **Write the dashboard's falsifier before the dashboard** — a test that goes red when a covered thing
   is failing and the dashboard would show green.
3. **Reuse the Arena's comparability machinery** for parallel-experiment review rather than building a
   second one; they are the same problem.
4. **Decide whether health and LLMTV are one surface.** If yes, the frost/consent discipline applies to
   the dashboard from day one rather than being retrofitted.
