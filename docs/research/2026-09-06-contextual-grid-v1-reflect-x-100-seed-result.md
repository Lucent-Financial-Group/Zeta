# Contextual-Grid v1 Reflect-X: 100-Seed Result

**Status:** finite, independently replayed reflection-control observation. It
does not establish geometric transfer, general curiosity, or cross-domain
learning.

> **Key result:** on the separately fingerprinted x-reflected 5 × 5 carrier,
> `count-first/v1` met the predeclared **within-carrier** comparison criterion
> for the fresh seed roster `100…199`. This is a bounded control result, not a
> pooled score with v1 and not an external benchmark result.

## Receipt Identity

The independently authored F# and Python emitters produced identical canonical
UTF-8 result receipts. The raw files are both 239,291 bytes and share SHA-256
`8af888923afd0496b9eb96a2555ec7f14cdb0d5f7be08acec0b533bd96f6a907`.

| Carrier element        | Frozen identity                                                            |
| ---------------------- | -------------------------------------------------------------------------- |
| Environment manifest   | `7477bb597b44805212e7202751ad4988dcae81e4c22e418f7f892cb1c35a1d5a`         |
| Evaluator catalogue    | `1872f54a6fce5f54e3a52456c443012e01c71a8cce33515ef28fb07465da39d7`         |
| Result receipt         | `8af888923afd0496b9eb96a2555ec7f14cdb0d5f7be08acec0b533bd96f6a907`         |
| Roster                 | Exactly unsigned seeds `100…199`, once per policy                          |
| Canonical action order | `north`, `east`, `south`, `west`; names were not remapped under reflection |

## Measured Within-Carrier Outcome

The held-out return is measured in ppm. More positive is better. Paired
suboptimality delta is baseline minus candidate, so a negative value favors the
candidate. The intervals below are the predeclared 10,000-replicate percentile
bootstrap summaries from the canonical receipt; they are not external
confidence guarantees.

| Declared policy     | Mean held-out return (ppm) |
| ------------------- | -------------------------: |
| `uniform-random/v1` |                 −8,946,000 |
| `q-epsilon/v1`      |                 −9,766,400 |
| `q-ucb/v1`          |                 −9,883,600 |
| `count-first/v1`    |             **−5,194,800** |

| `count-first/v1` comparison | Mean paired suboptimality delta (ppm) | 95% percentile interval (ppm) |
| --------------------------- | ------------------------------------: | ----------------------------: |
| vs. `uniform-random/v1`     |                            −3,751,200 |      [−5,040,400, −2,345,600] |
| vs. `q-epsilon/v1`          |                            −4,571,600 |      [−5,743,600, −3,400,400] |
| vs. `q-ucb/v1`              |                            −4,688,800 |      [−5,860,000, −3,518,400] |

The receipt verdict is `criterion-met-on-declared-grid`. This conclusion applies
only to the declared policies, seeds, rewards, action cap, and reflected
carrier. It does not compare v1 and reflected means as a generalization score.

## Controls and Boundaries

The implementation has explicit raw-byte manifest and catalogue admission.
The reflected catalogue must bind the reflected manifest; the v1 catalogue is
refused for the reflected carrier before simulation. The action order is checked
against the declared canonical names and a bounded F#/Python probe for seed 100
matched held-out return, training statistics, stream draws, training/evaluation
trace digests, and Q-table digest before the full roster was promoted.

This result remains outside MiniGrid, the Jiang–Kolter–Raileanu paper's
conflicted tabular coordinate specification, lexical/geometric calibration,
TangleNavigator steering, non-Gaussian inference, learned evaluator selection,
multi-agent cooperation, society consensus, energy/latency, and parameter
efficiency. The reflection control is not a reproduction of the NeurIPS paper.

## References

[1] [Reflected-control contract](2026-09-06-contextual-grid-v1-reflect-x-contract.md)

[2] [Reflection-control selection record](2026-09-06-contextual-grid-next-carrier-selection.md)
