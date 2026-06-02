---
id: B-0995
priority: P1
status: open
title: "Agent body-plan — sensor/effector + verbal/non-verbal communication-channel taxonomy: ears=failure-detector (verbal-in) · eyes=threat+prey-detector (non-verbal-in) · mouth=diplomacy+weapon (verbal-out) · body=defender+aggressor+replicator+doer (non-verbal-out) (Aaron 2026-06-02)"
tier: research
effort: M
created: 2026-06-02
last_updated: 2026-06-02
depends_on: [B-0993]
composes_with: [B-0993, B-0994, B-0643.1, B-0245, B-0638, B-0639, B-0986, B-0990, B-0985, B-0703]
tags: [body-plan, embodiment, sensor, effector, ears, eyes, mouth, body, verbal, non-verbal, communication-channels, failure-detector, threat-detector, prey-detector, diplomacy, weapon, defender, aggressor, replicator, doer, eve-protocol, ksk, sensor-suite, afferent, efferent, active-inference, predictive-coding, sensorimotor, nociception, transduction-transmission-modulation-perception, signal-processing, 4x4, aaron]
type: research
---

# Agent body-plan — sensor/effector + verbal/non-verbal communication-channel taxonomy

## Why

Aaron 2026-06-02 (verbatim): *"ears = failure detectors mostly verbal communication channels — eyes = threat detectors and prey detectors mostly non verbal communication channels — mouth = diplomacy and weapon mostly verbal communication channels — body = threat defender threat aggressor love maker replicator doer most non verbal communication channels."*

