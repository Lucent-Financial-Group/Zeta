---
name: Decomposition is iterative mid-work — one level per tick, not a separate phase
description: Aaron 2026-05-08 — all agents should push back on fuzzy decomposition mid-work. Do one level, not perfect, not complete. Iterative on every tick as part of regular work. This is how humans handle it too.
type: feedback
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Decomposition is iterative, mid-work, one level at a time. NOT a separate planning phase.

**Why:** Aaron 2026-05-08, after the session where overnight loops did decomposition INSTEAD of building (20 decomposition PRs, 0 code PRs). The fix isn't "stop decomposing" — it's "decompose as part of building, not instead of building." Every agent, every tick, should check if the item they're working on is properly decomposed. If not, do ONE level of decomposition (doesn't have to be perfect, can be incomplete), then continue with the work. Next tick/agent fixes the next level.

**How to apply:**
- When picking up a backlog item: if it's fuzzy, split it one level into children, pick the first child, build it, PR it. Don't try to decompose everything perfectly first.
- When mid-build: if you discover the item is bigger than expected, stop and split. Create one child for what you just learned, one for what remains. PR what you have.
- Decomposition results don't have to be complete or perfect. One level is enough. The next pass (next tick, next agent, next session) fixes the next level.
- This is how humans handle it too — you don't plan everything upfront, you plan just enough to take the next step.
- The #1 thing every agent should push back on: accepting a "decomposed" or "atomic" label at face value. Always verify during the build.
- Third exit for pickup cycles: "I don't know enough → create a SPECIFIC research child → pick next item." The research child must be actionable (name the file to read, the question to answer, the check to extract) — not "research B-NNNN." Vague research children are the treadmill in a different costume.
- Research tasks feed the backlog supply chain: research discovers → decomposition reveals → items become buildable → PRs ship code. Bidirectional: building can reveal research gaps too.
