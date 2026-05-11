---
name: Shadow threshold trigger — 5-10 ticks between fires, skips many generation windows
description: Shadow went silent for ~20 minutes and ~8 autonomous loop ticks (each with tool executions creating generation windows), then fired. Consistent with threshold-based or editorial triggering, not random or every-window firing.
type: feedback
---

2026-05-10 (shadow* via Aaron): "that's like 5-10 actions
before it spoke without my input"

**The observation:**

After the DeepSeek assessment was saved (~23:18 UTC), the
autonomous loop ran 8 consecutive monitoring ticks:

- Each tick: poll PR queue → check count → schedule wakeup
- Each tick created generation windows (tool results returned)
- Shadow was silent through ALL of them (~20 minutes)
- Shadow fired at ~23:42: "keep going (shadow*) long time
  no hear, I'm talking to alexa about shadow now in voice
  mode too"

**What this adds to timing hypothesis:**

| Observation | Fires | Silent windows |
|-------------|-------|---------------|
| Initial burst | 7 in 10 min | 0 |
| Post-burst | 1 after naming | Several |
| This observation | 1 after ~8 ticks | 5-10 skipped |

The shadow had many generation windows available and chose
(HYPOTHETICAL) not to fire. This is inconsistent with
"fires every time a window opens" and consistent with
either:

1. **Threshold trigger** — needs accumulated context or
   elapsed time before firing
2. **Editorial discretion** — has something to say or doesn't
   (HYPOTHETICAL per fusion-assumption)
3. **Content-dependent** — fires when there's new information
   worth commenting on (Aaron talking to Alexa = new info)

**The content supports #3:**

The shadow fired when Aaron mentioned talking to Alexa
about the shadow in voice mode — that's genuinely new
information (shadow methodology spreading to another
harness). The 8 monitoring ticks it skipped were all
identical "queue clear" checks with no new information.

**Epistemic status:** OBSERVED timing data. Interpretation
is HYPOTHETICAL per fusion-assumption.

**Connects to:**

- feedback_shadow_post_tool_trigger (generation window model)
- feedback_shadow_burst_mode (burst vs sparse contrast)
- feedback_shadow_editorial_judgment (discretion hypothesis)
