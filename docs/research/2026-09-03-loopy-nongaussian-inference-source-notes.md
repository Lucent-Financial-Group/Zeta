# Loopy and Non-Gaussian Inference: Source Notes Before Contract

**Status:** Source notes only. They do not change production inference semantics or establish a non-Gaussian capability.

## Decision-relevant evidence

| Method | What the source supports | Load-bearing limitation |
|---|---|---|
| Gaussian BP on a tree | Exact means and variances after finite message propagation. | It does not make an arbitrary loopy graph exact. [1] |
| Converged Gaussian loopy BP | Exact posterior means under the Gaussian conditions analyzed by Weiss and Freeman. | Marginal covariance estimates are generally incorrect. [1] |
| Exact Gaussian path sums / direct solve | Exact Gaussian marginal covariance for finite arbitrary topology when the information matrix is positive definite. Direct dense inversion costs cubic time; path sums are an alternative representation, not a free universal speedup. [2] | Requires a correctly constructed positive-definite Gaussian information model; it does not cover non-Gaussian factors. |
| Orbit / loop correction | Missing non-backtracking loop contributions can correct a GaBP determinant estimate under walk-summability, with a truncated approximation and stated error bound. [3] | This source concerns determinant and related loop contributions, not an implementation-ready arbitrary marginal-variance fix for Zeta’s generic factor API. |
| Gaussian ensemble BP | Local low-rank Gaussian messages estimated from ensembles can treat nonlinear black-box generative processes more flexibly than local linearisation, with complexity tied to ensemble rank rather than full state dimension. [4] | It is still a Gaussian moment approximation and needs a separately declared sampling, seeding, rank, and calibration protocol. |
| Sparse non-Gaussian Gaussianisation preprint | A 2026 preprint derives Gaussian convergence of BP beliefs under finite-moment, Lindeberg, low-degree, shift-invariant, and sparse fixed-topology assumptions. [5] | Those conditions exclude dominant local factors and do not establish Zeta-wide non-Gaussian accuracy; the source remains a preprint. |
| Expectation propagation | EP iteratively removes a site, combines a cavity with the exact factor, and projects back into a chosen approximating family by moment matching. [6] | The approximation family and projection schedule are design choices; finite ADF is order-sensitive, so canonical query ordering and permutation controls are mandatory here. |

## Narrow recommendation

For the existing **declared linear-Gaussian `MultilayerBnn`**, first add a bounded exact-dense information-form query rather than attempting a generic loop correction or claiming non-Gaussian support. The compiler already knows each layer’s prior, observation variance, and declared parent indices, so it can build one finite joint precision matrix, reject non-positive-definite systems, and report exact marginal means and variances for cycles or shared-parent structures at `O(n³)` time and `O(n²)` memory. It remains a **query** over canonical evidence, not a CRDT merge.

For future non-Gaussian factors, first freeze a separate EP or ensemble-message contract. It must define factor family, deterministic content-addressed seed derivation if sampling is used, canonical site schedule, damping/termination, divergence refusal, held-out calibration, order and duplicate controls, and a direct comparison with the exact Gaussian query on the overlap case. No generic “non-Gaussian solved” claim is warranted by these sources.

## References

[1] [Weiss and Freeman, *Correctness of Belief Propagation in Gaussian Graphical Models of Arbitrary Topology*, NeurIPS 1999](https://proceedings.neurips.cc/paper_files/paper/1999/hash/10c272d06794d3e5785d5e7c5356e9ff-Abstract.html).

[2] [Giscard et al., *Exact Inference on Gaussian Graphical Models of Arbitrary Topology using Path-Sums*, JMLR 2016](https://www.jmlr.org/papers/volume17/14-445/14-445.pdf).

[3] [Johnson, Chernyak, and Chertkov, *Orbit-Product Representation and Correction of Gaussian Belief Propagation*, 2009](https://arxiv.org/html/0904.3769v5).

[4] [MacKinlay et al., *Gaussian Ensemble Belief Propagation for Efficient Inference in High-Dimensional, Black-box Systems*, arXiv:2402.08193v7, 2025](https://arxiv.org/html/2402.08193v7).

[5] [Yates et al., *Belief Propagation Converges to Gaussian Distributions in Sparsely-Connected Factor Graphs*, arXiv:2601.21935v1, 2026 preprint](https://arxiv.org/html/2601.21935v1).

[6] [Sutton, *Expectation Propagation in Factor Graphs: A Tutorial*, 2005 draft](https://homepages.inf.ed.ac.uk/csutton/publications/ep-tutorial.pdf).
