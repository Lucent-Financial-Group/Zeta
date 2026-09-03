# Loopy variance correction — spec: feedback message passing over the factor graph (FVS)

**Status:** SPEC, not code. Frozen before implementation. Every number computed
outside the F# suite in this note is labelled `toy` and must be re-measured in
the suite before it is cited as a result.

**Author:** shadow (Fable 5.1 math team, convened by Aaron 2026-09-03).
Coordinates with Lumen's lanes by citation, never by duplication (§9).

**Unindexed rationale:** this is a specification awaiting review; the
memory-substrate pointer lands with the implementation PR, not with the spec.

## 0. The question, and the one-line answer

Aaron: *"converged loopy graphs are labeled means-only; can we use any research
and search for latest research on how to make this more accurate? this seems
similar to our non-Gaussian optimizations."*

Answer: **yes, and exactly rather than "more accurately."** For the declared
linear-Gaussian multilayer model the missing variance is a finite, closed-form
correction — the covariance the loopy run drops is the sum over the walks that
leave a spanning tree, and conditioning on a **feedback vertex set** (FVS) of
size `k` recovers it with `k + 1` runs of the tree solver we already have plus a
`k × k` dense solve (Liu, Chandrasekaran, Anandkumar and Willsky 2012, Theorem 1;
§4.2 checks the entailment). The paper's cost is `O(k² n)` with a two-pass tree
solver; with the solver this repo actually has it is `O(k·d·m + k² n)` (§8). For
every graph the test suite actually exercises, `k ≤ 2` (§5). The method is a pure function of the evidence
**set** and the declared graph, so it satisfies the order-independence invariant
(§7) by construction — provided the evidence fold is canonicalised, which today
it is not (§7.2 is a real finding).

The resemblance Aaron noticed to the non-Gaussian work is structural, not
metaphorical: FVS conditioning is Pearl's 1986 **loop-cutset conditioning**, which
is family-agnostic. For Gaussians the integral over the cutset collapses to `k + 1`
linear runs; for a categorical cutset it is `|domain|^k` runs. That is the seam
where Lumen's non-Gaussian message families plug in (§9).

## 1. The gap, with MLBNN-42's numbers

`src/Bayesian/MultilayerBnn.fs` labels a converged loopy Gaussian run
`ConvergedLoopyMeansOnly`. That label is *correct* — Weiss and Freeman
(1999/2001) prove converged Gaussian loopy BP has exact means and generally
wrong variances — and the suite pins both halves.

| Witness | Graph | Mean error (L¹ vs dense solve) | Variance error (L¹) | Source |
|---|---|---:|---:|---|
| MLBNN-33 / MLBNN-42 | 4 layers, skips `(0,2) (0,3) (1,3)`, four obs of `5.0`, unit variances | `4.02e-14` | `0.227` | test comments; #16482 PR body gives `0.22710111268589156` |
| MLBNN-46 (#16482) | same graph | dense vs BP means `4.019e-14` | dense vs BP diagonals `0.2271011…` | PR #16482 |
| Sweeps (`MultilayerBnn.update`) on the same graph | same | `2.075` | `0.316` | MLBNN-33 |

Exact marginals for that model, by dense inversion of the joint precision
(`toy` — Python in this note, `scratchpad/ws.py`; the F# oracle
`exactDagMarginals` is the one that counts):

| layer | exact mean | exact variance |
|---|---:|---:|
| 0 | `2.720` | `0.136` |
| 1 | `-0.320` | `0.296` |
| 2 | `0.480` | `0.416` |
| 3 | `1.440` | `0.744` |

**What changed under this spec while it was being written.** PR #16482 (Lumen,
merged 2026-09-03) landed `tryQueryExactDenseGaussian`: an `O(n³)` dense
joint-precision inversion capped at 64 layers, with MLBNN-45..48. So exact loopy
covariance now *exists* — but only as a separate dense record type outside
`FactorGraph<'M>`, with a dimension cap, and the exactness classification
`FactorGraphExactness` still has no state that can call a loopy result exact.
The gap this spec closes is therefore narrower and more honest than the one it
was convened for:

1. The **message-passing** path has no exact-variance mode; exactness leaves the
   factor graph and goes through a matrix.
2. There is **no structural certificate** — "≤ 64 layers" is a cap, not a reason.
   `ExactLoopyViaFvs k` (§4.4) is a reason: the bound is a property of the graph.
3. Nothing composes with a **non-Gaussian** message family; the dense path is
   Gaussian by construction. FVS conditioning is the family-agnostic form (§9).

## 2. Literature survey — checked, not cited

Anchor discipline (`.claude/rules/anchor-to-human-prior-art.md`): an anchor must be
*checked* for entailment. Column "checked" records what was actually read:
**page** = full text extracted and the theorem read; **abstract** = abstract only;
**repo** = already checked against a measurement inside this repository.

