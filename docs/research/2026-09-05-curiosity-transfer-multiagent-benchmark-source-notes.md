# Curiosity, Transfer, and Multi-Agent Benchmark Source Notes

**Status:** discovery notes only. These sources identify candidate comparisons; they
do not establish that any current Zeta module implements curiosity-driven learning,
general intelligence, efficient transfer, or a society-level objective.

## 1. Initial Candidate Set

| Candidate | Why it is relevant | Potential bounded use | Exclusion / caution |
|---|---|---|---|
| Burda et al., *Large-Scale Study of Curiosity-Driven Learning* | Reports a large-scale evaluation of dynamics-based curiosity and notes generalization to novel levels. | A historical curiosity baseline and a warning that predictive-error signals require a declared environment and comparison protocol. | It is not a domain-fingerprint catalogue, a consensus protocol, or evidence of general learning. [1] |
| NeurIPS 2023, *On the Importance of Exploration for Generalization in RL* | Treats exploration as relevant to downstream generalization. | Candidate source for held-out-domain and exploration-budget metrics. | Must inspect the official benchmark/data release before adoption. [2] |
| Jaques et al., *Social Influence as Intrinsic Motivation for Multi-Agent Deep RL* | Proposes a specific intrinsic reward for multi-agent coordination and communication. | Candidate comparator for an explicitly declared cooperative multi-agent toy environment. | Social influence is not mutual empowerment; it cannot stand in for consent, provenance, or consensus. [3] |
| Pan et al., *Wonder Wins Ways* | Recent multi-agent contextual-calibration work reported on VMAS-like benchmark suites. | Candidate recent comparison after primary artifact and evaluation conditions are checked. | The current search result is not sufficient to adopt its claimed setup or results. [4] |
| Continual-World / Meta-World / CompoSuite candidates | Already recorded separately as continual and compositional control suites. | Retention and held-out composition measurements after a finite environment is selected. | These are control/manipulation benchmarks, not lexical-geometric grounding benchmarks. [5] |

## 2. Current Zeta Boundary

The audited tree has useful **separate** components: deterministic hard/soft
fingerprint lookup (`FingerprintPrism`), structural graph shape receipts
(`StructureFingerprint`), a threshold-bearing trapped/navigable orbit diagnostic
(`TangleNavigator`), attested Gaussian bookkeeping and a finite removal-precision
measurement (`SocietyBootstrap`), and consent-labelled interaction proxies
(`empowermentBound`). It does **not** currently have a validated curiosity reward,
a domain-fingerprint-conditioned learned evaluator catalogue, an externally scored
transfer learner, or a society-level consensus objective.

The next contract must therefore test a small, observable claim such as: *for a
declared environment fingerprint and a finite evaluator catalogue, does a proposed
selection policy improve a specified held-out metric relative to fixed baselines
under the same budget?* It must keep unknown fingerprints unresolved and must not
turn a descriptive empowerment metric into an individual-agent reward.

## 3. Primary-Source Verification

The candidate sources support **different measurements**, so they must not be
collapsed into one reward or one leaderboard claim. Burda et al. study
prediction-error curiosity without extrinsic reward and explicitly identify a
limitation in stochastic settings. Jiang, Kolter, and Raileanu define comparison
in terms of test performance after a fixed training-interaction budget in a
contextual MDP; they give a small tabular grid construction comparing
epsilon-greedy with uncertainty-driven exploration before evaluating larger
Procgen and Crafter settings. Jaques et al. measure counterfactual action
influence in specific cooperative social-dilemma environments, and acknowledge
that influence need not be cooperative in every task. Continual World is a
separate continual-control benchmark focused on capacity, forgetting, and forward
transfer. [1] [2] [3] [5]

The initial candidate should therefore be the **small deterministic contextual
grid construction**, not Procgen, Crafter, or a robotics suite. It can admit an
independent oracle, exhaustive state coverage, deterministic seeds, and controlled
faults. It can answer a narrow claim about finite-budget exploration and held-out
start-state transfer. It cannot establish deep-RL, large-benchmark,
language-grounding, society-governance, or parameter-efficiency results.

