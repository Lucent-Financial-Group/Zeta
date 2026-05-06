# Trajectory - Factory Trajectory Surface

Status: seed replacement packet
Last refreshed: 2026-05-06
Supersedes: PR #659 (`docs/trajectories-pattern-2026-04-28`) as the landing
path for the trajectory concept, not as historical provenance.

## Why This Exists

PR #659 tried to introduce a broad trajectory surface on 2026-04-28. By
2026-05-06 that branch is stale: it is dirty against `main`, spans 24 files,
includes `memory/MEMORY.md` and a feedback memory file, and carries 67
unresolved review threads. Reviving it in place would spend review energy on
old diff context instead of preserving the trajectory concept in the current
factory shape.

This packet is the replacement anchor. It keeps the concept, narrows the first
landing, and makes future trajectory packets recursive and reviewable.

## Current Rule

A trajectory packet is a durable lane state file, not a giant branch.

Minimum shape:

- `docs/trajectories/<slug>/RESUME.md`
- status and last refreshed date
- current next action
- active blockers
- evidence links to backlog rows, PRs, research docs, or review archives
- explicit supersession links when replacing older work

If a trajectory grows too large, split it into child packets instead of adding
more sections to one file.

## Current Known Trajectory Substrate

- `docs/trajectories/typescript-bun-migration/RESUME.md` is the live example of
  a trajectory packet with a resume surface and linked evidence.
- `docs/backlog/P1/B-0190-memory-substrate-engineering-trajectory-aaron-2026-05-04.md`
  names the memory substrate-engineering trajectory.
- `docs/backlog/P3/B-0205-multi-trajectory-validation-basis-instrumentation-aaron-2026-05-05.md`
  names the six-axis validation surface for multi-trajectory measurement.
- `docs/SAFE-AUTONOMOUS-ACTIONS.md` already treats trajectory drift as a
  report-only autonomous action surface.

## Replacement Plan For PR #659

1. Land this packet as the current trajectory-surface anchor.
2. Open focused child packets only when a lane has a clear owner and next
   action.
3. Cite PR #659 as superseded provenance, not as an active branch to drain.
4. Close PR #659 after the replacement packet lands and is linked from the
   triage claim or follow-up PR.

## Next Child Packets

Candidate child packets, each intentionally small:

- alignment measurement trajectory, grounded in B-0205
- memory substrate-engineering trajectory, grounded in B-0190
- autonomous-loop coordination trajectory, grounded in B-0209 and B-0211
- trajectory drift reporting, grounded in `docs/SAFE-AUTONOMOUS-ACTIONS.md`

Do not create all of them in one PR. The rule is recursive decomposition:
large trajectory blobs become smaller packets, then smaller packets become
atomic next actions.
