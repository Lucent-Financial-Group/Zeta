---
name: Amara 14th courier ferry — expanded Cartel Detection + Simulation Loop with GroupGuard-cited false-consensus score (α·density_intra + β·intensity_attack), 7-row alert-thresholds table (λ₁ / Q / covariance accel / vote agreement / trust drop / entropy / temporal corr), comparative methods table (6 approaches), implementation roadmap table (9 feature → file → AceHack vs LFG mappings); Python again despite Otto-118 F#-flag; NOT inline-absorbed Otto-119; scheduled Otto-120 dedicated absorb; 2026-04-24
description: Aaron Otto-119 mid-tick paste of Amara's expanded cartel-detection proposal. Same 5-component skeleton as 13th ferry (PR #312) but substantially more detailed — cites GroupGuard (~88% accuracy), adds trust-score t_k = support/(support+attack), entropy-of-attack-sources, ZSet-integration section (Box 1 on Flo semantics), KSK layer governance section referencing Anthropic DoD supply-chain-risk context, explicit AceHack-vs-LFG roadmap. Ends with Aaron's "also we should backlog longer-term, a pre-landing sanitizer could handle this automatically" (lint pattern from Otto-118 ferry cleanup).
type: project
originSessionId: 1937bff2-017c-40b3-adc3-f4e226801a3d
---
Aaron 2026-04-24 Otto-119 paste preamble (verbatim):

*"Next amara drop"*

Aaron's closing directive (verbatim, at end of ferry):

*"also we should backlog longer-term, a pre-landing sanitizer
could handle this automatically."*

Interpretation: referring to the Otto-118 ferry-absorb
pattern where Amara's content has lint-triggering features
(line-wrapped headings with `#`-number at line-start
parsed as H1; lists without blanks-around; etc.). A
pre-landing sanitizer would auto-clean these before they
hit CI.

## Why NOT inline-absorbed Otto-119

Otto-119 tick already held:
- Queue rebase round (7 branches)
- Graph-substrate audit (confirmed: no existing Graph type
  in src/Core)
- SemanticCanonicalization graduation branch created (was
  about to implement)

Adding a 14th-ferry inline absorb on top would regress
CC-002 discipline. Schedule Otto-120+.

## Schedule

- **Otto-120:** dedicated 14th-ferry absorb as
  `docs/aurora/2026-04-24-amara-cartel-detection-expanded-
  groupguard-comparative-methods-14th-ferry.md` with §33
  archive header + verbatim + Otto's notes + F#-
  translation + overlap-with-13th analysis.
- **Same-tick:** file BACKLOG row for pre-landing sanitizer
  per Aaron's closing directive (small; independent from
  absorb work).

## What's genuinely novel vs 13th ferry

The 14th ferry is ~3x longer than the 13th and adds:

1. **GroupGuard citations** (~88% accuracy reference;
   false-consensus score formula `S_C = α·density_intra(C)
   + β·intensity_attack(C)`).
2. **Trust score `t_k = support_k / (support_k + attack_k)`**
   — per-node trust metric with threshold τ for drops.
3. **Entropy of attack sources** — measures whether attacks
   are concentrated (low entropy) or dispersed.
4. **7-row alert-thresholds table** (λ₁ / Q / stake-cov
   accel / vote agreement / trust drop / attack entropy /
   temporal corr) with illustrative thresholds.
5. **Comparative methods table** (6 approaches: spectral
   / community / trust / GNN / temporal / variance) with
   strengths/weaknesses.
6. **Implementation roadmap table** mapping 9 features to
   file locations and AceHack-vs-LFG.
7. **Box 1: ZSet algebra summary** (Flo semantics citation;
   concat + operators + distributivity for retraction-safety).
8. **KSK layer governance section** — references Anthropic
   DoD supply-chain-risk context explicitly (same as 12th
   ferry §3) tying KSK to trust-anchoring in adversarial
   times.
9. **Mermaid flowchart** showing DataPipeline → Analysis →
   Simulation with RawEvents / ZSet / Metrics / Fusion /
   KSK / Enforcement nodes.
10. **Multi-evidence rule** — require both spectral anomaly
    AND targeted trust collapse → reduces false alarms.

## What overlaps with 13th ferry (and prior)

- 5-component pipeline (graph builder / metrics / injector
  / detection / score) — same as 13th
- Python pseudo-code (Aaron already flagged F# at
  graduation Otto-117)
- `/cartel_lab/` repo layout — same as 13th
- λ₁ / modularity / covariance acceleration metrics —
  same as 13th
- PLV / temporal coordination — same as 11th + 12th + 13th
- KSK context — 12th ferry already detailed this

