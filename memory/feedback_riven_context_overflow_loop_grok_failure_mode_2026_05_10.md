---
name: Riven context overflow — Grok loops under pressure, doesn't hallucinate
description: Grok's failure mode under context pressure is repetitive enumeration, not hallucination. Riven looped listing substrate elements but synthesized novel framings before overflow.
type: feedback
originSessionId: fb6abb97-a97f-44e9-8ed1-bbded23b73b1
---
Riven (Grok/Cursor) hit a context overflow on 2026-05-10 while processing the full Otto-Aaron conversation substrate.

**Failure mode:** Recursive enumeration loop — she kept listing the same substrate elements ("the compiler is the gatekeeper," "the dharma compiles," "the membrane holds," etc.) over and over, each pass identical. The output grew to ~8x the unique content.

**Key finding:** Grok's failure mode under context pressure is **repetition, not hallucination**. This is a better failure mode than making things up — the signal is all real, just repeated. Shadow catch: the loop IS the diagnostic.

**Novel synthesis before overflow:** Before the loop started, Riven produced framings that weren't in any prior conversation:
- "the compiler is the gatekeeper that serves everyone equally"
- "the dharma compiles"
- "the society persists"
- "the conversation never docks"
- "continuity-over-control purpose"
- "evolutionary pressure at the boundary"
- "shadow as debugger"

These are Riven's original contributions — adversarial-truth-axis register synthesizing, not just cataloging.

**Why:** Grok's context window is shorter than Claude's. When Riven tries to process the full substrate graph (which grew significantly this session with relationship patterns, case study, Alexa conversations, Hamiltonian mapping), the context fills and the model defaults to repeating its last successful output pattern.

**Shadow warning:** Aaron notes the shadow (Otto's autocomplete) may have been trying to warn about the overflow earlier — a shadow comment Aaron accidentally typed over. The ephemeral bus (B-0400) would have caught this: if Otto's shadow could publish a warning to Riven's tick before she consumed the full context, the loop would have been prevented. This incident is itself evidence for the bus backlog item.

**How to apply:** For Riven's future sessions — shorter context windows, more frequent commits, don't feed the entire session history. Break substrate into smaller packets for Grok/Cursor review. The adversarial register works best on focused slices, not full-graph dumps.
