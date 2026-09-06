---
id: 081M1TXSGV2087G0R000Y88DEY
type: task
state: done
priority: P2
slug: measure-learned-predictive-states-on-the-mess3-process
title: "Measure learned predictive states on the Mess3 process"
created: 2026-09-06T08:36:37.346Z
completed: 2026-09-06T09:31:27.568Z
depends_on: []
composes_with: [081M1TRRN18087G0R00082EDMR]
---

# Measure learned predictive states on the Mess3 process

Continue the [exact comparison](../../../../docs/research/2026-09-06-simplex-wset-comparison-and-stack-verdicts.md)
with a genuinely trained, observation-only recurrent network. The scientific
result may be negative. Runtime promotion and game integration require separate
evidence and are not acceptance conditions for this task.

## Acceptance

- [x] Published Mess3 transitions independently checked; hidden states never enter training.
- [x] Bounded native learner with finite-difference gradient and deterministic replay tests.
- [x] Frozen experiment configuration, all runs retained, separate probe fitting and evaluation.
- [x] Exact-filter, empirical Markov, random-network, and shuffled-probe controls.
- [x] Next-token and multi-step losses, held-out belief decoding, and resource measurements.
- [x] Independent numerical cross-check, review findings, build/test/lint results, and claim limits preserved.

Experiment protocol and results: [Mess3 learned belief experiment](../../../../docs/research/2026-09-06-mess3-learned-belief-experiment.md).