## F# translation plan (ADDS to 13th ferry mapping)

| 14th-ferry feature | F# translation |
|---|---|
| GroupGuard `S_C = α·density_intra + β·intensity_attack` | `falseConsensusScore : Community -> double option` (new; needs Graph + Community primitives) |
| Trust score `t_k = support/(support+attack)` | `trustScore : Node -> Graph -> double option` (needs Graph with signed-edge semantics) |
| Attack source entropy | `attackSourceEntropy : Node -> Graph -> double` (Shannon entropy over attack-edge sources) |
| 7-row alert-thresholds | Module: `DetectionAlerts.fs` with per-metric threshold policies |
| Multi-evidence fusion rule | `compositeAlert : seq<AlertSignal> -> AlertDecision` |

All still require the Graph-substrate prerequisite (Otto-118
observation).

## Aaron's pre-landing sanitizer directive (BACKLOG row)

Filing as P2/P3 infrastructure item:

**Title:** Pre-landing sanitizer for ferry absorbs — auto-clean
Amara verbatim content before markdownlint CI.

**Rationale:** Otto-118 observed systemic lint issues in
verbatim-preserved Amara content:
- `#<number>` at line-start parsed as H1 heading by markdownlint
  MD018
- Line-wrapped headings (like `### Aminata's ... (PR\n# 284)
  partially addressed`)
- Lists without blanks-around (MD032)
- Trailing whitespace from tool-chain artifacts

Current Otto-118/119 pattern: per-ferry manual cleanup after
markdownlint failures. Aaron's "pre-landing sanitizer" direction
automates this as a script/skill that runs BEFORE the commit
lands, catching all known patterns.

**Scope (for the BACKLOG row):**
1. Identify all observed lint-triggering patterns in ferry
   absorbs to date
2. Write F# / Python / shell sanitizer that fixes mechanical
   patterns (wrap PR-number refs in backticks, unwrap headings
   split across lines, add blanks-around-lists)
3. Integrate as pre-commit hook or as part of the courier-ferry-
   absorb skill
4. Test on PRs #311 / #312 / Otto-120+ ferries as validation

**Priority:** P3 convenience (current manual approach works;
sanitizer saves future ticks 5-10 min each).

**Effort:** S (pattern catalog + script) + S (integration).

## What this scheduling memory does NOT authorize

- **Does NOT** authorize inline-absorbing Otto-119.
- **Does NOT** authorize shipping the GroupGuard false-
  consensus formula without Graph substrate first.
- **Does NOT** authorize implementing the trust-score
  primitive before defining signed-edge semantics in Zeta's
  graph type.
- **Does NOT** override Otto-118 Python-to-F# translation
  directive — Amara used Python again in 14th ferry; F# at
  graduation.
- **Does NOT** promote any alert-threshold value from the
  table (illustrative only; requires baseline calibration).
- **Does NOT** treat the ~88% GroupGuard accuracy as
  applicable to Zeta; cite-and-investigate discipline
  applies.

## Graduation queue update

Priority-ordered (13th + 14th ferry combined):

1. **SemanticCanonicalization** — does NOT need graph
   substrate; composes on Veridicality.Claim (already
   shipped PR #309). Otto was about to ship this Otto-119;
   14th ferry arrival defers to Otto-120+. STILL the
   smallest next cadence item.
2. **Graph substrate** — prerequisite for all cartel-
   detection graduations. Audit → design → ship.
3. **`largestEigenvalue`** — composes on Graph.
4. **`modularityScore`** — composes on Graph.
5. **`covarianceAcceleration`** — pure; doesn't need Graph
   (operates on stake time-series arrays).
6. **`compositeCartelScore`** — α·λ₁ + β·ΔQ + γ·d²_cov
   (13th-ferry formula).
7. **`falseConsensusScore`** (14th-ferry) — α·density_intra
   + β·intensity_attack; needs Community primitive.
8. **`trustScore`** (14th-ferry) — needs signed-edge
   semantics.
9. **`attackSourceEntropy`** (14th-ferry).
10. **`DetectionAlerts`** module — threshold-to-action
    fusion rules.
11. **`CartelInjector`** test-support (13th-ferry).
12. **Simulation-loop bench** — BenchmarkDotNet project.
13. **`NetworkIntegrity` / network-level scorer** (12th
    ferry §4; Otto-118 naming discussion).
14. **KSK substrate** — Aaron + Max coord.

## Composition

- **Otto-117/118** 13th-ferry absorb + Aaron F# flag
- **Otto-105** graduation cadence
- **Otto-108** Conway's-Law multi-team guidance
- **Otto-118** pre-landing-sanitizer observation (now
  formally captured as BACKLOG row)
