# Contextual-Grid v1 Reflect-X Control Contract

**Status:** frozen carrier and execution contract; **not executed**. This is a
separate finite control for representation and action-order sensitivity, not a
generalization or transfer result.

## 1. Question and Decision Rule

The measured v1 result is limited to one declared grid. This control asks a
narrower, falsifiable question: when the grid's x coordinates are reflected
while its action names and canonical action order remain unchanged, does the
declared `count-first/v1` policy have lower mean held-out suboptimality than the
same fixed comparators under a fresh, complete seed roster?

The candidate meets this control's narrow criterion only when its paired mean
suboptimality delta is strictly negative against `uniform-random/v1` and
`q-epsilon/v1`, and nonpositive against `q-ucb/v1`. The comparison is
**within this carrier only**. There is no pooled v1-plus-reflection score, no
claim that equal performance is required under reflection, and no claim that a
positive result is transfer learning.

## 2. Exact Carrier Identities

The transition is the x-axis reflection `R(x,y) = (4 − x,y)` of the v1
coordinate locations. The physical action meaning is not remapped: `east`
still increments x, `west` still decrements x, and the canonical action order
remains `north`, `east`, `south`, `west`. Therefore action-order sensitivity is
observable rather than cancelled by a hidden label rewrite.

| Carrier             | Repository path                                                                       | Exact raw UTF-8 SHA-256                                            | Bytes |
| ------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----: |
| Environment         | `docs/research/data/2026-09-06-contextual-grid-v1-reflect-x-manifest.json`            | `7477bb597b44805212e7202751ad4988dcae81e4c22e418f7f892cb1c35a1d5a` |   214 |
| Evaluator catalogue | `docs/research/data/2026-09-06-contextual-grid-v1-reflect-x-evaluator-catalogue.json` | `1872f54a6fce5f54e3a52456c443012e01c71a8cce33515ef28fb07465da39d7` |   260 |

The environment identity is `zeta.contextual-grid/v1-reflect-x`, and the
catalogue identity is `zeta.contextual-grid/evaluators/v1-reflect-x`. The
catalogue binds the exact environment SHA-256 above. Raw-byte identity, not
parsed JSON equivalence, controls admission.

| Field                          | Frozen reflected value                                    |
| ------------------------------ | --------------------------------------------------------- |
| Goal                           | `(0,0)`                                                   |
| Training start                 | `(4,0)`                                                   |
| Held-out evaluation start      | `(4,4)`                                                   |
| Actions in canonical order     | `north`, `east`, `south`, `west`                          |
| Boundary transition            | Attempted out-of-bounds move remains at the same position |
| Terminal/nonterminal reward    | `+2,000,000 ppm` / `−40,000 ppm`                          |
| Training episodes / action cap | `1,000` / `250`                                           |
| Seed roster                    | Each unsigned seed `100…199`, exactly once per policy     |

The policy definitions, Q initialization, count initialization, SplitMix64
stream update, Q update order, evaluation freeze, and 10,000-replicate
bootstrap method are unchanged from the merged v1 result-receipt contract. The
new roster prevents this control from retroactively selecting the original
v1 seed rows after their outcome is known. [1]

## 3. Implementation Requirements

The current v1 runner safely verifies raw files but contains v1 coordinate and
reward literals. The reflection control must not be added as another set of
literals. A focused refactor shall introduce an explicit verified carrier model
used by transitions, training start, held-out start, goal testing, the
dynamic-programming denominator, trace receipts, and result emission.

The refactor may not change the v1 carrier bytes, evaluator bytes, policy
definitions, v1 seed roster, or the already committed v1 result receipt. Both
the F# implementation and separately authored Python oracle must replay the
existing v1 receipt bit-for-bit before either emits a reflected receipt.

## 4. Required Controls

| Fault                                                           | Required observed failure                                                                               |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Reflected fingerprint with v1 catalogue fingerprint             | Refuse before action one.                                                                               |
| V1 fingerprint with reflected catalogue fingerprint             | Refuse before action one.                                                                               |
| Reflected fingerprint that still uses v1 start/goal coordinates | Carrier-model invariant or independent oracle disagreement.                                             |
| Accidental east/west action remap                               | Known reflected trace or digest diverges from the unchanged-action oracle.                              |
| One raw-byte carrier mutation                                   | SHA-256 admission refusal before action one.                                                            |
| Missing or reordered seed row from `100…199`                    | Result receipt is incomplete/refused.                                                                   |
| V1 regression                                                   | Existing v1 raw receipt and F#/Python replay remain byte-identical.                                     |
| Cross-language divergence                                       | F# and Python reflected receipts differ bytewise and remain a retained mismatch, not a rounded success. |

## 5. Boundaries

This control measures neither generic spatial reasoning nor geometric transfer.
It does not test MiniGrid, EDE, lexical/geometric calibration, TangleNavigator,
non-Gaussian inference, a learned evaluator catalogue, multi-agent cooperation,
society consensus, energy, latency, or parameter efficiency. Canonical evidence
state remains separate from deterministic result queries.

The Jiang–Kolter–Raileanu paper remains a methodological reference only; its
published held-out-coordinate conflict means neither v1 nor this reflected
control is a reproduction. [2]

## References

[1] [Contextual-Grid v1 result-receipt contract](2026-09-05-contextual-grid-v1-result-receipt-contract.md)

[2] [Jiang, Kolter, and Raileanu, _On the Importance of Exploration for Generalization in Reinforcement Learning_ (NeurIPS 2023)](https://proceedings.neurips.cc/paper_files/paper/2023/file/2a4310c4fd24bd336aa2f64f93cb5d39-Paper-Conference.pdf)
