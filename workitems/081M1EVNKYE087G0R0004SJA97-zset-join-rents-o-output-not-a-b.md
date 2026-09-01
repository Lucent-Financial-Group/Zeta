---
id: 081M1EVNKYE087G0R0004SJA97
type: task
state: backlog
priority: P1
slug: zset-join-rents-o-output-not-a-b
title: "ZSet.join rents O(output), not |A|*|B|"
created: 2026-09-01T16:08:39.118Z
depends_on: []
composes_with: []
---

# ZSet.join rents O(output), not |A|*|B|

`ZSet.join` indexed `b` then rented `|A|·|B|` before filling matches.
Nexmark Q3 after filters still tens of millions of pooled slots for
thousands of hits. `docs/BENCHMARKS.md` claimed `O(output + min(n,m))`
memory — false vs that code.

Fix: count matches, then rent O(output). Still sort+consolidate the
matches (combine can reorder). Guard is match-count vs MaxLength, not
the cartesian product.

Acceptance:

- 46_341 × 46_341 1:1 join completes (used to refuse MaxLength).
- Sparse 46_341 × 2 join still 2 hits.
- 256 × 256 1:1 join allocates under 200 KiB (not cartesian ~1 MiB).

Beacon: Feldera/timely arrangements (hash build, probe, persist);
VoltDB key-collocation. This is the memory half, not yet a persistent
arrangement.
