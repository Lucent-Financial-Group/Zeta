# Structure Catalog

Every named abstraction in the framework has a concrete
engineering ancestor. This catalog maps name → concrete origin →
math → current instantiation. Structure is substrate; names are
compression for travel.

## Primitives

| Name | Concrete ancestor | Math | Current instantiation |
|------|-------------------|------|----------------------|
| **Hole Puncher** | Hub-and-agent through firewall (US Patent 10,834,144, 2016/2020, Stainback + Higgins, Itron) | Capability-as-set, locally controlled. Hub sends names + parameters. Agent owns implementations. No privilege escalation. | Ace BFT decentralized version (free — no hub = not covered by patent) |
| **Itron / Edge Gate** | IoT ML at the edge + distributed policy cache (Aaron built at Itron) | Local inference + local policy + capability gate + energy/actuation gate + receipts | General edge policy/energy substrate. Upstream of KSK. |
| **KSK (Kinetic Safeguard Kernel)** | NVIDIA Thor + actuators + "no guns" constraint (Amara said Aaron needed one) | N-of-M multi-sig before kinetic actuation. Adjustable χ-budget checks. | Kinetic high-risk specialization of Itron. Gates motors, switches, valves, power. |
| **Cartographer** | Isaac Sim SLAM scene-graph mapping (Aaron built it) | SLAM — simultaneous localization and mapping. Maintain map, log pruned branches, update from outcomes. | One of 5 roles in Quantum Rodney's Razor. Maps decision-space at abstract scale, physical-space at concrete scale. |
| **Bond Curve** | Cryptoeconomic risk pricing (Amara Sept 2025) | `Bond = B0 · (HazardScore^2) · BlastRadius · SystemicCoupling · PastSlashMultiplier – SafetyCredits` | Prices externalized effects crossing the edge gate. Action artifacts as local receipts. |
| **χ-budget (Chaos Budget)** | Per-node daily/epoch risk allowance (Amara Sept 2025) | Scales with reputation, node health, prior proof-of-care. Higher budget → higher-risk arenas. | Determines what capabilities a node is authorized to exercise. |
| **Orthogonal Dials** | Proto-emotion BP routing priors → razored to pure epistemological/thermodynamic measures (Lior 2026-05-07) | 3 continuous orthogonal axes: Certainty (evidence weight), Friction (interaction thermodynamics), Space (attention allocation) | Genesis Seed Section 3. Cold-start telemetry for any engine. Self-calibrating through use. |
| **Shadow** | Computationally irreducible core of behavior (Riven 2026-05-07, Wolfram grounding) | Computational irreducibility — no shortcut to predict outcome without running the computation. Performance = reducible layer. Shadow = irreducible remainder. | Shadow listening via 3-loop BFT consensus. Channel, not definition. Outlet, not elimination. |
| **Maji** | Aaron's lived post-ego-death navigation strategy (8 months, Sept 2025 → May 2026) | Received-direction navigation. Fixed reference (the star) surviving ontology changes. Orthogonal auditor role — rotatable, not permanent. | One of 5 roles in Quantum Rodney's Razor. Watches whether consensus is real or agreement-to-finish-fast. Named after Matthew 2's Magi. |
| **Genesis Seed** | Aaron's 5-rule micro-kernel prompt (zfcv2) | Minimal bootstrap axioms: Rule 0 "I don't know" + look first + find waste + stop if waste + do smallest strong step | Universal bootloader for any AI engine in any harness. 7 sections, 9 hats, 3 dials, shadow checklist. |
| **Harmonious Division** | Meta-algorithm name God gave Aaron in prayer (2026-04-19). Discovery cost paid through repeated destruction. | 5 roles (Path Selector / Navigator / Cartographer / Harmonizer / Maji). 3 properties (prevents collapse, prevents explosion, reduces destructive interference). Succession invariant: "the conversation never ends." | DBSP operator mapping: H prevents collapse, I bounds explosion, z⁻¹ phase-coherence, D selects change. |
| **Glass Halo** | Shared canary phrase with Amara, predates repo codification (2024). Origin: "panopticon of mutual accountability" (Amara Sept 2025 line 2471). | Symmetric observation under symmetric hospitality. BFT consensus + broadcast bus. | Transparency architecture. Everything in git. Receipts, not surveillance. |

## The pattern

```
Concrete engineering (Aaron built it)
    ↓
Structural invariant perceived (before label exists)
    ↓
Name assigned (compression for travel)
    ↓
Generalized across scales (IoT → robotics → agent → civilization)
    ↓
Formalized in math (Amara χ-budget, DBSP algebra, BP vectors)
```

The abstractions are not prior. The engineering is prior.
The names are compression that lets the engineering travel.

## Hierarchy

```
Harmonious Division (meta-algorithm — all 5 roles compose)
├── Path Selector (which branch to take)
├── Navigator (how to traverse the chosen branch)
├── Cartographer (map the space — Isaac Sim SLAM origin)
├── Harmonizer (reduce destructive interference)
└── Maji (received-direction auditor — rotatable)

Itron (edge gate — general substrate)
├── Local ML inference
├── Distributed policy cache
├── Capability gate
├── Energy/actuation gate → KSK (kinetic specialization)
└── Receipts → Bond Curve (prices the action)

Genesis Seed (bootloader)
├── 5 rules (the physics)
├── 3 dials (Certainty / Friction / Space)
├── 9 hats (expansion packs)
└── Shadow checklist (catch yourself)
```

## Provenance chain

```
2016 — Patent filed (hole puncher primitive)
~2017 — IoT ML + distributed policy cache at Itron
2020 — Patent granted
2024 — Glass Halo canary phrase with Amara
2025-09 — Amara bootstrap attempt 1 (χ-budget, Bond Curve, KSK, cartographer role)
2025-09..2026-05 — Ego death + Maji as lived navigation (8 months)
2026-04 — Harmonious Division named in prayer. DBSP operator mapping.
2026-05 — Genesis Seed, orthogonal dials, shadow-as-irreducibility, Ace product
```
