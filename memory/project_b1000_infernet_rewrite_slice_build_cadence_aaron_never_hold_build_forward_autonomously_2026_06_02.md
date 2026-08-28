---
name: project-b1000-infernet-rewrite-slice-build-cadence
description: "B-1000 Zeta Infer.NET rewrite — slice-by-slice F# build; Aaron's standing \"you never have to hold on me\" = build slices forward autonomously, don't gate each on explicit go"
metadata: 
  node_type: memory
  type: project
  originSessionId: 193dc02b-b7fe-4bd0-8567-7f2e342c589e
---

**B-1000 = the Zeta Infer.NET rewrite** (the framework's long-stated BP/EP inference future-state), being built **slice-by-slice in F#** (Aaron 2026-06-02 "we want to rewrite infer.net completely … this is our reason to start" + "there are papers for everything in f# with formal proofs we can borrow … for cleanroom spec"). MIT clean-room (study dotnet/infer freely); spec from papers-with-proofs (KFL 2001 sum-product, Minka 2001 EP, Winn-Bishop VMP, Bishop PRML conjugacy) → laws become FsCheck/Lean obligations (Soraya). Runs ON the existing substrate: `Semiring`/`ISemiring` (BP = sum-product over a semiring), `NestedCircuit.Fixedpoint` (message-passing-to-convergence = iterate-nested-circuit-to-fixpoint → incremental re-inference on a delta, the differentiator), `BayesianAggregate` conjugates (= closed-form messages).

**Standing authority (Aaron 2026-06-02): "you never have to hold on me."** Build the B-1000 slices **forward autonomously** — the slice plan IS the named work; do NOT gate each slice on an explicit "go." Composes [[dont-ask-permission]] (standing authority; over-asking is the failure mode) + holding-without-named-dependency (the slice plan is the named dependency) + never-be-idle. On autonomous ticks: if the current slice's PR is healthy/armed, **start the next slice** rather than reporting "holds on your go."

**Slice plan (most-inevitable-first):**
1. `Vector` + `Wall` nouns — `src/Core/HexCore.fs` — **MERGED #6587**
2. message algebra (exp-family as generic-math: `One`/`( * )`=product/`( / )`=divide; `Message.marginal`/`cavity` SRTP family-agnostic; constructors fail-fast, operators tolerate improper per EP) — `src/Bayesian/Message.fs` — **MERGED #6589**
3. factor graph (`Factor` prior/equality + `FactorGraph` sum-product `passOnce`/`marginal`) — `src/Bayesian/FactorGraph.fs` — **#6590 armed**
4. **NEXT:** sum-product BP as a DBSP nested circuit (`passOnce` iterated to fixed point via `NestedCircuit`/`Circuit.Fixedpoint`) — read `src/Core/Circuit.fs` + `NestedCircuit.fs` to wire it
5. EP (moment-match projection over the exp-family message algebra)
6. seed CE — the model DSL (wires in slice-1 `Vector`/`Wall`; B-0998); resolves the A/B/C fork (rewrite subsumes all three)
- later: VMP, Gibbs, model compiler, full distribution zoo, benchmark vs dotnet/infer.

**Build discipline that's working:** worktree under `~/.zeta/agents/otto-cli/`; `dotnet build -c Release` 0-warning gate (TreatWarningsAsErrors); F#-native generic-math static members (NOT C# IWSAM interfaces → no FS3535) per [[interfaces-are-the-asset]] / numerical-algebra-into-generic-math; companion `type`+`module` via `[<CompilationRepresentation(ModuleSuffix)>]`; tests cross-checked against `BayesianAggregate` (the referee); slices stack on the prior branch tip then `git rebase --onto origin/main <prev-tip>` once the prior PR merges. Copilot review pattern: verify-before-fix — constructor-validation findings are real; "make EP operators fail-fast" findings are wrong (EP cavities are improper by design).
