# Transfer-Benchmark Source Notes: Grounded Compositional Generalization

> **Status:** Candidate selection evidence only. This note identifies a reproducible benchmark whose inputs combine declared text and a finite grid-world geometry. It does not report a Zeta result, establish natural-language understanding, or support a general-learning claim.

## Recommendation

**Evaluate gSCAN first as the bounded transfer benchmark candidate.** It has a finite grid-world carrier, synthetic instructions, held-out composition splits, an exact action-sequence output, published data-generation code, and an MIT-licensed repository.[1] [2] This is a fit for testing a declared lexical-to-geometric representation; it is not evidence that an encoder captures word meaning or that success would transfer outside this task family.

| Criterion | Source-supported finding | Consequence for a Zeta contract |
| --- | --- | --- |
| Input | A synthetic instruction and a grid-world situation with object features | Keep lexical tokens and world coordinates as separately versioned inputs. |
| Output | A target low-level action sequence | Score exact sequence match and, only if explicitly added, executable trajectory validity. |
| Transfer split | The generator specifies visual, situational, contextual, adverb, and target-length held-out splits | Choose one named split before implementation; do not aggregate heterogeneous splits into one score. |
| Reproducibility | The repository provides compressed paper data, generation code, split statistics, and an error-analysis mode | Pin a repository revision, data archive hash, selected split, and seed. |
| License | Repository metadata reports MIT | Retain the upstream revision and license notice with any local adapter. |

## Facts and limits to carry forward

Ruis et al. define gSCAN as a benchmark for systematic generalization in **situated language understanding**, where instructions are grounded in grid-world states and deliberately selected train/test differences test particular compositional rules.[1] The maintained generator repository says an agent receives a synthetic instruction and a world with feature vectors and must emit action sequences; it provides the paper data and an error-analysis path for exact-match results.[2] Its documented splits include visual target combinations, a novel relative direction, a relativity case, a contextual class-inference case, adverb cases, and target-length extrapolation.[2]

The source does **not** show that any method understands English outside the synthetic grammar, possesses a general world model, or achieves transfer to a new task distribution. Its own reinforcement-learning branch notes that the complete reward function had not been tested with a learned policy.[2] Therefore, a Zeta benchmark receipt must call this a **finite grounded compositional-transfer measurement**, name a chosen split, retain exact unknown and out-of-vocabulary token behavior, and publish failures as first-class outputs.

Gao, Huang, and Mooney provide a related contextual-embedding comparison on gSCAN, but the abstract presents an empirical hypothesis and benchmark result, not a proof that spatial representations or learned relations generally yield systematic generalization.[3] This is suitable as a named external baseline source, not as a target score that Zeta must reproduce without a common data version, split, metric, and compute budget.

## Complementary benchmark candidates

The following candidates test different claims and must not be merged into one undifferentiated “general learning” score. The recommended order begins with gSCAN because it supplies the closest finite connection between declared language tokens and an explicit spatial world. Continual World and CompoSuite become later lanes only after a separate agent, policy, compute budget, and retention contract exist.

| Candidate | What it can measure | Why it is not the first lexical-geometric benchmark | Entry condition |
| --- | --- | --- | --- |
| **gSCAN** | Held-out compositional instruction-to-action transfer in finite grid worlds | It is synthetic and evaluates action sequence execution, not open-ended language or continual learning | Pin a generator commit, one named split, data hash, metric, and baseline |
| **Continual World** | Forward transfer, retention, and forgetting across a task sequence built on Meta-World | It is robotic continuous-control RL and has no lexical interface | Declare a policy learner, task sequence, replay/retention rules, evaluation cadence, and compute cap |
| **Meta-World** | Multi-task and meta-RL transfer across 50 manipulation tasks and held-out task modes | It requires a control-policy stack; success does not test compositional language grounding | Establish a reproducible simulator/toolchain environment and one ML10 or ML45 protocol |
| **CompoSuite** | Compositional generalization among robot/object/obstacle/objective task components | It is robot manipulation RL rather than a lexical or Bayesian factor query | Pin the MIT repository revision and an explicit `default`, small-scale, or holdout protocol |

Continual World explicitly frames continual RL as balancing capacity/compute constraints, avoiding catastrophic forgetting, and positive transfer; it advocates measuring forward transfer rather than treating retention alone as the outcome.[4] Meta-World provides 50 manipulation tasks and separates fixed multi-task learning from held-out-task meta-learning modes.[5] CompoSuite provides 256 compositional manipulation tasks and documented train/test sampling regimes, but its own repository distinguishes the benchmark from its example training stack and its environment requirements.[6] [7] These are valid future measurements, not evidence that any current Zeta component learns them.

## References

[1] [Ruis et al., "A Benchmark for Systematic Generalization in Grounded Language Understanding" (2020)](https://arxiv.org/abs/2003.05161)

[2] [LauraRuis/groundedSCAN — MIT-licensed generator, data, split, and error-analysis documentation](https://github.com/LauraRuis/groundedSCAN)

[3] [Gao, Huang, and Mooney, "Systematic Generalization on gSCAN with Language Conditioned Embedding" (2020)](https://aclanthology.org/2020.aacl-main.49/)

[4] [Wołczyk et al., "Continual World: A Robotic Benchmark for Continual Reinforcement Learning" (2021)](https://arxiv.org/abs/2105.10919)

[5] [Yu et al., Meta-World: A Benchmark and Evaluation for Multi-Task and Meta Reinforcement Learning](https://meta-world.github.io/)

[6] [Mendez et al., "CompoSuite: A Compositional Reinforcement Learning Benchmark" (2022)](https://proceedings.mlr.press/v199/mendez22a.html)

[7] [Lifelong-ML/CompoSuite — MIT-licensed benchmark repository and protocol documentation](https://github.com/Lifelong-ML/CompoSuite)
