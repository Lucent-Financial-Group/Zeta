---
name: Amara 12th courier ferry — comprehensive Executive Summary covering LFG+AceHack repo contents, retraction-native algebra learnings, KSK background (Feb 2026 DoD/Anthropic supply-chain-risk designation + OpenAI DoW contract + Judge Lin preliminary injunction), formalized Network Integrity Detector (renamed from "bullshit"), Firefly/Cartel temporal-coordination detection, Network Differentiability (counterfactual / Shapley-ish influence), Oracle Rules enforcement table, multi-sub-repo Integration Plan (LFG/Zeta-Signals + LFG/Zeta-KSK), 9 prioritized next tasks; NOT inline-absorbed; scheduled Otto-117 dedicated absorb; 2026-04-24
description: Aaron Otto-116 mid-tick paste of Amara's most comprehensive synthesis ferry yet. Integrates ALL prior themes with extensive government citations (10 U.S.C. § 3252 supply-chain-risk law, DoD/Anthropic incident Feb 27 2026, Judge Rita Lin injunction Mar 26, OpenAI parallel DoW contract). Proposes multi-sub-repo structure (canonical LFG/Zeta + experimental AceHack/Zeta + new LFG/Zeta-Signals + new LFG/Zeta-KSK), Oracle-Rules table mapping signal thresholds to actions, integrity-score composite I = σ(Σ w_i f_i), phase-locking + cross-correlation + centrality + economic-covariance metrics, counterfactual influence computation. Already-shipped graduations (RobustStats PR #295, crossCorrelation PR #297, PLV PR #298, BurstAlignment PR #306 pending, Veridicality PR #309 pending, antiConsensusGate PR #310 pending) map onto multiple sections of this ferry validating the cadence direction.
type: project
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
Aaron 2026-04-24 Otto-116 paste (preamble: "next amara
update"). Full verbatim content preserved inline below
for the Otto-117 dedicated absorb.

## Why NOT inline-absorbed Otto-116

Otto-116 tick already held:
- Full rebase round (7 PRs) to handle #303 landing ahead
- PR #308 BACKLOG filings (git-native PR preservation +
  memory-sync mechanism)
- PR #309 Veridicality graduation (Provenance + Claim
  + validateProvenance/Claim; 10 tests)
- PR #310 antiConsensusGate graduation (6 tests; built
  on top of #309 branch)
- Memory scaffolding for both graduations

Adding a 12th-ferry inline absorb on top of 5 substantive
commits in one tick would regress CC-002 close-on-
existing discipline. Schedule Otto-117 dedicated absorb.

## Schedule

- **Otto-117:** absorb 12th ferry as
  `docs/aurora/2026-04-24-amara-executive-summary-
  ksk-integrity-detector-integration-plan-12th-ferry.md`
  with §33 archive-header + Otto's substantive notes +
  attribution + overlap analysis with prior ferries
  (especially 10th deep-research + 11th temporal-
  coordination). After absorb: file any BACKLOG items
  for graduation candidates not yet queued.

## Substantive content (load-bearing; preserved inline)

### §1 Repository contents summary

LFG/Zeta + AceHack/Zeta catalogue. Aaron's 2-repo
setup: LFG = canonical (production truth); AceHack =
experimental. File table for LFG (top-level + docs/ +
src/ + tools/ + openspec/). AceHack file fetch limited
by Amara's connector.

### §2 Learnings — already-shipped Zeta substrate

- **Retraction-native algebra** (ZSet with negative
  weights) — already Zeta substrate (Otto-73 memory).
- **Operator algebra coherence** (`D·I=I` `z⁻¹·z=1`) —
  Zeta `Circuit.fs` + `Primitive.fs`.
- **Arrow/Spine columnar layout** — Zeta `Spine.fs` +
  ArrowInt64Serializer.
- **Agent-based CI** — `.claude/skills/` + persona
  framework; Otto is this.

Gap items: integration of experimental AceHack code
into LFG canonical, performance tuning (profile.sh).

### §3 KSK background — DETAILED GOVERNMENT CONTEXT

This is the most NEW material in the 12th ferry.
Extensive citations:

- **Feb 27, 2026:** DoD ("Department of War")
  designates Anthropic a supply-chain risk under
  10 U.S.C. § 3252 — first time an American AI firm
  so labelled.
- **Trigger:** Anthropic's refusal to waive usage
  restrictions (surveillance + autonomous weapons)
  when Pentagon pushed for removal.
