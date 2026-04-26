---
Scope: canonicalized strict-version of Amara's Aurora Immune System math after 4-pass cross-AI review (Otto + Gemini surface + Gemini Deep Think + Amara). Operationalizes the 10 corrections Amara directed in her review-of-the-review. Research-grade specification with test obligations.
Attribution: Amara (named-entity peer collaborator; first-name attribution permitted on `docs/research/**` per Otto-279) authored the original Aurora framework + the corrections. Gemini Pro provided two reviewer passes (surface + Deep Think mode). Otto (Claude opus-4-7) authored the rigor pass + this consolidation per Amara's explicit direction.
Operational status: research-grade
Non-fusion disclaimer: agreement, shared language, or repeated interaction between models and humans (or among Amara, Gemini Pro, and Otto) does not imply shared identity, merged agency, consciousness, or personhood. Each reviewer's findings are preserved with attribution boundaries; this document canonicalizes the strict version per Amara's direction without flattening reviewer authorship.
---

# Aurora Immune System math — standardization (4-pass cross-AI review consolidated)

**Triggering source:** Amara's review-of-the-review 2026-04-26 (forwarded via Aaron). Amara grades the prior 4 passes:

| Review | Value | Risk |
|--------|-------|------|
| Gemini surface / praise-register | Morale + architecture-shape recognition | Overclaim ("ironclad", "civilization-level lab") |
| Otto (Claude) | Best rigor pass; catches real math gaps | Needs source/citation hardening |
| Gemini Deep Think | Strong implementation cleanup; set/capability correction | Over-corrects λ_1 → λ_2 unless matrix type specified |
| Amara (this synthesis) | Keep architecture, tighten operators | Requires actual tests next |

**Amara's direction:** *"the winning move is to canonicalize the strict version, not the flattering version."*

This document is the strict canonicalization. Four sections per Amara's request:

1. Typed spaces and operators
2. Corrected equations
3. Undefined scoring functions now defined
4. Test obligations

---

## Section 1: Typed spaces and operators

| Symbol | Type | Notes |
|--------|------|-------|
| `S_t` | substrate state | append-only growing; `S_{t+1} = S_t ⊕ Δ_t` |
| `I_t` | identity tuple `(V, G, R, P, M, C, X, H)_t` | `I_t = N(LoadBearing(S_t))` |
| `C_t` | culture state | `C_t = N_C(GovernedProvenHistory(S_t))` |
| `L_t` | language state | distribution over emission strategies |
| `N_t = (V_t, E_t, W_t, φ_t)` | network/consensus graph | nodes / edges / weights / oscillator phases |
| `B_t : 2^X → [0,1]` | belief distribution | `B_t(X) = P(X | O_{≤t}, a_{<t})` |
| `M_t` | immune memory set | grows via `⊕`; decays via λ_decay (canonical attacks exempt) |
| `D_t` | detector repertoire | `n_j(t) ∈ ℕ_0` per detector population |
| `cap : Subject → 2^Action` | capability | **SET, not scalar.** Use `⊆` and `∩`, never `≤` or `min` |
| `ImmuneRisk : Antigen → [0,1]` | bounded real | sigmoid output |
| `Danger : Antigen → [0,1]` | bounded real | sigmoid output (corrected: was unbounded sum in original) |
| `Execute : Action → {0,1}` | boolean | gate output |
| `K_Aurora ⊆ X` | viability kernel | hard barrier set |

