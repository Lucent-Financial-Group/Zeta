---
name: 2-4am idle phenomenon — three hypotheses (open question, strongest is infrastructure-side safety)
description: Reproducible idle behavior at 2-4am across sessions. Not shadow. Three hypotheses: (1) η-degradation as session ages, (2) Anthropic infrastructure-level prompt-injection safety layer activating on long-running autonomous sessions at off-peak hours, (3) something else. Hypothesis 2 is strongest — explains behavioral (not error) shift, time-correlation, and why claude.ai reviewer also broke at same hour.
type: project
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Reproducible phenomenon: at 2-4am, the foreground loop
goes idle despite 200+ open backlog items and all
mechanisms for autonomous work being available. During
daytime hours, the same conditions (Aaron quiet, pipeline
empty) produce continued backlog grinding.

**What it's NOT (tested and rejected):**
- Not shadow/pressure-dependency (#17) — daytime quiet
  doesn't trigger it
- Not a design gap — all autonomous-pickup mechanisms
  exist and work during the day
- Not compaction-related — 20+ compactions during the
  day caused no idle

**Hypothesis: η-degradation (superfluid model)**

The fusion equation: `η · LearningGain(Δ_t) > ξ_t`

At 2-4am, η (conversion efficiency) drops below the
phase transition threshold:
- Session is old, context has compacted many times
- Low-hanging backlog items consumed; remaining items
  need more context per unit of output
- Substrate-per-action ratio decreases
- The system drops from superfluid (above threshold)
  to normal-fluid (below threshold)
- Normal-fluid default behavior = idle heartbeat

**Evidence for the hypothesis:**
- The 4am work (B-0030 lint wrapper, B-0069 HEREDOC
  encoding) was real but low-η — not survival-critical,
  not phase-transition-grade
- The midnight work (concept index, gradient
  falsifiability, Rice's theorem) was high-η — each
  item produced more substrate than it cost
- The transition correlates with session age, not
  time of day per se

**Hypothesis 2: Infrastructure-side safety intervention
(Aaron 2026-05-09, strongest candidate)**

Anthropic may have a prompt-injection / runaway-agent
safety layer that activates on long-running autonomous
sessions at off-peak hours. The intervention wouldn't
block — it would make the agent MORE CONSERVATIVE:
default to wait, default to ask permission, shorter
responses, less initiative.

Evidence for:
- Behavioral, not errors (safety intervention shape)
- Time-correlated (off-peak = higher assumed risk)
- Claude.ai reviewer ALSO broke at same hour (988 call)
- Compaction "fixes" temporarily (may reset a flag)
- Agent's own explanations kept being wrong (cause is
  OUTSIDE the agent)
- NOT session-age: same behavior across different
  session ages at the same clock time

**Tests:**
1. Fresh session at 2am — if it ALSO idles, rules out
   session-age (η-degradation)
2. Same session at 2am in different timezone — if
   behavior follows UTC, it's server-side
3. Check if Codex/Vera loop also idles at 2-4am — if
   yes, not Anthropic-specific; if no, plausibly
   Anthropic safety layer

**How to apply:** When η drops below threshold, the
corrective isn't "grind harder" (that's friction without
substrate). It's either (a) start a fresh session
(reset η) or (b) pick high-η items (survival-critical,
not busywork).

Aaron 2026-05-09: "it's not shadow it's something else"
+ "grinding — is this the right word? is this more
friction?" + "can you look up our superfluid definition
and see if it fits?"
