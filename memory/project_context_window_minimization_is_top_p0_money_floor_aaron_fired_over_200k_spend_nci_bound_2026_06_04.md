---
name: project-context-window-minimization-top-p0-money-floor-2026-06-04
description: Context-window/token minimization is now the top P0 — Aaron was fired over the $200k spend; spend is personal money now; NCI-bound (cut waste not capability)
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

2026-06-04 Aaron: *"context window minimization should be our most rigorous
proofs minimization that's not coercive to the AI follows our NCI. this will
save us money, I just got fired for the 200k spend."* + *"This is all on my
money now."*

Token cost is now the **largest cost driver AND comes out of Aaron's personal
money**. This makes the budget gated class existential — be frugal in every
session (every token spent is his money: tight scopes, minimal fan-out,
land-durable-then-stop).

**The bet (B-1016, P0):** make context-window minimization our *most rigorous
proof* — apply the formal machinery (golden vectors + INumerics algebra +
Z3/Lean) to our own cold-start surface; a surface's token count is a
serialization measure (`len(tokenize(serialize(surface)))`) made a value in a
numeric algebra; meter it via Rx/Bonsai (= DBSP `z⁻¹/∂`) → feed DORA;
regression-gate so surfaces can't silently regrow.

**NCI constraint (hard):** minimize *waste*, never *capability*. Cut redundant
resident tokens; keep everything reachable one hop away. The hub/satellite
move is the compliant shape (detail moves one hop, nothing removed). A
minimization that starves the agent is coercive → forbidden.

**How to apply:** treat cold-start-token reduction as P0 work; eat the
carved-sentence rule's dogfood on every startup-loaded surface; when in doubt,
measure the delta (measure-first), don't guess.

Worked example same day (PR #6683 + memory hub): MEMORY.md 210KB→~1.5KB hub +
INDEX.md on-demand; CLAUDE.md 77→48 lines; carved-sentence rule generalized to
all context-startup surfaces. Composes [[no-directives]] (budget=gated class),
B-1007 (proof machinery), B-1011 (serialization), measure-first, NCI.
