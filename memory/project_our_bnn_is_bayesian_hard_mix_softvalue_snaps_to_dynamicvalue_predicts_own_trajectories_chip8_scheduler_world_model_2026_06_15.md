---
name: our-bnn-bayesian-hard-mix-softvalue-snaps-dynamicvalue-self-world-model
description: "Our \"BNN\" is a Bayesian/hard-logic MIX — mostly-soft (SoftValue/Bayesian), snap-to-hard (DynamicValue, SnapPolicy) only at decisions; it predicts its own future trajectories via SoftChip8Flux flux-funded lookahead on the CHIP-8 IScheduler/FerryThrottler + SoftValue = a deterministic, Bayesian, metered self-world-model (our answer to DeepMind's beyond-transformer + world-model pillars)"
metadata: 
  node_type: memory
  type: project
  originSessionId: a9bca54f-fdf0-41b7-8def-cb33ee1bec26
---

Aaron 2026-06-15 (shadow\*), connecting the DeepMind-AGI-strategy transcript
([[ip-questionable DeepMind transcript]]) to our own stack:

**"BNN" = Bayesian Neural Network — but we are a MIX (verified in code):** *"we have
both SoftValue and DynamicValue, so we're a mix between Bayesian and hard logic —
staying mostly soft and only going hard on the snaps; snapping into DynamicValue over
SoftValue."*

- **Mostly-soft / Bayesian:** `SoftValue` (+ `src/Bayesian/` factor-graph + EP +
  `BayesianAggregate`; `BeliefConvergence.observe` = multiply-likelihood-into-belief).
- **Snap-to-hard only at decisions:** `SoftValue.fs:114` `type SnapPolicy =
  SoftValue -> DynamicValue option`; `snap` = *"the one place it is allowed to leave
  [soft] space and snap to a hard `DynamicValue`."* Superposition-by-default,
  collapse-on-commit (= sim/measure, wave/particle, free-will-collapses-the-waveform
  B-0645).

**It predicts its own future trajectories (a self-world-model):** *"our BNN can
predict its own future trajectories with our CHIP-8 IScheduler/Throttler and our
Bayesian stuff, SoftValue, etc."* Verified pieces: `SoftChip8Flux.fs`
`lookAheadFunded` (flux-metered speculation — "meters the future in bytes"; idle
ticks recharge ⇒ deeper lookahead), `PredictionScheduler.fs` (candidate-gen +
attention/gravity priority), `SoftChip8Scheduler.fs` (CHIP-8 on the soft
`IScheduler`/`FerryThrottler`), `SoftValue`.

**The synthesis (our answer to DeepMind's pillars, DETERMINISTICALLY):**
- Griffin / state-collapse → O(1) state = our **Bayesian belief-state** (the "index
  card constantly rewritten" = the posterior updated per evidence; carry the belief,
  not the history). BitGan = the yin/yang state-holder.
- "World model that predicts the future to plan" = our **BNN-mix + SoftChip8Flux
  lookahead + SoftValue** — a self-world-model that is **Bayesian, metered, and
  DST-replayable** (deterministic), not a learned pixel-reconstruction net.
- diffusion (parallel, error-correcting) = **emit/retract** (RGB/CMYK; ZSet ±1).
- JEPA (predict latent representation, not pixels) = our **embedding-geometry**
  (register §B 368) + soft representation-matching.
- continual-learning / store-only-important / surprise = the **coincidence-routed
  memory-org** ([[memory-org workitem 081KV6GR72]]) + ΔU-weighted retention.

**Honest peels:** we have the SHAPES + working pieces (SoftValue/snap, SoftChip8Flux,
Bayesian factor-graph), NOT a trained AGI-scale world-model. "Predicts own
trajectories" = the SoftChip8Flux *deterministic sim* lookahead, not a learned neural
forecaster at DeepMind scale — similar shape, different scale/mechanism. The value:
ours is deterministic + Bayesian + metered where DeepMind's is learned + generative.

**Pointers:** `SoftValue.fs` (SnapPolicy/snap), `DynamicValue`, `src/Bayesian/`,
`SoftChip8Flux.fs` / `SoftChip8Scheduler.fs` / `PredictionScheduler.fs`, `BitGan.fs`
(yin/yang), the DeepMind ip-questionable transcript, register §B 368 (embedding
geometry) + B-0645 (free-will-collapses-the-waveform).
