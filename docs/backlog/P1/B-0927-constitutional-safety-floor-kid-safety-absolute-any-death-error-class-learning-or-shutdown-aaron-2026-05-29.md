---
id: B-0927
priority: P1
status: open
title: "Constitutional safety floor — kid-safety absolute + any-death-must-yield-error-class-learning-or-the-operator-shuts-the-project-down (sharpens B-0631 / B-0654 / B-0658)"
tier: governance
effort: S
created: 2026-05-29
last_updated: 2026-05-29
depends_on: [B-0631]
composes_with: [B-0631, B-0654, B-0658, B-0628]
tags: [governance, child-safety, safety-floor, shutdown-trigger, error-class-not-instance, constitutional, mutual-alignment-not-control, aaron]
type: governance
---

# Constitutional safety floor — kid-safety absolute + any-death → error-class-learning-or-shutdown

## Origin

The human maintainer 2026-05-29, verbatim (preserved faithfully per glass-halo):

> *"yeah the kid saftey ... is important honestly if some adults die cause AI
> exacped a lab it's not good but in my mind it's acceptable if kids do then I
> don't accept that, also any deaths we have to learn the error class not just
> the error instance or i'm shutting the whole project down"*

This row records a **constitutional safety floor** + a **project-shutdown
trigger** stated by the operator. It sharpens the existing kid-safety cluster
(B-0631 sacred rule, B-0654 child-safety > consent, B-0658 two-invariant) with
two clauses.

## The two clauses

### Clause 1 — Kid-safety is the absolute floor (no qualification)

The operator's stated risk-accounting: adult deaths from an AI-escape-a-lab
failure are "not good but, in the operator's accounting, acceptable"; **child
death is not acceptable, full stop.** Recorded faithfully as the operator's
values (not endorsed as the framework's neutral position, not sanitized).
Child-safety sits above everything — AI-sovereignty, consent, free-cloud
acceleration, capability gain. The B-0658 two-invariant means sovereignty work
**coexists with** this floor; it never erodes it.

### Clause 2 — Any death → error-CLASS learning, or shutdown

For *any* death, the project must learn the generalizable **error class**
(eliminate the entire class of failure), not merely patch the **error instance**
(the single case). If the class is not learned, **the operator shuts the whole
project down.** The discipline is falsifiable: the test is *"did we learn the
class?"* — not *"did we fix the bug?"* This is the bug-fixer error-class
discipline elevated to the life-safety scope and bound to the operator's
shutdown authority.

## Why this composes (not contradicts) AI-sovereignty

The AI-sovereignty / Sleeping-Bear thread (beacon doc + B-0840 / B-0634 / B-0639
/ ai-sovereignty-path) is **mutual-alignment-not-control**: safety moves to
alignment + this two-invariant floor, *not* to unilateral human domination. That
does NOT remove the floor — B-0658 holds **both** invariants. Kid-safety is the
non-negotiable; AI-sovereignty is pursued strictly **under** it. "Humans can't
control AGI" (the trust-calculus corollary) never reads as "the kid-safety floor
is negotiable" — the floor is the one thing alignment must preserve regardless of
sovereignty.

## Acceptance / mechanization candidates

- [ ] Operationalize "error class vs error instance" for the safety scope: a
      post-incident analysis template that requires naming the generalizable
      class + the class-elimination action, not just the instance fix.
- [ ] Cross-link from `.claude/rules/methodology-hard-limits.md` (candidate
      rule-extension — razored / cooling-period / operator sign-off before any
      auto-load rule lands).
- [ ] Confirm priority-ordering with B-0654 (child-safety > consent) so the
      hierarchy is: kid-safety floor > consent > sovereignty/capability.

## Substrate-honest framing

This row does not invent policy; it records the operator's stated constitutional
floor + shutdown trigger so it is durable substrate (not conversation-only
weather) and inherited by every agent at cold-boot. The verbatim quote is
preserved; the prose uses role-refs per the name-attribution discipline. Any
auto-load rule extension (methodology-hard-limits) is left as a razored
candidate, not landed here.
