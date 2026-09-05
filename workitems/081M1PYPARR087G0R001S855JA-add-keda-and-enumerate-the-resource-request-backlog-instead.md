---
id: 081M1PYPARR087G0R001S855JA
type: task
state: backlog
priority: P1
slug: add-keda-and-enumerate-the-resource-request-backlog-instead
title: "add KEDA, and enumerate the resource-request backlog instead of quoting a count"
created: 2026-09-04T19:35:23.672Z
depends_on: []
composes_with: []
---

# add KEDA, and enumerate the resource-request backlog instead of quoting a count

<!-- Work-item body. ZetaId-keyed (conflict-free, time-sortable). "Backlog" is a
     STATE = this folder; completion moves the file to workitems/done/YYYY/MM/.
     Identity is the zetaid prefix — resolve cross-refs by `081M1PYPARR087G0R001S855JA-*.md` glob. -->

Aaron 2026-09-04: *"lets push to get all our helm charts validated and having a request even
if a tiny one, if we can't get all our helm charts requests for some reason then we should
carefully choose the less important ones not to give resource requests too … i want to make
sure we have KEDA and as much of Dapr as we can."*

## The backlog now enumerates itself

`storage-profiles.ts --budget` has printed the headline every run for weeks — *"29 of the 47
Applications render pods that request nothing at all"* — and nobody acted. Not indifference:
the number names a problem and supplies no route. Turning it into work meant opening 28
charts by hand to find where each takes a `resources` block.

`src/Core.TypeScript/cluster/missing-resource-requests.ts` removes that step, offline, from
two snapshots already in the tree — the render snapshot says *who requests nothing*, the
chart-schema snapshot says *where to write the fix*:

| verdict | count | meaning |
| --- | --- | --- |
| **ACTIONABLE** | 23 | the chart accepts a `*.resources` key. No reason not to fix it. |
| **IN-REPO** | 5 | git-path Applications (+ `infra/longhorn`, whose chart declares no key). The manifests are ours; the request goes in the YAML. |
| **NO-WORKLOAD** | 5 | `arc-runner-set`, `cilium-lb-ipam`, `deepseek-coder`, `qwen-coder`, `spire-crds` render **no pod at all**. |

**That last row is the answer to "carefully choose the less important ones".** For five of
them no choosing is needed — "no request" is arithmetic, not a judgement. The choosing, if it
is ever needed, is only ever over a set this tool can name.

## KEDA

Added at 2.20.2, three components, `dependsOn: []` in the sync-wave graph with the reason
written down. It scales on **queue depth**, which is what predicts load in an agent society:
a fleet whose work arrives as messages sits at 5% CPU with ten thousand items waiting, and an
HPA reads that as "nothing to do". The substrates are already here — nats JetStream,
mimir-kafka, redis.

**It ships WITH requests, deliberately.** A new Application that joined the BestEffort set
would have been a thirty-fourth. Verified by `helm template`, not assumed: the values reach
all three containers, and the coordinate is `resources.<component>` — **not**
`<component>.resources`, the spelling several neighbouring charts use, which would have been
inert.

## What KEDA cost, and what that revealed

The dev lane had **52Mi of spare**, recorded in the ledger with the note that it "is the
number the next Application to join this lane will hit first". KEDA is that Application and
it hit it on the first try: +192Mi against 52Mi.

Carried in `acknowledgedLaneBudgetShortfall` with reason and lift condition. Two cheaper
resolutions were tried and rejected **on the record**:

1. **Cutting gmod's dev memory** (2048Mi, the largest row). Its own claim argues against
   exactly that in writing — *"a map's working set is real, memory is incompressible, and
   cutting this request would trade a Pending pod for an evicted one."* Overturning a
   reasoned decision for my own convenience is not a measurement. Worth noting the same claim
   says gmod *"does not schedule today only because its sync fails on gatekeeper's webhook —
   a reprieve, not a fit"*, and **that webhook failure was fixed in
   081M1MG8GVE087G0R00203QV20**, so the reprieve is over and the 2048Mi is now real.
2. **Squeezing KEDA to 16Mi per component**, which fits with 4Mi to spare and breaks on the
   next addition — a number chosen to pass rather than to be right.

**The structural finding underneath**, which matters more than this row: a 6144Mi reserve on
a 15360Mi node was sized when almost nothing declared requests. Giving the 23 ACTIONABLE apps
real requests moves their consumption **from the reserve into the budget**, so the reserve
must be re-sized against measured usage. That re-sizing is forced by
081M1N0VTN8087G0R0008VE34B regardless of this row.

## The ripple, recorded because it is the cost of adding an Application

One Application invalidated eight checked-in artifacts, and every one of them caught it:
the chart-schema snapshot, the render snapshot, the storage-claims snapshot, lane footprints,
the reason-truth citations (`[cite: lane-cpu metal 6390 over]` → `6690`), three roster counts,
and five pinned totals across four test files. The ledger's compute prose additionally refuses
any figure that is not a **live** reading, so historical numbers had to leave the prose rather
than be restated.

Nothing was widened to make a red run green. `1950 pass, 0 fail` — the same count as the
control run on unmodified `main`.
