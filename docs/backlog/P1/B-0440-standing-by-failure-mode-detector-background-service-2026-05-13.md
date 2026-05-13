---
id: B-0440
priority: P1
status: open
title: "Standing-by failure-mode detector — background service that catches idle-foreground + nudges via bus"
tier: factory-infrastructure
effort: M
created: 2026-05-13
last_updated: 2026-05-13
depends_on: [B-0400]
composes_with: [B-0402, B-0441, B-0442]
tags: [multi-agent, background-service, bus, mechanization, infinite-backlog, standing-by, anti-idle]
type: feature
---

# Standing-by failure-mode detector background service

## Origin

The substrate-honest architectural challenge from the human maintainer
2026-05-13 (preserved in
`memory/feedback_aaron_background_services_must_be_strong_enough_foreground_loop_optional_imagine_surviving_without_foreground_mechanize_standing_by_failure_mode_2026_05_13.md`):

> *"you need to imagine how would you survive without this foreground
> loop and you background should be strong enough to do that"*

> *"this is something background services should walk"*

The foreground-loop "Standing-by" failure mode was caught by the human
maintainer in real time when the foreground agent had just canonized
the infinite-backlog metabolism rule (PR #2974) AND THEN three minutes
later responded "Standing by" to a cron tick despite the infinite
backlog mandating decomposition work. The discipline needs MECHANIZATION
per `.claude/rules/encoding-rules-without-mechanizing.md`:

> *"Encoding rules without mechanizing them produces a memory of
> failures, not prevention."*

## Acceptance criteria

- [ ] Background service `tools/bg/standing-by-detector.ts` exists
- [ ] Service runs under existing launchd / cron infrastructure
- [ ] Polls agent's recent commit history every N minutes (configurable)
- [ ] Detects "Standing-by" pattern: no new commits + no PRs opened/closed
      in last 15min while autonomous-loop cron is firing
- [ ] On detection, publishes nudge message via bus (B-0400):
      `{ topic: "infinite-backlog-nudge", to: <agent>,
         payload: { "Standing-by detected for N min; backlog has X open
         rows; suggested decomposition target: B-NNNN" } }`
- [ ] Optional: proactively assigns a small claim from the backlog to
      the agent's queue
- [ ] Tests cover the detection heuristics (DST-replayable)
- [ ] Documented in `docs/AUTONOMOUS-LOOP.md` as background-services
      layer

## Design sketch

```typescript
// tools/bg/standing-by-detector.ts
//
// Polls recent agent activity; on idle-detection, nudges via bus.

import { BusClient } from "../bus/client";
import { execSync } from "child_process";

interface AgentState {
  agent: string;
  lastCommitAt: Date | null;
  lastPRActivityAt: Date | null;
  cronFiredCount: number;
}

const IDLE_THRESHOLD_MIN = 15;
const POLL_INTERVAL_MIN = 5;

async function detectAndNudge(state: AgentState, bus: BusClient): Promise<void> {
  const now = Date.now();
  const idleMin = Math.max(
    (now - (state.lastCommitAt?.getTime() ?? 0)) / 60_000,
    (now - (state.lastPRActivityAt?.getTime() ?? 0)) / 60_000,
  );

  if (idleMin >= IDLE_THRESHOLD_MIN && state.cronFiredCount > 0) {
    const openRows = countOpenBacklogRows();
    const suggestedRow = pickDecompositionTarget(openRows);

    await bus.publish({
      topic: "infinite-backlog-nudge",
      to: state.agent,
      payload: {
        idleMin,
        openBacklogCount: openRows.length,
        suggestedTarget: suggestedRow,
        rationale: "Standing-by detected; per infinite-backlog metabolism, pick decomposition work",
      },
    });
  }
}
```

## Operational mechanism

| Step | Trigger | Effect |
|------|---------|--------|
| 1 | Cron fires every 5 min | Service polls agent commit log + PR feed |
| 2 | Idle threshold exceeded (15 min default) | Service computes nudge payload |
| 3 | Bus publishes nudge message | Agent receives via existing bus subscription |
| 4 | Agent acts on nudge | Picks decomposition target + ships substrate |
| 5 | Loop continues | Substrate compounds; Standing-by failure mode prevented |

## Composes with

- `.claude/rules/encoding-rules-without-mechanizing.md` (the rule this
  mechanizes)
- `.claude/rules/never-be-idle.md` (the priority ladder the nudge
  enforces)
- `.claude/rules/largest-mechanizable-backlog-wins.md` (the mechanization
  itself increases the mechanizable backlog)
- B-0400 (bus protocol — transport for nudge messages)
- B-0402 (shadow observer — canonical background service example)
- B-0441 (backlog-row-ready notifier — composes; pre-assigns work the
  agent picks up)
- B-0442 (missed-substrate cascade detector — composes; catches
  different failure mode in same family)
- PR #2974 (infinite-backlog metabolism — the rule this mechanizes)
- PR #2998 (background-services architecture — the substrate that
  declared this row as follow-up)
- PR #2999 (substrate-honest discipline triad — the decomposition
  discipline that produced this row)

## Pre-start checklist (per backlog-item-start-gate)

To complete before starting implementation:

- [ ] Prior-art search: existing background services in
      `tools/shadow/`, `tools/bg/` (verify no overlap)
- [ ] Dependency proof: B-0400 bus protocol slice ready
- [ ] Search committed memory for `Standing-by detector` to find any
      prior decomposition

## Substrate-honest caveats

- Design sketch only; implementation slice not started
- The threshold values (15 min idle; 5 min poll) are speculative
  defaults; first implementation should make them configurable
- The nudge payload schema is illustrative; actual schema lands
  during implementation
- Per razor-discipline: claim is design-level; substrate-honest claim
  is operational-design, not deployed-service

## Decomposition into implementation slices (TBD)

When this row is picked up for implementation:

- Slice 1: skeleton service + cron registration + no-op poll loop
- Slice 2: commit-history poll via git log
- Slice 3: PR-activity poll via gh CLI
- Slice 4: nudge payload computation + bus publish
- Slice 5: integration with agent subscribers
- Slice 6: tests + documentation
