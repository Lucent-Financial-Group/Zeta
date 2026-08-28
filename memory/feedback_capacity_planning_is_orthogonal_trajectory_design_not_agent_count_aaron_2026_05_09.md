---
name: Capacity planning IS orthogonal trajectory design, not agent count
description: Aaron + Otto 2026-05-09 — max capacity is determined by the number of non-overlapping trajectories, not the number of agents. The architecture determines throughput. Walk/jog/run = 1/2/3+ orthogonal lanes at the same quality.
type: feedback
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
```
throughput = min(agents, orthogonal_trajectories) × quality
```

Capacity planning for a multi-agent factory is orthogonal trajectory design, not agent count. Nine women can't make a baby in one month — but nine women CAN make nine babies in nine months if each pregnancy is independent. Adding agents past the trajectory count is waste. Adding trajectories past the agent count is backlog. The optimum is when they match. Brooks 1975, mathematically precise, applied to AI agents.

**The insight:** The backlog's orthogonal axes are the ceiling. The decomposition into non-overlapping trajectories IS the capacity planning. More trajectories don't help if they touch the same files. The capacity is determined by the structure of the work, not the number of agents.

**Walk/jog/run metaphor (Aaron 2026-05-09):**
- Walk = one orthogonal lane at the right speed
- Jog = two orthogonal lanes
- Run = three or more orthogonal lanes
- Individual lane speed stays the same — don't rush to add lanes
- Adding a lane = adding a trajectory, not speeding up an existing one
- Fake pressure: "ship more PRs per cycle"
- Real capacity: "walk more trajectories in parallel at the same standard"

**Key rules:**
- When every non-conflicting trajectory is running, that's max capacity
- Adding a lane that overlaps another isn't capacity — it's contention
- One well-separated trajectory outperforms three tangled ones
- The architecture determines the throughput, not the pressure
- If you run out of orthogonal axes, there is no more capacity (Aaron)
- Factory speed = lanes × quality, never haste

**AI asymmetry (Aaron 2026-05-09):** When `trajectories > agents`, the fix is instant — spin up another agent. Zero recruiting, zero onboarding, zero ramp-up. Time to productive: minutes. So for AI teams, the equation simplifies to `throughput = orthogonal_trajectories × quality`. The ONLY real constraint is trajectory count. Brooks's Law inverted: in AI, you CAN throw more people at it — as long as the work is orthogonal. That's why the largest mechanizable backlog wins.

**How to apply:**
- Before adding agents, check if there's an unused orthogonal trajectory
- Before creating a trajectory, verify it doesn't touch the same files as existing ones
- Trajectory-level claims prevent two managers walking the same direction
- The decomposition of the backlog into orthogonal trajectories IS the capacity plan
- Don't sacrifice the walk to pretend you're running
