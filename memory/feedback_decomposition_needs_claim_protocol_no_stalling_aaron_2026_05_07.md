---
name: Decomposition needs claim protocol — who decomposes what, same as who builds what (Aaron 2026-05-07)
description: Aaron flagged that blob decomposition needs the same claim protocol as building. Without it, loops stall or overlap on decomposition. Claim-before-decompose, same as claim-before-build.
type: feedback
originSessionId: 8dfb492a-e181-4a10-8fc9-16b3b01e832d
---
Aaron 2026-05-07: "yall need a decomposition protocol for
who decomposes what same claim protocol not stalling"

## The rule

Decomposition IS work. It uses the same claim protocol:

1. Loop reads backlog, finds a blob
2. Loop CLAIMS the blob for decomposition (same claim surface)
3. Loop decomposes: blob → smaller items with depends_on
4. Loop PRs the decomposition
5. Other loops can then claim the atomic children

Without this: three loops see the same blob, all try to
decompose it independently, produce conflicting children,
stall waiting for each other to finish.

With this: one loop claims the decomposition, does it,
the others pick up the resulting atomic items.

## The anti-stall rule

If a loop claims a blob for decomposition and hasn't
PR'd the decomposition within one tick cycle, the claim
expires and another loop can take it. Same rotation
protocol as stuck-node handling.

**How to apply:** Wire into the autonomous backlog runner
(tools/backlog/autonomous-pickup.ts). The runner's item
selection should check: is this item a blob? If yes,
claim it for decomposition, not for building. Decompose
first, build after.