| # | Method | Anchor (old → modern) | What it corrects | Cost | Convergence / exactness guarantee | Function of evidence SET only? | Checked |
|---|---|---|---|---|---|---|---|
| 1 | **Feedback message passing (FMP) / FVS conditioning** | Pearl 1986 (loop-cutset conditioning) → Liu, Chandrasekaran, Anandkumar, Willsky 2012 | means **and** variances, exactly, all nodes | `O(k² n)`, `k = |FVS|`; `k+1` tree-BP runs + `k×k` solve | **Theorem 1: exact means and variances for all nodes**, no convergence condition (tree BP terminates). Approximate variant with pseudo-FVS: Theorem 2 — if it converges, exact means everywhere, exact variances on the pseudo-FVS; Prop 1 — walk-summable ⇒ converges for any pseudo-FVS; Prop 2 — variance error bound `(n−k)/n · ρ̃^{g̃}/(1−ρ̃)` | yes — pure function of `(J, h)`, which are a function of the network | page |
| 2 | **Dense joint-precision inversion** (shipped, #16482) | Gauss / Cholesky; Lauritzen–Spiegelhalter 1988 in the limit | everything | `O(n³)`, capped at 64 | exact; fails closed on non-PD | yes | repo |
| 3 | **Embedded trees** | Sudderth, Wainwright, Willsky NIPS 2000 / IEEE TSP 2004 | exact means by iterating spanning-tree solves; exact variances via low-rank corrections sized by the number of **cut edges** | per iteration one tree solve; correction rank = cut-edge count | iterative; converges under conditions on the tree sequence; variances exact once means converged | yes | abstract |
| 4 | **Walk-sums** (analysis, not an algorithm) | Malioutov, Johnson, Willsky JMLR 2006 | *explains* the gap: Lemma 19 — the LBP variance is the sum over **backtracking** self-return walks only; the true variance sums all self-return walks (Prop 5) | — | Prop 21: walk-summable (`ρ(|R|) < 1`) ⇒ LBP well-posed, means exact, variances converge to the backtracking walk-sum; Prop 25: `ρ∞ < 1` characterises variance convergence | — | page |
| 5 | **Path-sums** | Giscard, Choo, Thwaite, Jaksch JMLR 2016 | exact covariance as a finite branched continued fraction | not better than `O(n³)` in general; exploits sparsity | exact for **every positive-definite `J`**, walk-summable or not | yes | page |
| 6 | **Linear response** | Welling & Teh, Neural Computation 2004, §7 | exact covariance of a Gaussian MRF by propagating a first-order perturbation | "translates into a perhaps unexpected algorithm to invert the matrix"; iterative, `O(n·m)`-class per iteration | requires BP to converge to a stable fixed point | yes | page |
| 7 | **Distributed variance correction** | Li, Su, Wu, IEEE TSP 67(23) 2019 | explicit error expression for the BP variance; distributed message-passing correction; residual bound decreases with the selected node set and **vanishes when the remaining graph is loop-free** | distributed; grows with selected set | this is the distributed form of pseudo-FVS (#1) | yes | **UNPROVEN** — not locatable on arXiv; only a second-hand abstract summary was read |
| 8 | **Generalized BP / Kikuchi** | Yedidia, Freeman, Weiss NIPS 2000; Cseke & Heskes JAIR 2011 (Gaussian) | larger regions absorb short loops; exact only when the region graph is a junction tree | grows with region size | Gaussian Bethe: stable fixed points are local minima of the Bethe free energy; pairwise-normalisability ⇒ bounded; **no exactness certificate** for variances in general | yes | abstract |
| 9 | **Expectation propagation** | Minka 2001 | with a fully-factorised Gaussian family on a Gaussian model EP **is** loopy BP — same fixed points, same wrong variances; with a joint-Gaussian family it is the dense solve | — | inherits #4/#2 | yes | repo (Minka is the standing EP anchor of `Message.fs`) |
| 10 | **Tree-reweighted BP** | Wainwright, Jaakkola, Willsky 2005 | convexified Bethe; bounds, not exactness | — | variances not exact; no certificate | yes | abstract |
| 11 | **Junction tree** | Lauritzen & Spiegelhalter 1988 | exact | Gaussian: `O(n · w³)`, `w` = treewidth | exact | yes | abstract |
| 12 | **Learning in Gaussian factor graphs / amortised BP** | arXiv 2311.14649 (2023): training and prediction both phrased as GBP inference in a deep Gaussian factor graph — **not** a learned correction to BP variances; "BP converges to Gaussian in sparse factor graphs", arXiv 2601.21935 (2026) | a learning framework, and a justification of the Gaussian family | training + inference | no exactness certificate; a trained model's **output depends on the training set** | **no** — rejected on the invariant | abstract |

Two frontier results worth keeping without adopting: 2601.21935 (2026) proves
variable beliefs become Gaussian in sparse loopy factor graphs after a few
iterations — relevant to *Lumen's* non-Gaussian lane, since it argues the Gaussian
family is the attractor, not an assumption; and Ortiz, Evans, Davison 2021 ("A
visual introduction to Gaussian BP") is the accessible restatement of #4.

### 2.1 Ranking

Ranked by *fit to the existing structure with the least distortion* under the
invariant, then by certificate strength, then by cost.

| rank | method | why here |
|---|---|---|
| **1** | **FMP / FVS conditioning (#1)** | reuses `FactorGraph.runToFixpoint` on a tree as the inner solver (already exact, already idempotent — MLBNN-28/35); reuses `tryInvertDeterministic` (#16482) for the `k×k` solve; adds one closed-form correction; yields a **structural** exactness certificate `k`; family-agnostic seam for Lumen |
| 2 | dense inversion (#2) | already shipped; stays as the *oracle* FMP is judged against and as the fallback when `k` exceeds budget |
| 3 | junction tree (#11) | equally exact, and **cheaper on band-shaped graphs** (§5: depth-16 every-other residual has `w = 2` but `k = 7`) — but needs a clique-tree engine that does not exist here; revisit if `k` grows past budget on real graphs |
| 4 | embedded trees (#3) | same family as #1 with edges instead of vertices; iterative, so it needs a convergence receipt FMP does not |
| 5 | linear response (#6) / path-sums (#5) | exact but no structural advantage over #2 at our `n`; path-sums is the answer if a non-walk-summable model ever refuses #1's approximate mode |
| 6 | pseudo-FVS / distributed correction (#1 approx, #7) | the **phase-2** mode when `k` is large: exact means, exact variances on the pseudo-FVS, bounded error elsewhere |
| 7 | GBP (#8), TRW (#10), EP (#9) | no exactness certificate; EP with a fully-factorised Gaussian family cannot help by construction |
| — | neural/amortised (#12) | rejected: not a function of the evidence set |

## 3. What the code is today (read, not remembered)

- `MultilayerBnn.tryToFactorGraph` builds one `Factor.prior` per layer (layer 0's
  carries the absorbed data) and one `sumLinkFactor` per layer with parents;
  messages are keyed per edge (`FactorToVar : Map<factor, Map<var,'M>>`).
- `tryMarginalsViaFactorGraph` runs `FactorGraph.runToFixpoint Gaussian.distance`
  — synchronous schedule, residual test over the union of keys, NaN counts as
  moved. On a tree it converges in at most `diameter + 1` rounds and is exact
  (MLBNN-28); on a loop it is loopy BP.
- `tryQueryViaFactorGraph` classifies with `isAcyclicFactorGraph parentsByChild`
  — union-find over the **bipartite** factor graph — into the four-state DU.
- `#16482` added `compileJointPrecision` (the full `J, h` from priors + sum
  factors), `tryCholeskyPositiveDefinite`, `tryInvertDeterministic` (Gauss–Jordan
  with a deterministic pivot tie-break `(abs, -row)`), and the dense query.
- Evidence enters once, at layer 0, through `MinimalBnn.update`, which multiplies
  the running `LikelihoodProduct` by the new likelihood **in arrival order** (§7.2).
- `parentsOf` order is declared load-bearing for bits (convolution is not
  bit-associative); the topology is *declared*, never received, so it is not an
  arrival-order leak.

The pieces FMP needs already exist: a tree-exact per-edge solver, the joint
precision compiler, a deterministic small dense inverter, and an acyclicity
oracle. What is missing is (a) a *conditioned* factor graph, (b) the `k + 1`
runs and the correction, (c) a deterministic FVS chooser, (d) the DU state.

## 4. The chosen method, stated for this code

### 4.1 Which graph the FVS lives on

FMP is stated for pairwise Gaussian MRFs (`J` sparsity graph). Our model has
multi-parent sum factors, whose pairwise (moral) graph is a clique over
`{child} ∪ parents`. Two definitions of "feedback vertex set" are therefore in
play, and only one matches the machinery:

- **moral-graph FVS**: remove variables until the pairwise graph of `J` is a
  forest. Matches the paper's statement literally.
- **factor-graph FVS** (this spec): remove variables until the **bipartite
  factor graph** is acyclic — exactly the predicate `isAcyclicFactorGraph`
  already tests. Tighter, because a multi-parent sum factor is a tree in the
  factor graph but a triangle in the moral graph (MLBNN-32: factor-graph `k = 0`,
  moral `k = 1`).

Why the factor-graph notion is sufficient for Theorem 1 (my argument, and the
falsifier for it is F1/F3 in §6, not this paragraph): conditioning on `x_F = c`
leaves a Gaussian over `x_T` with information matrix `J_T` regardless of how it
is factorised; BP on the *conditioned factor graph* is exact when that graph is
acyclic (Kschischang–Frey–Loeliger 2001, already the repo's tree anchor); and the
rest of the FMP derivation consumes only exact conditional means and variances
of `x_T`. The paper's own proof (Theorem 1) does the same, on a pairwise tree.

**Structural, never numerical.** For the MLBNN-42 model the realised `J` has
`J₀₂ = J₁₂ = 0` by *cancellation* (`1/v₂ = 1/v₃` with opposite signs from
`a₂ = (1,1,−1,0)` and `a₃ = (1,1,1,−1)`), so the moral graph of the realised
matrix is a single 3-cycle with `k = 1`. That zero is a coincidence of the unit
link variances, not a property of the topology
(`.claude/rules/numerology-vs-number-theory.md`): a floating-point zero is not a
structure. The FVS and the certificate are computed from the **declared
topology**, and a cancellation-induced zero is never exploited.

### 4.2 The algorithm, in the repo's own quantities

Let `F` be the FVS (`|F| = k`), `T = V \ F`. Write `J`, `h` from
`compileJointPrecision` (only the blocks `J_F`, `J_FT`, `h_F` are read; `J_T`
is never materialised — the tree solver *is* `J_T⁻¹`).

1. **Condition.** `tryToConditionedFactorGraph (assignment : Map<int,float>) net`
   — drop each `F` variable and its prior factor; in every sum factor that touches
   an `F` variable, fold the assigned value into a constant **offset** (an `F`
   parent `p` at value `c_p` turns `x_i = Σ parents + w` into
   `x_i − c_p = Σ other parents + w`; an `F` child at value `c_i` turns it into
   `N(Σ parents ; c_i, v)`). Two factor shapes are needed, not one: the
   parent-in-`F` case is `sumLinkFactor` with an added `offset : float`; the
   **child-in-`F`** case has `Neighbors = remaining parents` only and emits no
   child message, so it is a second factor (`sumConstraintFactor`) rather than a
   parameter. The second shape occurs in F3's own catalog (every-other depth 8,
   `F = {1, 3, 5}`, child 3 ∈ F). Nothing in `FactorGraph` itself changes.
2. **Refuse if still loopy.** `isAcyclicFactorGraph` on the conditioned graph
   must return `true`, else fail closed with the residual named. This is the
   guard that makes a wrong `F` a refusal rather than a silently-wrong variance.
3. **`k + 1` tree runs.** Run `runToFixpoint` with `assignment = 0` and with
   `assignment = e_p` for each `p ∈ F`. Each is `ExactAcyclic` (assert it). From
   run 0 take the tree means `μ_T(0)` and tree variances `P^T_ii`; the **feedback
   gains** are `g_{ip} = μ_i(e_p) − μ_i(0)`, i.e. `G = −J_T⁻¹ J_TF`.
4. **`k × k` solve on `F`.** `J̃_F = J_F + J_FT G` (the Schur complement
   `J_F − J_FT J_T⁻¹ J_TF`), `h̃_F = h_F − J_FT μ_T(0)`;
   `P_F = tryInvertDeterministic J̃_F` (Cholesky-check first, exactly as #16482
   does), `μ_F = P_F h̃_F`.
5. **Correct `T`.** `μ_i = μ_i(0) + g_i · μ_F` and
   `P_ii = P^T_ii + g_i P_F g_iᵀ` for `i ∈ T` — Liu et al. eq. (16) for `k = 1`,
   Theorem 1 in general.

Entailment check against the paper (page-checked, verbatim):

> **Theorem 1.** The feedback message passing algorithm described in Figure 4
> results in the exact means and exact variances for all nodes.

and the cost accounting: *"Step 1 … performing BP on T k + 1 times, all with the
same information matrix, J_T, but with different potential vectors … Step 3 …
solving a k-dimensional linear system … the total complexity is O(k² n)."*

The bracket in step 4 is the block-inverse identity, which is elementary and is
what makes the correction exact rather than approximate; if the implementation
disagrees with `exactDagMarginals` it is the offset handling in step 1 or the
sign of `J_FT` that is wrong, and the mutation in F3 is chosen to catch exactly
that.

### 4.3 Choosing `F` deterministically

The FVS is part of the *query*, so its choice must be a pure function of the
declared topology (never of arrival, never of the realised floats):

- `n ≤ 20`: exact minimum FVS by exhaustive subset search in increasing size,
  ties broken by lexicographically smallest index set. Deterministic. Cost is
  `Σ_{i≤k} C(n, i)` union-finds, which is small when `k` is small (`k = 2` on
  MLBNN-42: 11 subsets) but reaches `≈ 6 × 10⁵` at `n = 20, k ≈ 10` — and
  dense-residual graphs have `k = n − 2`. So the exhaustive path is bounded by
  the same `feedbackBudget` below: search stops at `i = feedbackBudget` and
  refuses, which caps it at `Σ_{i≤8} C(20, i) ≈ 2.6 × 10⁵` in the worst case.
- `n > 20`: greedy by Liu et al. Fig. 5 — score `s(i) = Σ_{j∈N(i)} |J_ij|`,
  pick the max, ties to the lowest index, repeat until acyclic — but with the
  score taken from the **declared** coupling precisions `1/v`, not from a
  realised `J` that may cancel (§4.1). Mark the result `k_greedy ≥ k_min`.

A `feedbackBudget` (proposed default 8, i.e. ≤ 64·n arithmetic) bounds the exact
mode. Exceeding it is a **teaching refusal** naming `k` and the budget, never a
silent fall-through to means-only; the caller may then choose the dense path
(`n ≤ 64`) or the phase-2 pseudo-FVS mode.

### 4.4 Exactness classification — the DU extension

```fsharp
type FactorGraphExactness =
    | ExactAcyclic
    | ExactLoopyViaFvs of feedbackVertexCount: int   // NEW, phase 1: Theorem 1
    | ConvergedLoopyMeansOnly
    | UnsettledAcyclic
    | UnsettledLoopy
    // phase 2 (not in the first PR):
    // | ConvergedLoopyPseudoFvs of pseudoFvsCount: int
    //     exact means everywhere, exact variances on the pseudo-FVS,
    //     Prop 2 bound elsewhere when walk-summable
```

`ExactLoopyViaFvs k` carries the bound in the value: the claim is "exact, and it
cost `(k + 1)` tree runs plus a `k × k` solve." Consumers that today branch on
`ExactAcyclic` to trust variances gain a second trustworthy case with the same
guarantee strength; `ConvergedLoopyMeansOnly` keeps its meaning for the plain BP
path, which is **not** removed — MLBNN-42 stays as-is (§6, F2).

The result record is the existing `FactorGraphUpdate`. `Rounds` reports the
*sum* of the `k + 1` tree runs' rounds; `Converged` is the conjunction of their
receipts. A `false` on a tree is **legitimate** when `maxRounds < diameter + 1`
(synchronous flooding needs that many rounds), so it is a **refusal** — a
teaching error naming the run, its rounds and the cap — never an assertion and
never a silently-labelled `Unsettled*` iterate.

## 5. FVS / treewidth arithmetic for our real graphs

Computed by exhaustive search (`toy` — `scratchpad/fvs.py` and `fvs2.py` in this
session; the F# `chooseFeedbackVertexSet` must reproduce them and F1 pins the
MLBNN-42 row):

| graph (as declared in the suite) | `n` | factor-graph FVS `k` | moral-graph FVS | treewidth `w` | FMP `k²n` | dense `n³` |
|---|---:|---:|---:|---:|---:|---:|
| MLBNN-30/33/42/46 skips `(0,2)(0,3)(1,3)` | 4 | **2** `{0,1}` | 2 | 3 | 16 | 64 |
| MLBNN-34 `Dag-skip` / `SkipConnections (0,2)(1,4)` | 5 | **1** `{1}` | 1 | 2 | 5 | 125 |
| MLBNN-35 `Dag [[];[0];[1;0];[2]]` | 4 | **1** `{0}` | 1 | 2 | 4 | 64 |
| MLBNN-32 `Dag [[];[];[0;1]]` (factor tree) | 3 | **0** | 1 | 2 | 0 | 27 |
| any `Sequential` chain | `n` | 0 | 0 | 1 | 0 | `n³` |
| every-other residual `(i−1, i−2)`, depth 8 | 8 | 3 | 2 | 2 | 72 | 512 |
| every-other residual, depth 16 | 16 | 7 | — | 2 | 784 | 4096 |
| dense residual (all previous), depth 6 | 6 | 4 | 4 | 5 | 96 | 216 |

Reading the table honestly:

- Every graph the suite runs today has `k ≤ 2`. The exact mode costs three tree
  runs of a four-node graph on MLBNN-42. There is no performance story here at
  this size; the story is the certificate and the message-passing form.
- **FVS is not uniformly the right structure.** Band-shaped residual graphs have
  constant treewidth (`w = 2`) but `k ≈ n/2`. If the society ever runs deep
  residual stacks, junction tree (rank 3 in §2.1) is the better exact engine and
  should be the next spec, not a bigger budget.
- The moral-graph column is included to show why the factor-graph definition was
  chosen (MLBNN-32 row) and to make the §4.1 cancellation point concrete.

Walk-summability of the MLBNN-42 model (`toy`, `scratchpad/ws.py`): normalising
`J` to unit diagonal, `ρ(|R|) ≈ 0.649 < 1`, so the model is walk-summable and
Malioutov et al. Prop 21 *predicts* the loopy convergence MLBNN-33 observes (1000
rounds budget, converged).

Greedy selection, computed three ways (`toy`, `scratchpad/ws.py`), because the
first draft of this note scored the *realised, unnormalised* `J` — which includes
the cancellation zeros §4.1 says are never exploited — and the review caught it:

| scoring | `s(0), s(1), s(2), s(3)` | first pick | `k` reached |
|---|---|---|---|
| realised unnormalised `Σ_j |J_ij|` (first draft — wrong per §4.1) | `2, 2, 1, 3` | layer 3 | 2 |
| Liu et al. Fig. 5 as written: unit-diagonal normalisation, `Σ_j |R_ij|` | `0.427, 0.530, 0.408, 1.012` | layer 3 | 2 |
| §4.3's declared-topology score (`1/v` per clique co-member, no cancellation) | `6, 6, 5, 3` | layer 0 (tie with 1, lowest index) | 2 |

The conclusion `k = 2` survives all three, but the *first pick* does not: the
paper's scoring and the spec's own scoring disagree on which node leads. That is
fine for phase 1 (exhaustive search decides for `n ≤ 20`) and is exactly what F8
must pin for phase 2: the implementation follows §4.3 (declared topology),
records which node it picked, and the test asserts `k = 2`, not the pick.

## 6. Falsifiers — a test that fails without the claim, and the mutation that breaks it

All new rows use the **independent** oracle already in the test file
(`exactDagMarginals`, dense Gauss–Jordan that never touches `FactorGraph`), plus
the F#/Python cross-verification lane #16482 established
(`tests/cross-verification/multilayer-bnn-online-update/`). Bit comparisons use
the existing `bits` helper.

| id | claim | test (fails without the feature) | pinned mutation (must fail the test) |
|---|---|---|---|
| **F1** | FMP is exact on MLBNN-42's graph | `MLBNN-49`: same network as MLBNN-42; `tryQueryViaFeedbackMessagePassing` returns `Exactness = ExactLoopyViaFvs 2`, every layer's mean **and variance** within `1e-9` of `exactDagMarginals` | delete the `g_i P_F g_iᵀ` correction → variances revert to tree partials → fails. Second mutant: use `F = {0}` → conditioned graph still loopy → the step-2 refusal must fire; a mutant that skips the acyclicity check returns a wrong variance and fails the `1e-9` row |
| **F2** | the plain BP path is unchanged and still wrong | `MLBNN-42` stays verbatim (`variance L¹ > 1e-6`, `ConvergedLoopyMeansOnly`); a twin `MLBNN-50` asserts the FMP path on the *same* `receipt.Network` has variance L¹ `< 1e-9` | route `tryInferViaFactorGraph` through FMP → MLBNN-42 fails (the wrong path must stay observable) |
| **F3** | FMP agrees with the dense query | `MLBNN-51`: declared catalog (rows of §5 that exist in the suite + every-other depth 8 + dense-residual depth 6): FMP vs `tryQueryExactDenseGaussian` within `1e-10` per layer, and FMP vs `exactDagMarginals` within `1e-9` | flip the sign of `J_FT` in step 4 → disagreement on every loopy row; #16482's existing coupling-sign mutant is reused. Note FMP and the dense query **share** `compileJointPrecision`, so the independence in this row comes from `exactDagMarginals` and the Python oracle, not from the dense query |
| **F4** | trees reduce to plain BP bit-for-bit | `MLBNN-52`: on every acyclic row, `k = 0`, and FMP marginals are **bit-identical** to `tryMarginalsViaFactorGraph` (same graph, same solver, one run) | add a spurious correction pass when `k = 0` → bits move |
| **F5** | **order independence** (the invariant) | `MLBNN-53`: a declared evidence set of five **non-dyadic** observations `{0.1, 0.2, 0.3, 0.4, 0.5}` at observation variance `1`; for all 120 permutations, build the network through the **canonical fold** (§7.2) and query FMP: all marginals bit-identical. **Negative control in the same test:** fold the same set in raw arrival order and assert that at least two permutations differ in `bits Layers.[0].Posterior.PrecisionMean` — if none does, the control is vacuous on these values and the test must fail loudly. **Why these values:** the first draft used `{−1.0, 2.0, 3.0, 0.5, −2.25, 1.75}`, which are dyadic with ≤ 2 fractional bits, so every partial sum is exact and all 720 permutations give **one** bit pattern — the control was vacuous and the test would have been red on first run (caught in review; reproduced: 1 pattern). `{0.1, …, 0.5}` gives **3** distinct patterns over 120 permutations (reproduced). The `Precision` clause of §7.2 is demonstrated separately: unit observations at variances `[0.3, 0.7, 1.1, 2.9]` give **1** pattern over 24 permutations (not a control), while `[0.3, 0.7, 1.1, 2.9, 1.3]` gives **3** over 120, so the test uses the five-variance set for that half | replace the canonical sort by arrival order → the bit-identity assertion fails on the permutation the control found |
| **F6** | purity / idempotency | `MLBNN-54` (MLBNN-35 pattern): two FMP calls on the same network are bit-identical and `toJsonString` of the network is unchanged | scribble on `net.UpwardMessages` inside the conditioned builder → fails |
| **F7** | budget refuses loudly | `MLBNN-55`: dense-residual depth 6 with `feedbackBudget = 3` (its `k = 4`) → `Error` naming `k = 4` and the budget; network unchanged | silently fall back to BP and label `ConvergedLoopyMeansOnly` → the test expects `Error` |
| **F8** (phase 2) | walk-summability classifier | `ρ(|R|)` by power iteration on the normalised declared `J`; MLBNN-42 model within `1e-6` of `0.649`; a declared non-walk-summable model (to be constructed; none found in the current catalog) refuses pseudo-FVS mode | return `0.0` unconditionally → the non-WS row is mislabelled |

Mutation discipline: register F1/F3/F5's mutants with
`src/Core.TypeScript/hygiene/mutation-runner.ts` in the cross-verification lane,
as #16482 did with its three pinned mutants. A test that survives its mutant is
not a falsifier (`toy-is-free-metered-must-be-earned.md`).

## 7. Order independence — the non-negotiable, and what it demands of the fold

### 7.1 The property

Aaron's invariant: agents that see the same evidence in **different orders**
reach the **same** conclusion. The repo's mechanism
(`docs/research/2026-09-02-crdt-belief-fusion-contract.md`): the replicated
state is the content-addressed evidence **set** (union is the CRDT); any
Bayesian query is a deterministic function of that set.
`.claude/rules/local-time-never-enters-the-shared-fold.md` says the same for
time: receive order steers local behaviour only; the shared fold sees the set,
phase-ordered.

FMP as specified is a pure function of `(declared topology, priors, link
variances, layer-0 posterior)`; no step reads a clock, a schedule, or an arrival
index. `F` is chosen from the topology (§4.3). The `k + 1` tree runs are
independent of each other. So the query side satisfies the invariant **iff its
input does**.

### 7.2 The input does not, today — a finding, not a claim against anyone

`MinimalBnn.update` computes `LikelihoodProduct * likelihoodMessage`, i.e.
natural-parameter addition, once per observation in **arrival order**. Floating-point
addition is commutative but not associative, so for three or more distinct
observations the resulting `PrecisionMean` (and, with unequal observation
variances, `Precision`) can differ in the last ulp between two arrival orders —
**when the values are not exactly representable**: `{0.1, …, 0.5}` yields 3
distinct `PrecisionMean` bit patterns over 120 orders, and five unequal variances
yield 3 distinct `Precision` patterns, whereas dyadic values with few fractional
bits sum exactly in every order (F5 records both, and the review that caught the
dyadic draft). MLBNN-42's observations are four copies of `5.0`, which is why
nothing has noticed: identical terms sum identically in any order. The order-independence tests in
the suite (MLBNN-41's replay, MLBNN-47's bit-stable replay) test **replay of one
order**, not **permutation of the set** — which is the rule's own warning about a
check that did not run.

This is also the "canonical compensated reduction" row of the CRDT contract §3
("floating implementation must use canonical compensated reduction"), which the
TypeScript census implements by sorting on a content fingerprint
(`crdt-belief-fusion.ts`, `compareText` over `evidenceFingerprint`) and the F#
online path does not yet.

**Required by this spec:**

- The shared query is evaluated on a network whose layer-0 posterior is the fold
  of the evidence set in **canonical order** — sort by a content address of
  `(observation, variance, evidenceId)` under `StringComparison.Ordinal` on a
  canonical encoding (`culture-invariant-by-default.md`), then left-fold. Two
  agents holding the same set then execute the same sequence of additions and are
  bit-identical by construction.
- The arrival-order accumulator in `MinimalBnn.State` remains the **local**
  view (retransmit, staleness-to-me, UI); it is never the input to the shared
  query. This is the two-orders split, applied to evidence instead of time.
- Exactly-rounded summation (Neumaier / Shewchuk) would additionally make the
  fold associative as a *set* operation and is the stronger fix; it is out of
  scope for this spec and named here so nobody mistakes sort-then-fold for it.

F5 is the falsifier for the whole of §7, including the negative control that
proves the raw fold is bit-sensitive on the chosen values.

## 8. Cost

Let `m` be the number of factor-graph edges and `d` the diameter of the
conditioned tree. **The paper's `O(k² n)` assumes a two-pass `O(n)` tree solver.
This repo's `runToFixpoint` is synchronous flooding**: `≤ d + 1` rounds, each
`O(m)`, so one tree run costs `O(d · m)` — `O(n²)` on a chain-shaped tree — and
the first draft of this note wrote "`≤ diameter + 1` rounds" in one column and
`O(k² n)` in the next, which do not add up. Corrected:

| mode | tree-BP runs | dense solve | correction | total (this solver) | when |
|---|---|---|---|---|---|
| plain BP (today) | 1 loopy run to fixpoint (`≤ maxRounds`) | — | — | `O(rounds · m)` | means-only |
| **FMP exact** | `k + 1`, each `≤ d + 1` synchronous rounds of `O(m)` | `k × k`, `O(k³)` | `O(k² n)` | **`O(k · d · m + k² n)`** | `k ≤ feedbackBudget` |
| FMP exact, leaf-to-root schedule (not implemented) | `k + 1` two-pass runs, `O(m)` each | `O(k³)` | `O(k² n)` | `O(k² n)` — the paper's bound, **only under that schedule** | same |
| dense (#16482) | — | `n × n` | — | `O(n³)` | `n ≤ 64` |
| pseudo-FVS (phase 2) | `k̃ + 1` loopy runs on the residual | `k̃ × k̃` | `O(k̃² n)` | `O(k̃ · rounds · m + k̃² n)` + convergence receipt | `k > budget`, walk-summable residual |

At MLBNN-42's size (`n = 4, m = 9, d ≤ 3`) every exact-capable mode is
sub-microsecond; the crossover where FMP beats dense is `k · d · m ≪ n³`, which
holds for sparse-skip stacks and fails for band-shaped ones (§5). A leaf-to-root
schedule on `FactorGraph` would recover the paper's bound and is a separate,
optional change. Memory is `O(k n)` for the gains. Everything is
`Result`-typed; the only exceptions are the existing `invalidArg` constructors.

## 9. Coordination with Lumen (cite, do not duplicate)

Searched `workitems/`, `workitems/done/`, `agendas/`, `docs/BACKLOG.md` and the
open PR list (REST) for "non-Gaussian", "loopy", "message famil", "uncertainty
treatment": no work item under those titles exists on `main` at the time of
writing, so this spec cites the artifacts that do:

- **PR #16482** (Lumen, merged 2026-09-03) — the dense exact query; its body
  states "non-Gaussian unmeasured" and "canonical content-addressed evidence
  union remains the only candidate state merge; inference is a deterministic
  query over an explicit input state." This spec is consistent with both
  sentences and adds the message-passing exact mode and the structural certificate.
- `docs/research/2026-09-02-multilayer-factor-graph-online-update-contract.md` —
  the frozen online-update contract whose §4 table this spec extends by one row
  (`Loopy factor graph, FVS-conditioned` → "means and variances exact; certificate
  `k`").
- `workitems/081M0WZTGEX087G0R000VRRANV-…` — categorical `SoftMessage` for the
  factor graph (Lumen). The bridge to it is §0's last paragraph: FVS conditioning
  is Pearl's cutset conditioning and is **family-agnostic**; what is Gaussian-specific
  is only that the cutset integral collapses to `k + 1` linear runs. A categorical
  cutset costs `|domain|^k` runs — Pearl's original exponential — and Lumen's
  bounded-influence messages are what would make those runs well-conditioned.
- `docs/ZETA-ARCHITECTURE-UNIFIED.md:203` names "Non-Gaussian full EP … VMP
  Student-t is in the factor graph; full multilayer EP schedule not yet wired" —
  that is the lane Aaron's "non-Gaussian optimizations" refers to; it is Lumen's
  and is untouched here.

Hand-off sentence for the implementation PR: *implement phase 1 (§4, F1–F7) as a
fourth query path beside the three existing ones; do not modify the BP path; the
`sumLinkFactor` offset and the new `sumConstraintFactor` (§4.2 step 1) are the
only changes to shared primitives.*

## 10. Register — what is claimed, what is `toy`, what is not claimed

- **Claimed (checked):** Theorem 1 of Liu et al. 2012 entails exact means and
  variances for FVS conditioning, at `O(k² n)` under the paper's two-pass tree
  solver (`O(k·d·m + k² n)` under ours, §8); Lemma 19 / Prop 21 of Malioutov et
  al. 2006 entail the mechanism of the gap and the convergence precondition; the
  block-inverse identity in §4.2 is elementary algebra.
- **`toy` (computed here, unmeasured in the suite):** every number in §1's exact
  table, §5's `k`/`w` table, `ρ(|R|) ≈ 0.649`, the greedy scores. They become
  measurements when F1/F3/F8 pin them in F#.
- **Not claimed:** anything about non-Gaussian families; that FVS beats junction
  tree in general (§5 shows a counter-family); that sort-then-fold makes the
  evidence fold associative (it makes it canonical); that the pseudo-FVS bound
  applies to non-walk-summable residuals (Prop 2 assumes walk-summability);
  convergence of the plain BP path on any graph not in the catalog.
- **Explicit non-claim about intent:** the arrival-order fold in §7.2 is an
  ordinary omission — nothing in the suite needed distinct observation values
  to pass — and is reported as a defect, not a motive
  (`never-assume-malice-where-mistake-is-possible.md`).

## 11. Anchors (Beacon)

Old:

- Pearl, J. (1986). *Fusion, propagation, and structuring in belief networks.*
  Artificial Intelligence 29(3). Loop-cutset conditioning — condition on a cutset,
  solve the singly-connected remainder, combine. FMP is its Gaussian closed form.
- Lauritzen, S. & Spiegelhalter, D. (1988). *Local computations with probabilities
  on graphical structures.* JRSS-B. Junction tree; the treewidth alternative.
- Kalman 1960; Rauch, Tung & Striebel 1965 — already the module's tree anchors.

Modern (page-checked unless marked):

- Weiss, Y. & Freeman, W. T. (1999 NIPS / 2001 Neural Computation). *Correctness
  of belief propagation in Gaussian graphical models of arbitrary topology.*
  Means exact at convergence, variances not — checked in-repo by MLBNN-33.
- Malioutov, D. M., Johnson, J. K. & Willsky, A. S. (2006). *Walk-sums and belief
  propagation in Gaussian graphical models.* JMLR 7. Prop 1 (walk-summability ⇔
  `ρ(|R|) < 1`), Prop 5, Lemma 19, Prop 21, Prop 25.
- Sudderth, E. B., Wainwright, M. J. & Willsky, A. S. (2004). *Embedded trees:
  estimation of Gaussian processes on graphs with cycles.* IEEE TSP 52(11).
  (abstract)
- Welling, M. & Teh, Y. W. (2004). *Linear response algorithms for approximate
  inference in graphical models.* Neural Computation 16(1), §7.
- Yedidia, J. S., Freeman, W. T. & Weiss, Y. (2000). *Generalized belief
  propagation.* NIPS. (abstract) · Cseke, B. & Heskes, T. (2011). *Properties of
  Bethe free energies and message passing in Gaussian models.* JAIR 41. (abstract)
- Minka, T. (2001). *Expectation propagation for approximate Bayesian inference.*
  UAI. Already the repo's EP anchor.
- Wainwright, M. J., Jaakkola, T. & Willsky, A. S. (2005). *A new class of upper
  bounds on the log partition function.* IEEE Trans. IT. (abstract)
- **Liu, Y., Chandrasekaran, V., Anandkumar, A. & Willsky, A. S. (2012).**
  *Feedback message passing for inference in Gaussian graphical models.* IEEE TSP
  60(8); arXiv:1105.1853. Theorem 1, Theorem 2, Prop 1–3, Fig. 5. **The chosen
  method.**
- Giscard, P.-L., Choo, Z., Thwaite, S. J. & Jaksch, D. (2016). *Exact inference
  on Gaussian graphical models of arbitrary topology using path-sums.* JMLR 17.
- Li, B., Su, Q. & Wu, Y.-C. (2019). *Fixed points of Gaussian belief propagation
  and relation to convergence.* IEEE TSP 67(23). **(UNPROVEN — not locatable on
  arXiv; the description in §2 row 7 comes from a second-hand abstract summary and
  must be checked against the paper before it is relied on.)**

Frontier (abstract-checked):

- Ortiz, J., Evans, T. & Davison, A. J. (2021). *A visual introduction to Gaussian
  belief propagation.* arXiv:2107.02308.
- *Learning in deep factor graphs with Gaussian belief propagation.* arXiv:2311.14649
  (2023) — training and prediction both cast as GBP inference; not a variance
  correction.
- *Belief propagation converges to Gaussian distributions in sparsely-connected
  factor graphs.* arXiv:2601.21935 (2026).

## 12. Pointers

- `src/Bayesian/MultilayerBnn.fs` — `tryToFactorGraph`, `sumLinkFactor`,
  `isAcyclicFactorGraph`, `compileJointPrecision`, `tryInvertDeterministic`,
  `FactorGraphExactness`.
- `src/Bayesian/FactorGraph.fs` — `runToFixpoint` (the tree solver FMP reuses).
- `tests/Bayesian.Tests/MultilayerBnn.Tests.fs` — `exactDagMarginals` (the
  independent oracle), MLBNN-28/33/35/42/46.
- `tests/cross-verification/multilayer-bnn-online-update/` — the F#/Python lane
  the new rows extend.
- `src/Core.TypeScript/research/composable-factor-benchmark/crdt-belief-fusion.ts`
  — the canonical-order fold the F# path must mirror (§7.2).
- `docs/PRIOR-ART-LIST.md` §"Loopy Gaussian variance correction" — the anchors
  above, indexed.
- `.claude/rules/local-time-never-enters-the-shared-fold.md` ·
  `numerology-vs-number-theory.md` · `toy-is-free-metered-must-be-earned.md` ·
  `anchor-to-human-prior-art.md`.