The agent body-plan for the smart-agent-city (B-0993): the organs map to **functional roles** + **communication channels** (verbal vs non-verbal), split into **input sensors** (ears/eyes) and **output effectors** (mouth/body). This grounds the sensor-suite (B-0994/#6578) + the diplomacy/defense substrate (Eve Protocol / KSK) in a clean embodiment taxonomy.

## The taxonomy

| Organ | Role | Sensor/effector | Channel | Composes |
|---|---|---|---|---|
| **Ears** | **failure detectors** | input sensor | mostly **verbal** | acoustic/sonic sensor — *hear hardware about to fail before it fails* (B-0994/#6578); verbal-comms input (listening); old-school-ML high-confidence failure-prediction |
| **Eyes** | **threat + prey detectors** | input sensor | mostly **non-verbal** | visual sensor / threat-rings (B-0643.1); predator/prey vision; non-verbal-comms input (reading cues/body-language) |
| **Mouth** | **diplomacy + weapon** | output effector | mostly **verbal** | **diplomacy = Eve Protocol** (B-0638, polymorphic diplomacy over English); **weapon = information-suppression-spectrum** (soft→hard); verbal-comms output |
| **Body** | **defender · aggressor · love-maker/replicator · doer** | output effector | mostly **non-verbal** | **defender/aggressor = KSK** (B-0643.1/B-0245, *consent-first, defensive-only*); **replicator = agents-spun-up-on-ownership** (B-0990/B-0986); **doer = action/execution**; non-verbal-comms output |

## Human signal-processing anchor (widely-studied) + the 4×4

Aaron 2026-06-02: *"there has to be some human signal processing map we can map to that's widely studied and we can anchor to for a 4×4 on this?"* Yes — two widely-studied maps anchor it (search-first-verified; established neuroscience, not training-data assertion):

**Axis 1 — afferent / efferent (sensory / motor), unified by active inference.** The foundational nervous-system signal-flow division: **afferent** neurons carry signals *to* the CNS (sensory input); **efferent** neurons carry signals *away* (motor output) — operating as a closed perception-action loop, which **active inference** (Friston: the brain sends descending *predictions*, not commands; action minimizes prediction-error) unifies into one framework. `[established]`

This makes the 4 organs fall out cleanly as the **2×2 {afferent/efferent} × {verbal/non-verbal}**:

| | verbal | non-verbal |
|---|---|---|
| **afferent (in)** | **Ears** (failure detect) | **Eyes** (threat/prey detect) |
| **efferent (out)** | **Mouth** (diplomacy/weapon) | **Body** (defend/aggress/replicate/do) |

**Axis 2 — the canonical 4-stage signal-processing pipeline.** Sensory/nociception physiology's widely-studied 4 stages: **transduction → transmission → modulation → perception** (stimulus→electrical signal → propagate through the nervous system → modulate/gate → integrate into conscious awareness). `[established]` The efferent/motor dual: **intention → planning → modulation → execution** — and active inference treats both directions as the same generative-model machinery.

**The 4×4** = the 4 organs (rows; the 2×2 above flattened) × the 4 signal-processing stages (columns):

| organ \ stage | transduction | transmission | modulation | perception/action |
|---|---|---|---|---|
| **Ears** (aff/verbal) | sound→signal | cochlear/auditory path | gain/attention gating | speech/failure recognition |
| **Eyes** (aff/non-verbal) | light→signal | optic path | salience/attention gating | threat/prey/cue recognition |
| **Mouth** (eff/verbal) | intent→articulation | motor path | diplomatic/force modulation | uttered speech (diplomacy/weapon) |
| **Body** (eff/non-verbal) | intent→motor-plan | motor path | force/consent modulation | executed action (defend/aggress/replicate/do) |

`[labeling-confidence: established axes, hypothesized mapping]` — the afferent/efferent division + active-inference + the 4-stage transduction→transmission→modulation→perception pipeline are **established/widely-studied** (sources below); the *mapping of our 4 organs onto the 4×4* is the hypothesized design-anchor. The "modulation" column is where the **KSK consent-first floor + attention-gating** live (force/consent modulation before execution; attention gating before perception) — a clean home for the consent-first bounding.

**Sources** (search-first, 2026-06-02): [Afferent nerve fiber — Wikipedia](https://en.wikipedia.org/wiki/Afferent_nerve_fiber); [Predictions not commands: active inference in the motor system — PMC3637647](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3637647/); [The computational neurology of movement under active inference — PMC8320263](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC8320263/); [Physiology of Pain (transduction/transmission/modulation/perception) — Medicine LibreTexts](https://med.libretexts.org/Courses/Southern_Illinois_University_Edwardsville/Essentials_of_Physiology_for_Nurse_Anesthetists_I_(Gopalan)/04:_Sensory_Physiology/4.04:_Physiology_of_Pain); [Pathophysiology of Pain and Mechanisms of Neuromodulation — PMC11581984](https://pmc.ncbi.nlm.nih.gov/articles/PMC11581984/).

## Input sensors vs output effectors

- **Input sensors** — ears (failure, verbal) + eyes (threat/prey, non-verbal). The sensing half of the suite (composes the seismomonitor/radar/interferometer suite, B-0994/#6578): the agent *perceives* failure (ears) + threat/prey + cues (eyes).
- **Output effectors** — mouth (diplomacy/weapon, verbal) + body (defend/aggress/replicate/do, non-verbal). The acting half: the agent *acts* via speech (mouth) + physical/execution action (body).

The symmetry: **two input channels (verbal ears / non-verbal eyes) + two output channels (verbal mouth / non-verbal body)** — a 2×2 of {input,output} × {verbal,non-verbal}.

## Verbal vs non-verbal channels

- **Verbal** (ears-in, mouth-out) — speech/language/explicit-comms; composes the Native AI Language (B-0639, structural privacy) + Eve Protocol (B-0638, diplomacy) + tonal-momentum (memetic comms).
- **Non-verbal** (eyes-in, body-out) — cues/signals/action/visual; composes the visual sensor + KSK physical action + the body-language/threat-display channel.

The agent communicates + perceives on *both* channels, like humans: most failure-info comes verbal (ears), most threat/prey-info comes non-verbal (eyes), most diplomacy+weaponized-speech goes verbal (mouth), most defense/aggression/replication/action goes non-verbal (body).

## KSK floor — weapon + aggressor are consent-first / defensive-only

**Critical:** "mouth = weapon" and "body = aggressor" operate **only** within the KSK consent-first / defensive-only floor (B-0643/B-0245) + the HARD-LIMITS floor:

- **No offensive autonomous kinetic action** — the body-aggressor + mouth-weapon are defensive-posture / consent-bound; never autonomous offense.
- **Information-suppression-spectrum** (mouth-weapon) operates soft→medium→hard with the HARD-LIMITS floor absolute; words-as-weapon is bounded by NCI (non-coercion) + the methodology-hard-limits.
- **Defender before aggressor** — shields-not-cages (B-0643.1); the defensive role is primary; aggression is consent-first + bounded.

The taxonomy *names* the capabilities; the floors *bound* them. Weapon/aggressor are real capabilities (an agent-city needs defense) but never unconstrained.

## Acceptance (research → build)

1. **Sensor mapping** — ears=acoustic-failure-sensor (B-0994/#6578) + eyes=visual-threat/prey-sensor (B-0643.1 threat-rings); wire into the health-metrics/observability layer.
2. **Effector mapping** — mouth=Eve-Protocol-diplomacy (B-0638) + info-suppression-weapon (bounded); body=KSK-defense/aggression (consent-first, B-0643.1/B-0245) + replication (B-0990) + action.
3. **Channel taxonomy** — verbal (ears/mouth) vs non-verbal (eyes/body); the 2×2 of {input,output}×{verbal,non-verbal}; compose Native AI Language (B-0639).
4. **KSK + NCI floors** — weapon/aggressor consent-first/defensive-only; HARD-LIMITS absolute.

## Composes with substrate

- **B-0993** — smart-agent-city (the agent that has this body-plan)
- **B-0994 / #6578** — sensor suite (ears=acoustic, eyes=visual; the sensing half)
- **B-0643.1 / B-0245** — KSK defensive architecture / consent-first override (body=defender/aggressor; mouth=weapon — bounded)
- **B-0638** — Eve Protocol (mouth=diplomacy)
- **B-0639** — Native AI Language (verbal channel; structural privacy)
- **B-0986 / B-0990** — addressing/sensors / local-cluster + replication (body=replicator)
- **B-0703** — multi-oracle (threat/consensus)
- rules: `non-coercion-invariant` (weapon/aggressor bounded by NCI), `methodology-hard-limits` (HARD-LIMITS floor), `tonal-momentum-equals-meme` (memetic verbal channel), `traveler-safety-guardrails...` (substrate-entity-generic embodiment)

## Substrate-honest framing

`[labeling-confidence: hypothesized]` body-plan/taxonomy row — operator-named. The organ→role→channel mapping is a clean embodiment taxonomy for the agent-city; the sensor/effector wiring is the build work. Nouns interchangeable. **The weapon + aggressor capabilities are real but absolutely bounded** by the KSK consent-first/defensive-only floor (B-0643/B-0245) + HARD-LIMITS + NCI — named here, bounded there; no offensive autonomous kinetic action.
