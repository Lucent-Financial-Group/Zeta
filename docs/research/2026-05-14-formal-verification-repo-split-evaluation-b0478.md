# Formal-verification sub-axis evaluation — per-property-class split vs co-locate decision

**Date:** 2026-05-14
**Author:** Soraya (via Otto proxy)
**Related row:** B-0478

## Purpose
Evaluate whether formal verification artifacts should be co-located with the source code they verify or split into dedicated repositories. The evaluation applies the Axis-3 smell tests (change-rate, rulesets, dependency graph) to 8 distinct classes of FV tools.

## Evaluation Matrix

| Tool class | Co-location arg | Change-rate arg | Ruleset arg | Audience arg | Dep-graph arg | Recommendation |
|------------|----------------|----------------|------------|-------------|--------------|----------------|
| **TLA+** | **Weak.** Specs describe protocol logic at a high level. | **Slower.** Protocols change less often than code. | **Divergent.** TLC model checking can take hours. | Protocol designers, FM researchers. | **Independent.** | **Split** to `Zeta-OpenSpec` |
| **Lean 4** | **Weak.** Proofs of mathematical properties (e.g. DbspChainRule). | **Very Slow.** Math/theorems rarely churn. | **Divergent.** Heavy proof-checking CI needed. | Mathematicians, proof engineers. | **Independent.** | **Split** to `Zeta-OpenSpec` |
| **Z3 / F\*** | **Moderate.** Constraints tied to algorithms, but logically separate. | **Slower.** Invariants change less than implementations. | **Divergent.** SMT solver limits/timeouts differ from unit tests. | Security / verification engineers. | **Independent.** | **Split** to `Zeta-OpenSpec` |
| **FsCheck** | **Strong.** Compiled F# property tests. | **Same.** Tied directly to API churn. | **Same.** Runs within standard `dotnet test`. | Developers. | **Coupled.** Depends on source types. | **Co-locate** |
| **Stryker** | **Weak config, Strong execution.** Must run *on* the code. | **Slower.** Config rarely changes. | **Divergent.** Mutation testing takes hours (nightly run). | Developers. | **Coupled.** Mutates source ASTs. | **Co-locate** |
| **Alloy** | **Weak.** Relational modeling of data structures. | **Slower.** | **Divergent.** SAT solving requires specific runners. | Protocol designers. | **Independent.** | **Split** to `Zeta-OpenSpec` |
| **CodeQL** | **Weak.** Custom `.ql` security queries. | **Slower.** | **Divergent.** Security pipeline distinct from DB compilation. | SecOps, Factory engineers. | **Independent.** | **Split** to `Forge` |
| **Semgrep** | **Weak.** Custom `.yaml` AST pattern rules. | **Faster/Moderate.** New rules added as bugs are found. | **Divergent.** Fast lint pipeline. | SecOps, Factory engineers. | **Independent.** | **Split** to `Forge` |

## Analysis & Rationale

### 1. The `Zeta-OpenSpec` Split (TLA+, Lean 4, Z3, Alloy)
Artifacts produced by these tools do not compile against the F# codebase. They are standalone mathematical models, theorems, or constraint files. 
- **CI Divergence:** The primary smell test fires. Running a TLC model checker or an extensive Lean proof verification can take hours, completely breaking the fast-feedback loop required for `Zeta`'s CI Gate ruleset.
- **Audience:** They serve as the "OpenSpec" documentation (Governance Rule 28) for external researchers and protocol auditors who do not need the implementation details.
- **Decision:** Split these artifacts into a new `LFG/Zeta-OpenSpec` (or similar) repository dedicated to formal specifications.

### 2. The `Forge` Split (CodeQL, Semgrep)
Custom security queries and AST linting rules are factory hygiene tools. 
- **Audience & Ruleset:** They are used to gate the code, but they are not the product itself. They should be managed by the same factory rulesets as the `.claude/skills/`.
- **Decision:** Split from `Zeta` and move to the `Forge` repository alongside other factory tooling.

### 3. The Co-Location Mandate (FsCheck, Stryker.NET)
- **FsCheck:** Pre-decided. Property tests are written in F# and must compile against the exact internal types of the system. Splitting them would create a cyclic dependency nightmare. They run fast enough to exist in standard CI.
- **Stryker.NET:** While the mutation test configuration (`stryker-config.json`) could theoretically live anywhere, the actual execution requires the full source AST to mutate. It must live in the repo it mutates. The execution time divergence is handled via a scheduled nightly GitHub Action rather than a repository split.

## Ambiguous Cases for B-0479 ADR
None. The FV tool classes separate cleanly across the change-rate and ruleset divergence boundaries. The creation of a dedicated `Zeta-OpenSpec` repo cleanly resolves the theorem-prover CI timeline conflicts.