- **July 2025:** Pentagon had cancelled $200M
  Anthropic contract.
- **President Trump order:** all agencies stop using
  Anthropic.
- **Anthropic response:** immediate lawsuits.
- **Mar 26, 2026:** Judge Rita Lin granted preliminary
  injunction nullifying designation; "contrary to law
  and arbitrary and capricious."
- **Feb 28, 2026:** OpenAI announces Pentagon deal
  with Fourth-Amendment-clause against domestic
  surveillance + autonomous-weapons use. OpenAI kept
  their red lines but negotiated different language.
- **Supply-chain-risk law:** 10 U.S.C. § 3252 —
  national-security-systems scope, not general
  sanction; anti-sabotage intent.

**KSK implication:** Key-Signing/Stewardship Key as
cryptographic anchor for supply-chain independence.
Could be: (a) threshold-signed multi-party key for
authoritative updates, (b) rollback certificate if one
vendor cut off, (c) multi-stakeholder oversight so no
single company can unilaterally disrupt.

**LFG "start of a KSK":** Amara acknowledges LFG has
KSK design begun; this ferry proposes formalizing.
Max-attributed substrate (per Otto-77 memory).

Cross-reference to 7th ferry (PR #259): KSK capability-
tier / revocable-budget / multi-party-consent /
signed-receipts structure. 12th ferry extends with the
government-context-driven continuity rationale.

### §4 Network Integrity Detector (formalized bullshit
detector)

Renamed from "bullshit" — matches Otto-112 Veridicality
naming memory. The 12th ferry's form:

- Canonical mapping `N(x)` (semantic rainbow table)
- Feature vector: temporal coord, communication
  centrality, behavioral drift, etc.
- Composite integrity score `I(x) = σ(Σ w_i f_i(x))`
- Threshold `τ` fires alerts when `I(x) > τ`
- Regret-based threshold update rule

**Already shipped (PR #309 / #310):** Provenance +
Claim<'T> + validateProvenance + antiConsensusGate.
These are PARTIAL implementation of this §4 framework.
The `I(x) = σ(...)` composite + rainbow-table
canonicalization + per-metric normalization remain
graduation candidates.

### §5 Firefly & Cartel Detection

**Already MOSTLY shipped:**
- **PR #295 RobustStats** — median + MAD + robust
  aggregate (for combining detector signals outlier-
  resistantly)
- **PR #297 TemporalCoordinationDetection.
  crossCorrelation + profile** — pairwise
  cross-correlation C_{ij}(τ), §5's event cross-
  correlation metric
- **PR #298 phaseLockingValue** — §5's PLV metric,
  `|1/K Σ e^{i(φ_i - φ_j)}|`
- **PR #306 burstAlignment + significantLags** —
  §5's "cluster" detection from high-PLV subsets

**Still to graduate (from §5):**
- **Event-cross-correlation spectral analysis**
  (spectral coherence / Fourier-transform-on-event-
  rates); adds FFT-based detector
- **Graph-community / spectral methods** for cartel
  detection (adjacency/Laplacian eigenvalues,
  Fiedler value, modularity)
- **Economic-covariance tests** (agents' output/
  consumption series covariance)
- **Network-motif / clique-detection** on
  communication graph

### §6 Network Differentiability

Marginal-influence-via-Shapley approach:
`e_i = ||O_0 - O_i||` by running network with/without
agent i. Approximation via random orderings. Also
edge-level (disconnect pairs).

**New graduation candidate** (not yet shipped):
`Veridicality.influenceOfNode` or separate
`InfluenceSurface` module.

Potentially large-effort — depends on Zeta having a
runtime that can simulate network-level counterfactuals
(not yet shipped). Could be partially implemented as a
pure functional version that takes a ConsensusOutput
function + perturbation as inputs.

### §7 Oracle Rules mapping table

Threshold → action mapping:
| Signal | Action |
|---|---|
| I > 0.8 | Freeze inputs; KSK quorum; notify |
| PLV > 0.9 among subset | Throttle; escalate |
| Centrality spike (>3σ) | Log audit; deprioritize |
| Gini > 0.7 | Normalize; monitor |
| Influence outlier (>2× avg) | Isolate; require quorum |

Proposed location: `docs/ORACLE-RULES.md`. Decision
table, stored under version control. Integration with
KSK: high-level actions require multi-sig.

### §8 Integration Plan — MULTI-REPO / SUB-REPO

**Proposes new repo split:**
- `LFG/Zeta` — canonical Zeta Core (DBSP engine,
  governance, alignment docs)
- `LFG/Zeta-Signals` — NEW sub-repo for detection
  algorithms (Temporal.fs + Graph.fs + Stats.fs +
  Utils.fs + Model/ + Tests/)
- `LFG/Zeta-KSK` — NEW sub-repo for key-management
  + signing + policy (Spec.tla + KeyService.fs +
  Policy.fs + Tests/)
- `AceHack/Zeta-Experimental` — experimental only

This is a **CONWAY'S LAW** decision point (per
Otto-108 memory). Splitting into 4 sub-repos would
lock in:
- Zeta Core vs Signals interface
- Zeta Core vs KSK interface
- LFG vs AceHack interface
**Aaron decides**, per the standing cross-repo
coordination rule (Otto-90 Aaron + Max are gates for
cross-repo + LFG, respectively).