Any later multi-agent experiment must use a separately frozen cooperative
environment whose observable rewards carry the consent and externality semantics.
It may include a declared social-influence comparator, but the present
`SocietyBootstrap` provenance/precision measurement is not that comparator.

## 4. Reproduction Feasibility Check

The authors' EDE repository is available, but its released deep experiment path
depends on a Python 3.8 environment plus compatible forks of `level-replay`,
OpenAI Baselines, and Procgen. Its stated training examples expose several
algorithm-specific choices, including QR-DQN, an ensemble count, UCB coefficient,
and a temporal-exploration schedule. The repository is archived. This makes it a
useful later external reference, not an appropriate first target for a strict,
cross-language, deterministic Zeta conformance benchmark. [6]

The initial contract should instead borrow only the evaluative discipline from the
contextual-MDP paper: same action budget, fixed train/test split, declared
exploration policy, and held-out return/suboptimality. A later deep comparison
would have to pin environment versions, implementation commits, dependencies,
hardware, training and evaluation seeds, and compute accounting.

The published EDE evaluation entry point instantiates Procgen through the
`level-replay` and Baselines stack, with evaluation seeds sampled from ambient
entropy when the caller does not provide them. It contains no tabular contextual-
grid carrier. A Zeta implementation must therefore be described as a **new,
independent reproduction of the paper's stated didactic construction**, rather
than a re-run of released author code. The contract must prohibit ambient random
seed generation and must preserve the paper citation as a design anchor rather
than claiming result comparability to its deep Procgen or Crafter measurements.

## 5. Benchmark-Surface Selection: One Initial Carrier, Two Deferred Tracks

The initial carrier should remain an **in-repository deterministic contextual
grid**, specified by its own versioned transition table and replay receipt. It is
not a claim that this new carrier is MiniGrid, EDE, Procgen, or Crafter. The
external comparison is instead methodological: fixed action budget, fixed train
and held-out context split, explicit policy seed, and primary held-out return or
suboptimality. This preserves a small state space for an independent oracle and
for faults such as a wrong fingerprint match, reordered evaluator catalogue,
constant novelty, and accidental held-out leakage.

MiniGrid is a credible **second-stage adapter target** because its maintainers
describe a lightweight, configurable family of discrete grid worlds with a
standard seeded Gymnasium interaction surface. Its task variants can later test
whether a frozen Zeta evaluator-selection contract survives an external
environment API. The first contract must not treat MiniGrid's synthetic mission
strings as evidence of English understanding; a language-facing condition, if
added, must use declared finite prompts, exact action mappings, and retained
unknowns. [7] [8]

PettingZoo is a credible **separate multi-agent adapter target**, not a
consensus protocol. Its AEC and Parallel APIs distinguish sequential from
simultaneous actions, and its versioned environment identifiers make a concrete
version pin possible. A later two-agent cooperative toy can use a fixed
PettingZoo release, a finite reward/externality observation table, and declared
consent/provenance inputs. It must still keep society-level consensus outside an
individual intrinsic reward and must refuse absent consent or non-declared
externality data. [9]

Melting Pot and SMACv2 are **deferred stress suites**. Melting Pot offers held-out
social scenarios but carries a Lab2D dependency and a substantially broader set
of social interactions than the initial claim can measure. SMACv2 is valuable as
a negative benchmark-design precedent: its authors report that the predecessor
SMAC allowed non-trivial open-loop, timestep-conditioned policies, then add
procedural variation and partial observability to make closed-loop evaluation
meaningful. Neither suite should be used to declare mutual empowerment,
consensus, or parameter efficiency without a separately pinned environment,
policy class, compute budget, seed roster, and externality definition. [10] [11]

| Track | Status in this task | Admissible measurement | Explicitly not measured |
|---|---|---|---|
| Deterministic contextual grid | Recommended first implementation | State coverage, external return, held-out context return, novelty-accounting receipt | General learning, English semantics, social consensus |
| MiniGrid adapter | Deferred after the deterministic carrier | External API transfer under an exact version/seed pin | Claim parity with published MiniGrid agents |
| PettingZoo two-agent toy | Deferred and separate | Fixed cooperative outcome plus declared externality/consent refusal paths | Society governance or mutual-empowerment objective |
| Melting Pot / SMACv2 | Deferred stress reference | Later population or procedural-generalization comparison | Any early capability or efficiency claim |

