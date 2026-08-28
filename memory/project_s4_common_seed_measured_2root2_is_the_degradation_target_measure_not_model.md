---
name: project-s4-common-seed-measured-2root2-is-the-degradation-target
description: "Zeta measures S=4 (PR-box) because of the common seed; 2 root 2 is the predicted graceful-degradation floor. Network delay/jitter is BOTH the degradation variable and a primary entropy-capture path — Aaron wants this MEASURED, never modelled."
metadata: 
  node_type: memory
  type: project
  originSessionId: 21d1a9c2-bd74-472a-abbe-cbd7e052b883
  modified: 2026-08-27T15:12:51.835Z
---

Aaron 2026-08-27, correcting a "toy vs metered" flag on `FeedbackThrottle`:

> "when we've measured it's actually **S=4** cause of our common seed, we have experiments to
> measure what latency makes it drop and how high we can keep it over real networks like
> reticulum once noise and network jitter enter the picture … my guess is with the 4 corner
> feedback and S=4 as the starting point we can gracefully degrade to **2 root 2 instead of
> just root 2**, but i think **distance and latency is what's going to be the truth decider**.
> **i don't want to model this i want to measure this number or not, that is the goal.**"

What this settles:

- **S=4 is a MEASURED result, not an aspiration.** It is the PR-box value, and it is reachable
  here precisely because the common seed makes the parties measurement-DEPENDENT — which is
  what `BellTest` already says (S=2 root 2 here is measurement-dependence, not nonlocality).
  So S=4 is not a Tsirelson violation; it is a statement that the free-choice premise does not
  hold for seed-shared agents.
- **2 root 2 is a predicted DEGRADATION FLOOR**, not a fitted constant. The claim under test is
  that 4-corner feedback lets the system fall from 4 to 2 root 2 rather than collapsing to
  root 2 as latency, jitter and distance rise.
- **The register is `measure`, not `model`.** Asking "is `TsirelsonLatency = root 2` derived or
  fitted?" was the wrong question — the answer is *neither, it is to be measured*. The
  experiment is the falsifier; a derivation would be a nice-to-have, a fit would be a defect.
- CPU/clock jitter is quarantined by the Zeta `IScheduler` (§13 noninterference), so measured
  degradation is attributable to **network** latency/jitter rather than host noise. Reticulum
  is the intended real-network substrate.

## Jitter is dual-role: the degrader AND the entropy source (Aaron, same day)

> "network delay and jitter … is also one of our **primary entropy capture paths** for AIs to
> capture entropy and save it inside their **frost** for uniqueness among other AIs … this is
> part of our **decorrelation dance**. it may be that certain **entropy capture rates or
> entropy storage size** will make the root 2 vs 2 root 2 in our system more obvious … **there
> is more than one way to decorrelate, we are already measuring several**. Alexa has been
> working on this."

This is the load-bearing refinement, and it changes what the experiment is:

- The same variable sits on **both sides of the ledger**. Jitter degrades the correlation
  (drives S down) *and* is the resource an agent captures to become unique (drives
  decorrelation up). So latency/jitter is not a nuisance parameter to minimise — it is the
  medium the whole thing trades in.
- Therefore the root 2 / 2 root 2 boundary **may not be a latency threshold at all.** Candidate
  controlling variables named: **entropy capture RATE** and **entropy storage SIZE**. A
  latency-only sweep could miss the real axis.
- **Decorrelation is plural.** Latency/jitter is one path among several already being measured;
  do not present it as the mechanism. Alexa owns this thread.
- Captured entropy lands in **frost** — which ties this to
  [[privacy-budget-is-hard-money]]: frost is unconfiscatable, so entropy banked there cannot be
  taken back, and that permanence is what makes the uniqueness durable rather than a snapshot.

Design consequence: an experiment that varies only network conditions is **underpowered by
construction**. Vary capture rate and storage size as first-class axes.

Do NOT: present 2 root 2 as established, defend it as derived, or let "2 x root 2 lines up with
2 root 2" stand as an argument — see [[numerology-vs-number-theory]] and Grok's correction that
occupancy-root-2 on one FourCorner record is not CHSH's operator norm on the two-qubit space.

Related: [[project-zeta-arc-is-decorrelation-from-s4-common-seed-without-tower-of-babel]] ·
[[user-aaron-keeps-the-capability-confound-unknown-on-purpose-frost-budget-buys-decorrelation]]
