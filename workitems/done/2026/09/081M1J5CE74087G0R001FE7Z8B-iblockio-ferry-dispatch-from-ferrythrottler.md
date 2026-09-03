---
id: 081M1J5CE74087G0R001FE7Z8B
type: task
state: done
priority: P1
slug: iblockio-ferry-dispatch-from-ferrythrottler
title: "IBlockIo ferry dispatch from FerryThrottler"
created: 2026-09-02T22:56:07.396Z
completed: 2026-09-02T23:24:05.038Z
depends_on: []
composes_with: ["081M1J5CE6A087G0R000RVJC9H"]
---

# IBlockIo ferry dispatch from FerryThrottler

`IBlockIo` is the device primitive (one LBA, one call). The effect door
is Haskell-`IO`-shaped: ops are descriptions until `FerryThrottler`
interprets them. Combinators are generated from the in-repo ferry, not
from a foreign I/O stack. Adjacent-LBA coalescer (batch/single) is a
named deferral.

## Acceptance

- `BlockIoFerry.Door` is DoP=1, single-arity ferry + TCS Reply, `manual`
  + `PumpToIdleAsync` for DST.
- single/single: `RunAsync` write then read round-trips through
  `FileSystemBlockIo`.
- batch/batch and single/batch: `RunManyAsync` of 4 with MaxBatchSize=64
  is one boat of 4, 4 aligned outcomes.
- batch/multibatch: MaxBatchSize=2 and 5 writes is 3 boats.
- Cancel before admit starts no boat.
- Does not claim native NVMe. Does not coalesce adjacent LBAs.
