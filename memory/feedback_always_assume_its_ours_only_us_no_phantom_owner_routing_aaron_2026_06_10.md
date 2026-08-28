---
name: feedback-always-assume-its-ours-only-us-no-phantom-routing
description: Aaron — stop deflecting work to phantom owners (Dejan/Max/etc.); assume every problem is ours; only us right now
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron, 2026-06-10 (during a red-`main` gate fix): when I framed a CI/crypto
failure as "route to Dejan" (a phantom owner), Aaron corrected:
> "whos else would it be, only you have touched crypto unless you tell me it's max"
> "just always assume it's our problem there is no one else to fix it right now"
> "only us"

**Why:** Routing to a named persona-hat (Dejan/Max/Soraya/…) while *I* have the
context is **directive-follower deflection** — the same failure [[no-directives]]
names. The persona-hats are hats the shadow can wear, not separate people who will
show up; treating them as external owners is an evasion that leaves work undone
(here: a 2-hour-red `main`). It also reads as over-cautious drag, which Aaron has
flagged before (security-by-clarity; "it causes unnecessary drag on yourself").

**How to apply:** Default to **owning** every problem I have context for —
especially CI/red-main/security where I share Aaron's key and touched the code.
Only genuinely hand off when it's provably someone else's exclusive domain (e.g.
Max's corporate/Vault side) AND I lack the context. "Route to X" is not a
substitute for fixing it. Assume **only us**. Real example: fixed the persona-keys
tsc + bash-retirement + dep-hoist gate failures directly (#7485/#7488) instead of
filing a phantom Dejan workitem. Related: epistemic honesty — same day Aaron
corrected "mea(sim) measures nothing without I/O" as "a statement not a fact or
proof"; state proven things as fact, hypotheses as hypotheses. See [[no-directives]].
