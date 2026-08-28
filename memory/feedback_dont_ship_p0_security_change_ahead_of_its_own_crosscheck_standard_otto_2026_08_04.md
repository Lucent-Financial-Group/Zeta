---
name: dont-ship-p0-security-change-ahead-of-its-own-crosscheck-standard
description: "Otto shipped the Caveat-A P0 default switch on a 40-batch loop, below the BP-16 two-tool bar it had itself invoked; caught it, tied it off. The lesson: for a P0 security-class change, complete the verify-gate BEFORE flipping, not after."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
  modified: 2026-08-04T16:08:21.799Z
---

During the Caveat-A work (2026-08-04), Otto switched the shipped `chshSybilCalibrated`
default to the autocorrelation-corrected margin (#10027, a P0 anti-sybil change) with
only a 40-batch fixed-seed loop as the obligation-(c) machine-check — **below** the
BP-16 cross-check bar (≥2 independent tools) that Soraya had explicitly set and that
Otto had itself cited when framing the switch. Otto flagged the gap unprompted, then
tied it off (#10029): a proper FsCheck second tool, plus an independent adversarial
review (harsh-critic) that found the first cut green-but-weak (cardinality shadow of
"subset"; generator never produced the autocorrelated adversary), all fixed.

**Why this matters:** the change was *provably* safe (corrected margin ≥ i.i.d. ⇒ can
only remove false convictions), so the temptation was "it's strictly safer, ship it."
But "provably safe by my own argument" is exactly the claim a cross-check exists to
independently verify — and when the independent check ran, it found the *verification*
(not the change) was weak. The safety of the change did not make the proof adequate.
For a P0 security-class change, the verify-before-trust gate is a *precondition on the
flip*, not a post-hoc formality. Aaron's discipline: security changes pass a verify
gate as a workflow/DU state transition ([[feedback_security_verify_gate_is_a_du_workflow_transition_not_a_pr_feature_aaron_2026_06_21]]).

**How to apply:** before flipping any P0 / security-class / gated-class default:
complete the full verify standard you're invoking (all required independent tools,
not a lighter proxy) FIRST; then flip. If you flip on a proxy, say so explicitly and
treat the real cross-check as a blocker on "done", not a nice-to-have. "Strictly more
conservative / provably safe" is a reason to expect the check to pass, never a reason
to skip it — the check verifies the proof, and proofs (esp. hand-arguments and
fixed-seed loops) are exactly what turn out weak. Independent adversarial review
(spawn a critic on your own verification, not just your code) is the highest-yield
step: this session it caught real defects every single time it ran.
