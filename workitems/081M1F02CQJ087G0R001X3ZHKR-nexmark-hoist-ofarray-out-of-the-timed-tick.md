---
id: 081M1F02CQJ087G0R001X3ZHKR
type: task
state: backlog
priority: P2
slug: nexmark-hoist-ofarray-out-of-the-timed-tick
title: "Nexmark hoist ofArray out of the timed tick"
created: 2026-09-01T17:25:32.018Z
depends_on: []
composes_with: []
---

# Nexmark hoist ofArray out of the timed tick

Naledi P2: `Nexmark.fs` / `NexmarkFull.fs` `Run` still called
`ZSet.ofArray` inside the BenchmarkDotNet iteration. Feldera.Bench
already hoists that to `GlobalSetup`. The tick should be
`Send(prebuilt) + Step` so mean time is the circuit, not ingest
construction.

Acceptance: Q1–Q8 `ofArray` only in `GlobalSetup`. No engine change.