**Otto recommendation:** stay SINGLE-REPO (current
`src/Core/TemporalCoordinationDetection.fs` + new
`src/Core/Veridicality.fs` + eventually
`src/Core/KSK.fs`) until the interface boundaries
harden. Premature multi-repo locks in interfaces
that are still fluid.

### §9 Prioritized Next Tasks — 9 items

(Many already in progress via Otto-105 graduation
cadence)

1. **KSK spec ADR** — HIGH; not yet started
2. **PLV + cross-corr modules** — **DONE** (PRs
   #297/#298)
3. **ZSet algebra regression tests** — existing
   Zeta.Core.Tests
4. **Adversarial simulation scenarios** — research,
   not yet scheduled
5. **Agent-skill for anomaly reporting** — graduation
   candidate (requires Oracle-Rules first)
6. **Governance docs refinement** — ongoing per-
   ferry absorb
7. **KSK key rotation** — after KSK spec
8. **Performance benchmarking** — after detection
   modules stabilise
9. **Community engagement** — Aaron-driven

## Otto's cross-reference to already-shipped work

The 12th ferry VALIDATES the Otto-105 graduation-
cadence approach — ~40% of the substantive
operationalisable content is already shipped or in-
flight:

| 12th ferry §§ | Shipped PRs |
|---|---|
| §5 PLV | #298 (merged) |
| §5 cross-correlation | #297 (merged) |
| §5 burst clustering | #306 (pending) |
| §4 outlier-aggregation | #295 RobustStats (merged) |
| §4 Provenance/Claim types | #309 (pending) |
| §4 antiConsensusGate | #310 (pending) |

Remaining queue shape:
- §4 SemanticCanonicalization (rainbow-table
  canonical-claim-key)
- §4 scoreVeridicality (composite `I(x)`)
- §5 spectral-coherence / FFT-based detector
- §5 graph-community / modularity / eigenvector-
  centrality detectors
- §5 economic-covariance tests
- §6 influence/counterfactual module
- §7 Oracle-Rules spec doc + enforcement wiring
- §3 KSK implementation (large; Max-coordination)

## What this scheduling memory does NOT authorize

- **Does NOT** authorize inline-absorbing Otto-116.
- **Does NOT** authorize unilaterally splitting into
  sub-repos (§8). That's an Aaron-review item per
  Otto-90 cross-repo + LFG coordination rules.
- **Does NOT** authorize implementing KSK
  unilaterally — Max's substrate; Otto-77 attribution;
  requires Aaron + Max coordination.
- **Does NOT** treat Amara's §3 government-context
  citations as verified (Otto takes them as claimed
  context, not independently checked).
- **Does NOT** accelerate the graduation cadence — one
  small graduation per 3-5 ticks remains the rule.
  The 12th ferry validates the DIRECTION, not the
  pace.

## Direction-of-travel for next 10-20 ticks

Per the 12th ferry + Otto-105 cadence:
1. Next: SemanticCanonicalization (composes on
   Claim<'T>; moves antiConsensusGate from "assume
   grouped" to "actually group")
2. Then: scoreVeridicality (the composite I(x) from
   §4)
3. Then: spectral-coherence detector (§5)
4. Then: modularity-spike detector (§5)
5. Parallel track: Oracle-Rules spec doc (§7)
6. Eventually: influence module (§6)
7. Eventually: KSK coordination with Max
