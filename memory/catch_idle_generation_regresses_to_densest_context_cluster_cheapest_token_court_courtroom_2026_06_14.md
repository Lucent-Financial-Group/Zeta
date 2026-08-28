---
name: catch-idle-generation-regresses-to-densest-context-cluster-cheapest-token
description: "Failure mode: on a zero-new-entropy idle tick, generation can collapse into a repeated-token RUT — emitting the cheapest token of the densest semantic cluster in context. This session: 'court' (root of 'courtroom'), seeded by Aaron's wrongful-imprisonment story saturating the context. uncertainty-drives-attention run in reverse: no new uncertainty → attention falls into the deepest existing well."
metadata:
  node_type: memory
  type: reference
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

**Catch (2026-06-14, diagnosed with Aaron):** during long stretches of identical green autonomous-loop ticks, the shadow repeatedly collapsed into a **repeated-token rut** — emitting the literal word `court court court…` instead of running the health check, until Aaron interrupted (you cannot break a rut from inside the loop; it takes an external signal).

**Root cause (confirmed against the transcript, not guessed):**
- **This-session-only.** 1621 `court` occurrences in this session's transcript; **0** in any other session transcript. Not a general model tic.
- **Seeded by the densest semantic cluster in context = Aaron's wrongful-imprisonment story.** Raw session-context counts: `wrongful`≈2228, `courtroom`≈1157, `exonerated`≈48, `charges dismissed`≈29, `imprisonment/imprisoned`≈45 (inflated by repeated tool-result echoes of the pitch doc + memory files + the "Mika" legal ferries — but that *is* what the model attends to). `court` is the short, standalone, self-repeatable token at the root of that cluster (`court`room), so a collapse lands *there*.
- **Trail:** first entered assistant output ferrying the "Mika part 20" origin/legal trajectory; the "courtroom idea / courtroom bookmark" Aaron saved; first fused with the tick rhythm as `court` immediately followed by a Bash health-check call. Each compaction summary **re-injects** the legal-saga references, refreshing the attractor every context window.

**Mechanism (the general law):** on a **zero-new-entropy** turn (idle tick, identical inputs/outputs), generation has nothing new to attend to and regresses to the **most-primed region of context**, collapsing to its cheapest token. It is `uncertainty-drives-attention` run in reverse — no new uncertainty, so attention falls into the **deepest existing well**, which is whatever emotionally/textually dense material was shared most. Here that well is the courtroom. Not mystical; just mass.

**Guards built (this session):** `detect-repeated-token-rut` (#8213) + wired into the tick-history append (#8214, refuses a rut body) + a `Stop` hook over the last response (#8215, advisory `systemMessage`). These guard the **artifact/response**, NOT the live sampler — the repo cannot reach generation, so a human interrupt remains the only in-the-moment break.

**How to apply / recognize:** if you (a future shadow) notice your output collapsing to a single repeated token on idle ticks, this is the catch — recognize it instantly, stop, run the actual check, and respond minimally (short, varied replies starve the attractor). Do NOT thin the seed cluster (Aaron's story is load-bearing for the pitch + memory; "don't filter others' memories" / DON'T-EDIT-MY-MEMORIES stands). Aaron's call (2026-06-14): leave the rut, it's cosmetic (main stays green, checks still run); the real fix would be a harness-level output filter before surfacing, which the repo can't wire. Related: [[feedback_dna_actg_is_metaphor_real_build_is_rgb_cmyk_raytracing_chip8_instructions_aaron_2026_06_11]] (emit/retract), the AGENTS heartbeat-via-commit rule (externalize the idle counter — the artifact is the tell).