## 6. Exact Tabular-Anchor Extraction and a Reproduction Blocker

The NeurIPS paper provides substantially more than a general motivation. Its
tabular experiment is a deterministic 5×5 grid with four cardinal actions,
boundary self-transitions, a terminal goal at `(4, 0)`, goal reward `2`,
otherwise reward `−0.04`, discount `0.9`, and an episode cap of 250 steps.
It reports tabular Q-learning with a base learning rate `0.05 / sqrt(t)`,
random tie-breaking, 100 trials, 1,000 episodes per trial, and deterministic
evaluation by greedy action selection. Its reported sweeps are
`ε ∈ {0.0, …, 0.9}` and `c ∈ {5, 10, …, 50}`, where the UCB score is
`Q(s,a) + c sqrt(log(t) / N(s,a))`. [2]

However, the published description contains a **load-bearing coordinate
conflict**. The main body says the train start is `(0, 0)` and the test start
is `(0, 4)`. Appendix C.1 prints the same train distribution but gives the test
distribution as the point mass at `(4, 0)`, which the main body identifies as
the terminal goal. A direct claim that Zeta has exactly reproduced the authors'
toy is therefore inadmissible until the authors' intended coordinate convention
or an erratum is independently resolved. The initial Zeta contract should use a
fully declared, separately versioned grid and call the paper a **methodological
anchor**, not an exact reimplementation. Its own independent oracle must compute
the optimal return from the frozen transition/reward table.

The paper also does not supply a complete executable tabular carrier in the
released EDE repository. It is appropriate to retain the published action
budget, baseline family, and held-out suboptimality discipline, but any omitted
choice—including initial Q-values, seed roster, and the coordinate reconciliation
above—must be fixed explicitly by the Zeta contract rather than silently
assumed. [2] [6]

The multi-agent source supports a similarly narrow interpretation: social
influence rewards counterfactual effects of one agent's actions on another
agent's behavior, reported as equivalent to a mutual-information reward in that
model. It does not supply consent, provenance, conflict resolution, or a
society-level consensus rule. It is only a potential **later comparator** in a
declared cooperative environment. [3]

## References

[1] [Burda et al., *Large-Scale Study of Curiosity-Driven Learning*](https://arxiv.org/abs/1808.04355)

[2] [*On the Importance of Exploration for Generalization in Reinforcement Learning*](https://proceedings.neurips.cc/paper_files/paper/2023/file/2a4310c4fd24bd336aa2f64f93cb5d39-Paper-Conference.pdf)

[3] [Jaques et al., *Social Influence as Intrinsic Motivation for Multi-Agent Deep Reinforcement Learning*](http://proceedings.mlr.press/v97/jaques19a/jaques19a.pdf)

[4] [Pan et al., *Wonder Wins Ways: Curiosity-Driven Exploration through Multi-Agent Contextual Calibration*](https://proceedings.neurips.cc/paper_files/paper/2025/hash/a86f9983dee679f0d81ab712a8f7e17c-Abstract-Conference.html)

[5] [Zhang et al., *Continual World: A Robotic Benchmark for Continual Reinforcement Learning*](https://arxiv.org/abs/2105.10919)

[6] [Official EDE implementation, `facebookresearch/ede`](https://github.com/facebookresearch/ede)

[7] [MiniGrid documentation](https://minigrid.farama.org/)

[8] [Farama Foundation MiniGrid repository](https://github.com/Farama-Foundation/Minigrid)

[9] [Farama Foundation PettingZoo repository](https://github.com/Farama-Foundation/PettingZoo)

[10] [Google DeepMind Melting Pot repository](https://github.com/google-deepmind/meltingpot)

[11] [Ellis et al., *SMACv2: An Improved Benchmark for Cooperative Multi-Agent Reinforcement Learning*](https://proceedings.neurips.cc/paper_files/paper/2023/file/764c18ad230f9e7bf6a77ffc2312c55e-Paper-Datasets_and_Benchmarks.pdf)
