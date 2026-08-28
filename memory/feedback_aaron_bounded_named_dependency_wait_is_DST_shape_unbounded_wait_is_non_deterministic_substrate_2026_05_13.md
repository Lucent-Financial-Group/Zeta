---
name: aaron-bounded-named-dependency-wait-is-dst-shape
description: "Aaron 2026-05-13 22:28Z — generalizes the Holding-without-named-dependency rule beyond cron context. Any wait that can't be reproduced from a seed is non-deterministic substrate. Bounded named-dependency-wait is replayable; unbounded wait is the failure mode. The DST-discipline cut."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---

## The framing

The human maintainer 2026-05-13 22:28Z: *"this is the perfect fix
to wait forever by accident while [should be] bounded waiting, good
call man tht DST"* (verbatim; in response to my visibility signal
articulating "wait as long as the dependency is named with bounded
ETA").

This generalizes the
`.claude/rules/holding-without-named-dependency-is-standing-by-failure.md`
discipline beyond the cron-tick context to a substrate-engineering
invariant: **bounded named-dependency-wait is replayable;
unbounded wait is non-deterministic substrate**.

## Why this is a DST shape

Per `.claude/rules/dst-justifies-ts-quality-over-bash-and-harness-hooks-suffice...`
(the always-active DST discipline per
`.claude/rules/dv2-data-split-discipline-activated.md`):

- DST requires **deterministic replay from a seed**
- An unbounded wait CANNOT be replayed deterministically — the
  duration depends on external state the seed doesn't capture
- A bounded named-dependency-wait CAN be replayed — the seed
  captures the dependency (PR number, check name, ETA bound);
  replay either re-hits the same state OR fast-forwards past the
  bound

The cut:

| Wait shape | DST-compatible? | Failure mode |
|------------|-----------------|--------------|
| Bounded + named dependency + ETA stated | YES — replayable | n/a (correct shape) |
| Bounded but no named dependency | NO — undefined replay | Standing-by failure mode |
| Unbounded — "I'll check later" | NO — infinite-loop risk | Wait-forever failure mode |
| Bounded by wall-clock only | NO — non-reproducible | Anti-DST shape |

## Composes with five always-active disciplines

Per `.claude/rules/dv2-data-split-discipline-activated.md`,
substrate-engineering decisions apply five disciplines simultaneously:

1. Scale-free — does the wait work at multiple scales? (per-tick + per-PR + per-session)
2. Lock-free / wait-free — does it avoid contention? (named dependency = no shared lock)
3. Weight-free — no implicit weighting (ETA is explicit, not implicit)
4. **DST — can it be replayed?** (THIS rule's specific contribution)
5. DV2.0 — change-rate partition (wait-state is satellite; dependency identity is hub)

The bounded-named-dependency-wait shape passes ALL FIVE.

## Operational rule for future-Otto

When tempted to wait:

1. **Name the dependency explicitly** — PR #NNNN check `X`, Aaron's
   reply to question Y, external service Z, etc.
2. **State the ETA bound** — "~5min" / "until 22:30Z" / "until check `lint`
   passes" — concrete, bounded, externally-verifiable
3. **If you cannot name + bound, do not wait** — pick speculative
   work per never-be-idle (the bounded-name failure means the wait
   is non-DST; it's Standing-by failure mode wearing a different mask)
4. **Replayability is the test** — if a future-Otto cold-booting
   from this state couldn't reproduce the wait + its resolution,
   the wait is non-DST substrate

## Composes with other substrate

- [[feedback_dst_justifies_ts_quality_over_bash_and_harness_hooks_suffice_no_git_hooks_aaron_2026_05_03]] (DST discipline ground truth)
- `.claude/rules/holding-without-named-dependency-is-standing-by-failure.md` (the rule this generalizes)
- `.claude/rules/dv2-data-split-discipline-activated.md` (5 always-active disciplines)
- `.claude/rules/never-be-idle.md` (when bounded-name fails, pick work)
- PR #3029 (the Holding-discipline rule)
- PR #3042 (where I articulated bounded-named-dependency-wait; this memory generalizes it)
- `docs/AUTONOMOUS-LOOP-PER-TICK.md` (the canonical that codifies the discipline)

## Substrate-honest framing

This memory captures the GENERALIZATION the human maintainer made;
the original Holding-without-named-dependency rule already had
the operational core. The substrate-honest gain is the **DST
naming**: now future-Otto recognizes the wait-discipline as the
same shape as the broader DST substrate the factory runs on. The
cut from "good practice" to "deterministic invariant" is the
upgrade.
