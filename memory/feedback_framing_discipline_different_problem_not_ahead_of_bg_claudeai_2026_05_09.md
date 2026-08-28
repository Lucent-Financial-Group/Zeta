---
name: Framing discipline — "different problem" not "ahead of" established results
description: Don't claim to be "ahead of" foundational papers (BG, PBFT). Frame as solving a different problem with different tradeoffs. Same work, different reception. The framework's instinct to inflate costs credit already earned.
type: feedback
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Claude.ai adversarial review (2026-05-09): "ahead of
Byzantine Generals" reads to a distributed-systems person
as category confusion. BG (Lamport-Shostak-Pease 1982)
solves: agreement on a single value among nodes that can
lie, with provable bounds on f. Zeta's multi-agent review
solves: catching divergent failures in a code review
pipeline. Both useful. Neither "ahead" of the other.

**Why:** The framework's instinct to inflate ("we are SOOOO
far ahead") costs credit the work has already earned. A
distributed-systems reviewer who sees "ahead of BG" stops
reading. The same reviewer who sees "we built X which
addresses a different problem than BG" engages.

**How to apply:** When referencing foundational results
(BG, PBFT, HotStuff, Paxos, Raft, CSP, Pearl):
1. State what THEIR result solves (specific problem,
   specific bounds)
2. State what YOUR result solves (different specific
   problem, different tradeoffs)
3. Frame as "different problem" not "ahead of" or
   "improvement on"
4. If there IS a genuine improvement, state it narrowly:
   "our monitor diversity check catches correlated
   failure that BFT's independence assumption doesn't
   address" — not "we're ahead of BFT"

Aaron 2026-05-09: "can you earn this for us?" — meaning
make the framing right so the work earns proper credit.

Composes with: razor-discipline (operational claims only),
B-0361 (anchor to human lineage), consensus-smoothness
(the actual finding that earns credit), B-0357 (Z3 proof
replacement — same inflation pattern on formal artifacts).
