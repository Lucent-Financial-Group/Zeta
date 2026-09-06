# Contextual-Grid: Next Carrier Selection Record

**Status:** proposed follow-up selection; **not implemented, not executed, and
not a benchmark result**.

## Key Recommendation

> Build `zeta.contextual-grid/v1-reflect-x` as the **next finite control**. It
> must be a new, SHA-256-bound carrier with a new evaluator-catalogue binding,
> fresh seed roster, independently authored F# and Python implementations, and
> all of the current receipt fault controls. It is a test for sensitivity to a
> declared coordinate/action representation—not a claim of geometric transfer.

The measured v1 result is a single-carrier observation. The nearest falsifiable
follow-up is not an unbounded benchmark expansion or a new global reward; it is
a deliberately transformed carrier that can expose a dependence on the v1
coordinate layout or canonical action ordering. The later external comparison
candidate is MiniGrid, but it is intentionally deferred until its upstream
version, configuration, action interface, serialization, and cross-language
oracle boundary are separately frozen. [1] [2]

| Track        | Decision                               | Reason                                                                                                                                                                                       |
| ------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Immediate    | Proposed `v1-reflect-x` finite control | Isolates an observable representation/action-order sensitivity after the one-carrier v1 result.                                                                                              |
| Later        | Candidate external MiniGrid carrier    | Maintained discrete grid-world suite with seedable Gymnasium reset and configurable environments, but currently no pinned source/manifest or independent F# oracle. [1] [2]                  |
| Rejected now | EDE/Procgen/Crafter reproduction       | The supplied EDE work does not provide its tabular carrier in the published repository; deep-environment reproduction would exceed the current independent-replay evidence boundary. [3] [4] |

## 1. Proposed Reflected Carrier

The proposed coordinate transformation is the x-axis reflection
`R(x, y) = (4 − x, y)` of the existing 5 × 5 carrier. It produces the following
declared configuration:

| Field                     | v1                                                   | Proposed `v1-reflect-x`                                       |
| ------------------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| Goal                      | `(4, 0)`                                             | `(0, 0)`                                                      |
| Training start            | `(0, 0)`                                             | `(4, 0)`                                                      |
| Held-out start            | `(0, 4)`                                             | `(4, 4)`                                                      |
| Boundary rule             | Stay in place on attempted exit                      | Same                                                          |
| Reward table              | `+2,000,000 ppm` terminal; `−40,000 ppm` nonterminal | Same                                                          |
| Action names/order        | `north`, `east`, `south`, `west`                     | **Unchanged**                                                 |
| Candidate and comparators | Four v1 policy definitions                           | Same policy definitions, new environment/catalogue identities |

The action names and canonical order are intentionally **not mirrored**. In
particular, `east` remains an increase in x and `west` remains a decrease in x.
This makes the control capable of detecting an implementation whose apparent
benefit depends on the original coordinate/action presentation. It also means
that equal trajectories, equal table digests, or equal performance with v1 are
_not_ required and must not be claimed as a symmetry theorem.

## 2. Pre-Implementation Contract Requirements

The current runner is safely hard-admitted only for the v1 literal carrier. The
new carrier may therefore not be inserted by editing constants or reusing the
v1 catalogue fingerprint. Before execution, one focused implementation change
must introduce a data model that takes all environment values from verified
canonical bytes.

| Required item                       | Required failure behavior                                                                                                                              |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Separate canonical environment JSON | Any raw-byte change produces a different SHA-256 identity and is refused under the old ID.                                                             |
| Separate evaluator-catalogue JSON   | A v1 catalogue bound to the reflected environment, or conversely, is refused before action one.                                                        |
| Explicit runner carrier model       | V1 receipt replay remains byte-identical; a runner cannot silently use v1 hard-coded coordinates for the reflected fingerprint.                        |
| Independent Python carrier model    | Shares only canonical JSON/schema and published result bytes; it must not import the F# carrier implementation.                                        |
| Fresh roster                        | Use predeclared unsigned seeds `100…199`, one fresh state/Q/count table per policy and seed; do not select a roster after seeing reflected outcomes.   |
| Fixed decision rule                 | Apply the same within-carrier comparator rule as v1, but report the reflected result separately; no pooled score across carriers.                      |
| New mutations                       | Detect reflected fingerprint paired with v1 coordinates, reflected coordinates paired with the v1 catalogue, and an accidental east/west action remap. |

The reflected control is eligible to report only a **within-reflected-carrier**
policy comparison. A positive result would still not establish domain transfer;
a failure would not falsify the v1 receipt. Its point is to make the
representation/action-order dependence observable rather than implicit.

## 3. External Benchmark Deferral: MiniGrid

MiniGrid describes a collection of lightweight, configurable, discrete 2D
grid-world environments exposed through Gymnasium. Its official documentation
shows an environment reset with a seed and a discrete-action interaction loop.
The repository also describes tunable environment configurations and a standard
Gymnasium API. [1] [2]

Those properties make an external comparison feasible in principle. They do not
make it admissible today. The selection record defers MiniGrid until all of the
following are separately frozen:

1. an immutable upstream source revision and package artifact identity;
2. the exact registered environment, wrapper stack, observation encoding, action
   map, reset/episode seed protocol, and termination/truncation rule;
3. a content-addressed serialized transition/reward carrier that can be replayed
   outside the upstream library;
4. a Python reference execution and a separately authored F# verifier for the
   finite carrier; and
5. a comparison protocol that never treats MiniGrid mission strings or BabyAI
   language as evidence of lexical grounding or language understanding.

The MiniGrid documentation notes that some environments return mission strings
and that BabyAI-derived environments include synthetic instructions. Those
features stay out of this follow-up: no user lexical-geometric calibration,
English benchmark, or cortical/geospatial inference is admitted by importing
the environment. [1] [2]

## 4. Retained Boundaries

This selection does not add a curiosity reward, learned evaluator selection,
soft fingerprint matching, `TangleNavigator` steering, non-Gaussian inference,
multi-agent interaction, society-level consensus, an energy result, or a model
parameter comparison. Canonical evidence state remains separate from result
queries, and no receipt becomes a CRDT merge rule.

The source Jiang–Kolter–Raileanu tabular discussion remains a methodological
anchor only. The documented conflict between its main-text and appendix
held-out coordinates prevents calling v1 or the reflected control a paper
reproduction. [3]

## References

[1] [MiniGrid documentation](https://minigrid.farama.org/)

[2] [Farama Foundation MiniGrid repository](https://github.com/Farama-Foundation/Minigrid)

[3] [Jiang, Kolter, and Raileanu, _On the Importance of Exploration for Generalization in Reinforcement Learning_ (NeurIPS 2023)](https://proceedings.neurips.cc/paper_files/paper/2023/file/2a4310c4fd24bd336aa2f64f93cb5d39-Paper-Conference.pdf)

[4] [Official EDE implementation](https://github.com/facebookresearch/ede)