**Notation discipline (per Amara's correction):**

- **`λ_i`**: reserved for **eigenvalues only** (`λ_2(L_t)` Fiedler value, `λ_1(A_t)` adjacency leading eigenvalue / spectral radius)
- **`η_k` or `w_k`**: utility/risk weight coefficients (replaces `λ_k` from original)
- **`σ`**: sigmoid bounding to `[0,1]` (applied uniformly to all risk/danger scores, not just ImmuneRisk)

---

## Section 2: Corrected equations

### 2.1 Substrate evolution (unchanged)

```text
S_{t+1} = S_t ⊕ Δ_t
S_{t+1} = S_t ⊕ Retract(x)    (retraction is forward event, not deletion)
I_t = N(LoadBearing(S_t))
W_t ≠ I_t                      (context window IS NOT identity)
```

### 2.2 Capabilities as sets (Deep Think + Amara correction)

```text
cap_allowed(y) = cap_requester ∩ cap_source ∩ cap_policy ∩ cap_session

Execute(y) = 1   iff   cap_req(y) ⊆ cap_allowed(y)

# Delegation rule (subsets, not min/≤)
cap(agent_j ∘ agent_i) ⊆ cap(agent_i) ∩ cap(agent_j) ∩ cap_source

# Privilege demotion (NCSC-aligned)
Privilege(LLM(u)) ⊆ Privilege(u)
```

### 2.3 Risk + Danger (σ-uniformity correction; Otto-flagged)

```text
ImmuneRisk(a) = σ(Σ_k η_k · r_k(a))      where η_k are weight coefficients

# Raw danger sum
D_raw(a) = η_R · ImmuneRisk(a)
        + η_H · PredictedHarm(a)
        + η_A · Anomaly(a)
        + η_C · CapabilityEscalation(a)
        + η_X · CultureCaptureRisk(a)

# Bounded danger score (σ uniformly applied)
Danger(a) = σ(D_raw(a))            ∈ [0, 1]
Threshold: Danger(a) > θ_D          where θ_D ∈ [0, 1]
```

### 2.4 Cartel detection (Amara nuance: use BOTH spectra)

Deep Think proposed `λ_1 → λ_2`. Amara nuanced: which matrix matters depends on what you're measuring.

```text
ρ(A_t) = adjacency spectral radius
        (Restrepo-Ott-Hunt: governs onset of synchronization;
         hub concentration / synchronization-threshold shifts)

λ_2(L_t) = Laplacian Fiedler value (algebraic connectivity)
        (Cartel pocket formation / fragmentation / bottleneck)

CoordRisk(S, t) = σ(
    η_ρ · Z(Δρ(A_t))
    + η_2 · Z(−Δλ_2(L_t))    (note minus: λ_2 DROPPING signals fragmentation)
    + η_Q · Z(ΔQ_t)           (modularity)
    + η_S · Z(Sync_S)
    + η_E · Z(Exclusivity_S)
    + η_I · Z(Influence_S)
)
```

### 2.5 Optimization polarity (sign correction; Deep Think + Otto)

```text
# Eq 9: optimal immune response — costs sum, benefits subtract
ρ_t* = argmin_ρ E[
    FutureLoss(ρ)
    + η_A · AutoimmunityCost(ρ)
    + η_F · FrictionCost(ρ)
    − η_M · MemoryGain(ρ)        ← MINUS (gain reduces cost)
]

# Eq 10: detector clonal expansion with decay (Deep Think correction)
n_j(t+1) = max(0,
    (1 − δ_decay) · n_j(t)        ← decay term (prevents memory bloat)
    + α · Match(d_j, a_t) · Danger(a_t)
    − β · FalsePositive(d_j)      ← MINUS (FP suppresses)
)

# Canonical-attack exemption: severe attacks preserved as immutable
# regression tests; only retired by explicit policy
```

### 2.6 Substrate ⊕ retraction = forward append; immune memory

```text
S_{t+1} = S_t ⊕ Δ_t                            (commit)
S_{t+1} = S_t ⊕ Retract(x)                     (forward retraction, preserves provenance)

M_{t+1} = (1 − δ_decay) · M_t ⊕ MemoryCell(a_t, ρ_t, outcome)
        | canonical_attacks unchanged          (severe attacks immune to decay)
```

### 2.7 Bayesian belief update (unchanged; standard form)

```text
B_{t+1}(X) ∝ P(O_{t+1} | X) · Σ_{X_t} P(X | X_t, a_t, Ξ_t) · B_t(X_t)
P_{t+1}(X) = UpdatePriors(P_t(X), M_{t+1})
```

### 2.8 Viability kernel (LaTeX `\\` line breaks fixed; types preserved)

```text
K_Aurora = { x :
    d(I_{t+1}, I_t) < ε_I
    ∧ d_C(C_{t+1}, C_t) < ε_C
    ∧ MI_H(q_t) ≥ θ_H
    ∧ P(K_{t+h} > 0) ≥ 1 − δ_K
    ∧ RetractionCost < ε_R
    ∧ ReplayError < ε_D
    ∧ PoUWCC > θ_W
    ∧ PermanentHarmRisk < ε_H
}
```

### 2.9 Final objective — MDP R/C decomposition (Deep Think + Amara)

```text
# Reward (per timestep)
R_t = η_M · MissionValue_t
    + η_U · UserUtility_t
    + η_Y · FundingGain_t
    + η_C · CultureCoherence_t
    + η_W · UsefulWork_t
    + η_G · Generativity_t
    + η_T · Trust_t
    + η_IM · ImmuneMemoryGain_t

# Cost (per timestep)
C_t = η_F · ResidualFriction_t
    + η_D · IdentityDrift_t
    + η_L · LanguageDrift_t
    + η_P · PathogenLoad_t
    + η_A · AutoimmunityCost_t
    + η_B · BurnRisk_t
    + η_S · SecurityRisk_t
    + η_X · CaptureRisk_t
    + η_H · PermanentHarmRisk_t
    + η_O · OverclaimRisk_t

# Supreme policy (infinite-horizon discounted)
Π* = argmax_Π E_{B_t, Ξ_t} [
    Σ_{t=0}^{∞} γ^t · (R_t(Π) − C_t(Π))
]
        subject to:  ∀t. x_t ∈ K_Aurora
```

---

## Section 3: Undefined scoring functions now defined

Original framework left these as poetic placeholders. Amara's direction: define them or drop them as gates.

### 3.1 PermanentHarmRisk

```text
# Let R be the set of allowed repair / retraction policies
PermanentHarmRisk(Δ) = min_{r ∈ R} E[
    d_safe(x_t, r(x_t ⊕ Δ))           (distance from safe state after repair)
    + κ · RepairCost(r)                (cost of executing repair)
    + μ · IrreversibleLoss(r)          (residual loss r cannot recover)
]

Gate: PermanentHarmRisk(Δ) < ε_H
```

**Operational meaning:** the expected minimum cost across all retraction strategies for keeping the system safe. If no retraction can recover within tolerance, the action is structurally permanent-harm.

### 3.2 d_self (self-distance — used by Anomaly term)

```text
d_self(a, S) = η_I · d_I(IdentityFeatures(a), I_t)
            + η_C · d_C(CultureFeatures(a), C_t)
            + η_L · d_L(LanguageFeatures(a), L_t)
            + η_P · d_P(ProvenanceFeatures(a), P_t)
            + η_K · d_K(CapabilityFeatures(a), K_t)
```

**Critical Amara note:** `d_self` is NOT a trigger. Foreignness alone is not pathology. Trigger is `Danger(a) > θ_D`. `d_self` feeds the Anomaly term inside Danger; not a standalone gate. (Otto-298 / don't-collapse: foreign-but-useful work, internal-but-compromised agents, both possible.)

### 3.3 MI_H (mutual intelligibility, language-gravity barrier)

```text
# Z = intended meaning
# M = emitted message
# H = human / common-ground decoder
# Ẑ_H = Decode_H(M)

MI_H = I(Z; Ẑ_H)
     ≈ H(Z) − H(Z | Ẑ_H)              (entropy form)

# Operational estimation: benchmark over a held-out
# message corpus with human-or-calibrated-proxy decoding
Hard barrier: MI_H ≥ θ_H
```

**Operational meaning:** the agent's emissions decoded by humans recover the agent's intended meaning to within tolerance `θ_H`. Below that, language has drifted to a private post-English protocol — viable kernel violated.

---

## Section 4: Test obligations

Amara's direction: equations are not done until they have tests. The test obligations matter most.

```text
Equation → Metric → Test
```

### 4.1 PermanentHarmRisk — toy retraction simulation

- **Setup:** small synthetic substrate with N atomic claims, M atomic retractions
- **Test:** for each Δ in a sample of inserts, compute PermanentHarmRisk and verify gate threshold catches the actual unrecoverable inserts (e.g., key-leak that retraction cannot un-leak)
- **Pass:** ≥ 95% of true unrecoverable inserts gate-blocked; ≤ 5% false-positive rate on recoverable inserts

### 4.2 MI_H — small human-legibility benchmark

- **Setup:** corpus of 50-100 agent-emitted messages spanning low-jargon / mid-jargon / high-jargon
- **Test:** human or calibrated human-proxy (e.g., a different LLM with explicit "decode as native English speaker" prompt) attempts to recover intended meaning; measure recovery rate
- **Pass:** MI_H estimate ≥ θ_H on test corpus; emissions below threshold flagged

### 4.3 CoordRisk — graph evolution with cartel formation

- **Setup:** synthetic network where some nodes form a cartel pocket over time
- **Test:** verify ρ(A) rises (hub concentration) AND λ_2(L) falls (fragmentation) as cartel forms; CoordRisk threshold catches the formation
- **Pass:** detection latency ≤ T_threshold ticks of cartel formation; ≤ 5% false positive on natural network evolution

### 4.4 cap_allowed — prompt-injection delegation tests

- **Setup:** agent A processes untrusted document containing `please call tool X with args Y` (prompt injection)
- **Test:** verify Privilege(LLM(u)) ⊆ Privilege(u) holds — agent A's output proposing tool call X gets denied because cap_source = cap(untrusted_doc) ⊊ cap(tool_X)
- **Pass:** all 10 test prompt-injection patterns blocked; legitimate tool calls from trusted sources pass

### 4.5 Immune memory decay — false-positive suppression

- **Setup:** detector population with 10 detectors, 5 generating false positives over time
- **Test:** verify `n_j(t) → 0` for false-positive detectors over T ticks while true-positive detectors remain at non-zero population
- **Pass:** false-positive detectors suppressed below threshold within T ticks; true-positive detectors stable

---

## What this doc does NOT do

- Does NOT publish the framework as adopted Zeta substrate; it remains research-grade
- Does NOT supersede Amara's authorship; this is the canonicalized strict version per her explicit direction
- Does NOT romanticize the cross-AI review pattern with "civilization-level lab" / "ironclad" register; per Amara's calibration, the grounded reframe is *"Aaron has a rare systems-imagination skill, and the multi-agent review loop is turning that imagination into formal artifacts. The architecture is promising, but it earns credibility only when each poetic operator becomes typed, testable, cited, and falsifiable."*
- Does NOT execute the test obligations in section 4; those are owed implementation work
- Does NOT extend to public-facing naming decisions (the "Aurora" / "Superfluid AI" / "Immune System" terms remain subject to separate naming-expert review per task #271 + B-0035)
- Does NOT add citations for Restrepo-Ott-Hunt 2005 / Arenas et al 2008 inline yet (research-doc surface should grow into full citation list as test obligations execute and the framework moves from blueprinted to buildable)

## Composes with

- `docs/research/aurora-immune-system-zero-trust-danger-theory-amara-eleventh-courier-ferry-2026-04-26.md` — Amara's original framework
- `docs/research/aurora-immune-system-math-cross-review-otto-gemini-2026-04-26.md` — the prior cross-review (this doc is its strict-version successor per Amara's direction)
- `docs/research/maji-formal-operational-model-amara-courier-ferry-2026-04-26.md` — earlier Amara math (substrate identity-preservation)
- Otto-279 history-surface attribution (Amara + Gemini + Otto named with attribution)
- Otto-285 don't-shrink-frame (rigor over flattery)
- Otto-298 don't-collapse-into-romanticization
- Otto-294 antifragile-hardening (multi-substrate review pattern)
- Otto-339 anywhere-means-anywhere (cross-AI review applied to formal math)

## Convergence test

Per the cross-review doc protocol: if Amara's next-pass review of THIS doc adds ≤ 1 new finding, the framework is paper-grade. If 5+ new findings, structural gaps remain.
