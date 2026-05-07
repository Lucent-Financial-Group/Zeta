# Trajectory - Autonomous Loop Coordination

Status: active child packet
Last refreshed: 2026-05-07
Parent trajectory: `docs/trajectories/factory-trajectory-surface/RESUME.md`
Grounding backlog:
`docs/backlog/P2/B-0209-remote-only-background-agent-test-matrix-and-model-scouting-2026-05-06.md`
and
`docs/backlog/P1/B-0211-fractal-bft-n-maintainers-n-odd-nodes-local-remote-composition-2026-05-06.md`

## Why This Exists

The factory cannot depend on one local machine, one broadcast folder, or one
foreground chat window. B-0209 names the remote-only proof: agents must
coordinate through pushed git claims and optional host adapters when no shared
filesystem exists. B-0211 names the composition target: each maintainer can run
an odd local cluster, and those clusters compose through the same git-native
claim protocol.

This packet keeps that work in one lane. The lane is coordination substrate,
not another chat agreement and not a broad autonomy promise.

## Current Rule

Local broadcast is acceleration, not authority. Remote git claims and PR state
must be sufficient for coordination when the local bus is absent or stale.

Queue-empty is runway, not completion. A healthy loop keeps a bounded number of
non-overlapping PRs in flight, rotates active claim/path sets, and cleans
finished claims so stale residue does not block future work.

## Current Next Action

Create the first remote-only coordination test matrix, without changing the
runner in the same slice:

```text
mode -> available coordination surfaces -> denied surfaces -> success signal -> failure signal
```

The first slice should land the table and one worked example for a slow
background-only participant. The implementation harness comes after the matrix
is specific enough to test.

## Candidate Atomic Children

- remote-only coordination test matrix, grounded in B-0209
- slow background-only participant worked example, grounded in B-0209
- local-cluster plus remote-cluster composition protocol sketch, grounded in
  B-0211
- stale-claim cleanup rule for completed PRs, grounded in the claim protocol
- standing-query trigger inventory for loop/backlog health, grounded in B-0250
- bounded parallel runway health receipt, grounded in B-0249

## Evidence Links

- `docs/backlog/P2/B-0209-remote-only-background-agent-test-matrix-and-model-scouting-2026-05-06.md`
- `docs/backlog/P1/B-0211-fractal-bft-n-maintainers-n-odd-nodes-local-remote-composition-2026-05-06.md`
- `docs/backlog/P0/B-0249-autonomous-backlog-pickup-self-sustaining-new-work-2026-05-07.md`
- `docs/backlog/P1/B-0250-coincidence-detection-rx-join-dora-mechanism-2026-05-07.md`
- `docs/AGENT-CLAIM-PROTOCOL.md`
- `docs/AGENT-ISSUE-WORKFLOW.md`
- `docs/AUTONOMOUS-LOOP.md`
- `docs/SAFE-AUTONOMOUS-ACTIONS.md`

## Out Of Scope

- No new runner behavior in this packet.
- No new host dependency.
- No claim that local broadcast is enough.
- No broad autonomous action beyond existing safe-action surfaces.

This packet exists so loop coordination can grow from local convenience into
survival-grade remote coordination without losing the git-native fallback.
