---
name: Humans suck at decomposition — always verify and re-decompose
description: Aaron 2026-05-08 — always assume the human made a mistake in decomposition. Friction reducers especially look atomic but are actually 6+ steps deep. Re-decompose during the build, not before.
type: feedback
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Always assume the human maintainer made a mistake in decomposition. Don't trust that an item marked "atomic" is actually one PR's worth of work.

**Why:** Aaron 2026-05-08, after watching the background service session where "upgrade the tick script" turned into 6 corrections (find the flag, wire autonomous-pickup, set interval, add preamble, handle timeout, own through merge). Friction reducers especially look small but decompose into many hard steps that only surface during the build. The backlog's "0 blobs" stat was misleading — the blobs were hiding inside items that looked atomic.

**How to apply:** When picking up any backlog item, re-decompose it before starting. If it's a friction-reducer, assume it's harder than it looks. If the first step reveals the item is bigger than expected, stop and split it into children rather than trying to fit everything into one PR. The decomposition happens BY doing the work, not by pre-planning it — but the agent should be ready to split mid-build.
