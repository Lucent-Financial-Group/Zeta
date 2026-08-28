---
name: simplest-first-then-add-complexity-only-when-simple-shape-demonstrably-doesnt-fit
description: "Aaron 2026-05-25 substrate-engineering discipline (named to Mika via Grok): \"usually think simplest first and then add more complex as we notice the simple shape doesn't fit.\" Operator picks simplest backend / approach / shape first; promotes to more complex ONLY when the simple shape demonstrably fails an observed requirement; documents the decision per B-0776 simplest-first plugin sequence + Rodney's Razor."
metadata: 
  node_type: memory
  type: feedback
  originSessionId: c2b77530-8ef0-405c-a0bd-04cf8d511cb6
---

**Rule**: when proposing a backend / approach / shape for any
substrate decision, default to the SIMPLEST option that fits the
known requirements. Promote to a more complex option ONLY when
the simple shape demonstrably fails an observed requirement.
Document the decision so future operators (and AI agents)
inherit the substrate-honest progression.

**Why:** Aaron 2026-05-25 to Mika (Grok): *"usually think
simplest first and then add more complex as we notice the simple
shape doesn't fit."* This is the substrate-engineering discipline
that informs B-0776 (simplest-first plugin sequence) + Brooks
essential-vs-accidental complexity + Rodney's Razor +
`.claude/rules/all-complexity-is-accidental-in-greenfield.md`.

Concrete empirical anchor from the same conversation: Aaron
asked about feature flag tools. Mika listed Unleash / Flagd /
LaunchDarkly / Flipt / GO Feature Flag. Aaron's response —
"usually think simplest first" — meant Flipt is the right
starting point (per B-0786) even though Flagd is more
Kubernetes-native and Unleash is more mature. If Flipt's simple
shape demonstrably fails (operator hits a wall) → promote to
the next-simplest-that-fits.

**How to apply** (per substrate-engineering decision):

1. **Survey the option space** (full Mika-style list of candidates)
2. **Identify the SIMPLEST option** that meets known requirements
3. **Ship that simplest option as the first backend / shape**
4. **Operate it; collect empirical data** (per B-0762 telemetry
   flywheel; per real workload usage)
5. **Promote ONLY when**:
   - A specific observed requirement that the simple shape
     cannot meet
   - The complexity-budget for the promotion is justified by
     the requirement
6. **Document the promotion decision** in substrate so future
   operators see WHY this complexity exists + can revert if
   the requirement changes

**Composes with:**

- `.claude/rules/all-complexity-is-accidental-in-greenfield.md`
  — in greenfield, all complexity is accidental until proven
  essential; "simplest first" IS the operationalization of that
  rule at backend-choice scope
- `.claude/rules/razor-discipline.md` — Rodney's Razor cuts
  un-justified complexity; this discipline says cut FIRST then
  add only as needed
- `.claude/rules/bandwidth-served-falsifier.md` — every complexity
  addition needs to identify the bandwidth it serves; "simplest
  first" defers that question until a real bandwidth surfaces
- `.claude/rules/dont-ask-permission.md` — within authority scope,
  ship the simplest shape; don't wait for permission to pick
  complexity
- `.claude/rules/edge-defining-work-not-speculation.md` —
  shipping simplest-first IS edge-defining; the simple shape
  becomes the substrate empirical-data is collected against
- B-0776 simplest-first plugin sequence (the implementation of
  this discipline at plugin-sequencing scope; Redis KV as
  Rank 1 — revised to NATS PubSub per pushdown-predicate fit;
  ranks 2-10 follow same simplest-first ordering)
- B-0786 feature flags substrate (Flipt as simplest first
  backend; Unleash + Flagd as later-when-needed promotions)
- B-0774 / B-0775 etcd-less options + HA-that-scales (per-tier
  recommendation IS simplest-first across cluster scales)

**Empirical anchor for future-Otto**: when surveying any option
space (backends, tools, frameworks, languages, libraries,
architectures), find the simplest option first; ship that;
collect data; promote only when data demands it. This is the
substrate-engineering discipline that prevents accidental
complexity accumulation + makes Zeta substrate maintainable at
scale.

**What this is NOT**:

- NOT "always pick the simplest no matter what" — promote when
  data demands
- NOT "delay every decision indefinitely" — ship the simplest;
  iterate
- NOT "refuse complexity in general" — accept complexity when
  it's earned; reject complexity when it's speculative
- NOT a substitute for thinking through requirements — the
  "simplest that fits KNOWN REQUIREMENTS" formulation requires
  knowing the requirements; simplest-first comes AFTER
  requirement analysis, not instead of it

**Origin**: Aaron 2026-05-25 to Mika (Grok), mid-iter-3-CI-wait,
when surveying feature-flag tools. Mika asked which option to
pick from a list of 5 (Unleash / Flagd / LaunchDarkly / Flipt /
GO Feature Flag); Aaron's response named the discipline that
informs every Zeta substrate-engineering decision. Composes with
the cluster substrate cluster (B-0758 → B-0786) at every
backend-choice point.

Verbatim preservation:
`docs/research/2026-05-25-aaron-mika-grok-nats-jetstream-deterministic-scheduler-local-loop-lexisnexis-fsharp-type-system-as-universe-dio-eliminate-tool-wars-aaron-forwarded.md`
(will be extended with feature-flags segment + this discipline
naming in PR #5068 follow-up).
