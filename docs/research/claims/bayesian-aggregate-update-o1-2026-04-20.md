# Grandfather-claim discharge: `BetaBernoulli.Observe` is O(1) per observation

**Inventory row:** #1 in
`docs/research/grandfather-claims-inventory-2026-04-21.md`.
**Claim site:** `src/Bayesian/BayesianAggregate.fs:22`
(docstring on `BetaBernoulli`), verbatim:

> Prior `Beta(α, β)`, observe `Bernoulli(p)` → posterior
> `Beta(α + successes, β + failures)`. **O(1) per observation.**

**Date:** 2026-04-20 (round 42 discharge slot, first claim).
**Pipeline stage:** Stage 1 — analytic (Hiroshi, `complexity-
reviewer`). Stage 2 (Daisy, `claims-tester`) deferred to the
post-PR-#31-merge window per the `git-workflow-expert`
speculative-branch fair-game rules (Stage 2 would benchmark
and tighten the docstring under `src/**`).

**Pipeline authority:**
`docs/DECISIONS/2026-04-21-router-coherence-v2.md`. Binding
dispatcher (Kenji) integrates at round-close.

## The implementation under review

```fsharp
member _.Observe(successes: int64, failures: int64) =
    a <- a + double successes
    b <- b + double failures
```

Two IEEE-754 double additions; two field writes on a sealed
class instance. No allocation, no iteration, no I/O, no
synchronisation primitive on the hot path. The operation is
independent of the magnitudes of `successes` and `failures`
(a batched observation window of a billion trials costs the
same as one trial).

## Stage-1 analytic review — five bounds

Per `complexity-reviewer/SKILL.md` §"How he reviews a PR",
every one of these must be named.

### Worst-case bound

**O(1).** Two `double` additions (`fadd` or the integer-to-
double promotion), two field writes to local mutable state
`a` and `b`. Under the uniform-cost RAM model (CLRS §2.2)
each primitive op is unit time; total ≤ 4 ops. The `double`
conversion from `int64` is a hardware primitive (`CVTSI2SD`
on x64, `SCVTF` on AArch64), still unit-time.

### Amortised bound

**O(1), same as worst case.** No deferred work, no rebalancing
trigger, no lazy compaction. Each `Observe` fully completes
its work before returning. Distinction from spine-tier-
merges (inventory row #7): there is no "collapse all levels"
background operation here, so worst-case = amortised.

### Expected bound

**O(1), same as worst case.** The operation is deterministic
in runtime given fixed hardware; the inputs influence the
numerical result (values of `a` and `b`) but not the control
flow. No data-dependent branching, no hash-probe sequences,
no reservoir-sampling reject loops.

### Lower bound

**Ω(1).** Any observation-taking method that durably records
the observation must perform at least one write. The cell-
probe lower bound (Pătrașcu-Thorup) on a mutable-state
update is Ω(1) per update even under adversarial analysis.
The claim is tight: the algorithm matches the lower bound.

### Constant factor

**~4 cycles on modern hardware under cache-resident `this`**:
two `fadd`, two stores to adjacent fields. Under reasonable
assumptions (hot path, cache-resident instance, branch-free
code) the method body compiles to ≤ 6 x64 instructions
including the `ret`. No reflection, no virtual dispatch
(the class is `[<Sealed>]`, so the JIT can devirtualise).

**Zero heap allocation per call.** The `struct` tuple return
shape in `CredibleInterval95` is a separate review; `Observe`
itself returns `unit` and allocates nothing. This matches the
docstring's claim at line 54-55 that credible-interval output
is zero-alloc.

## Caveats worth naming

None of these invalidate the O(1) claim; they are honest
notes about what the claim does *not* cover.

- **Numerical accuracy of repeated `double` addition.** After
  ~2^53 observations the `double` precision saturates and
  further successes round to zero. Not a complexity concern;
  a numerical one. The docstring does not claim unbounded
  accuracy, and a `BigInteger` or Kahan-summation refinement
  is a separate engineering decision.
- **Thread-safety is not the complexity claim.** `Observe` is
  not `Interlocked.Add`-based; concurrent calls can race on
  `a` and `b`. The class has no declared thread-safety
  contract; callers serialise. Again: honest scope, not an
  O-claim correction.
- **`int64 → double` conversion lossy above 2^53.** Values of
  `successes` above that threshold lose integer precision
  before the addition; the addition itself remains O(1).

## Stage-1 output

**Output 1 — claim analytically sound.** Per v2 Stage-1
output 1, hand off to Daisy (Stage 2) with a note naming
the contrary-workload to test.

**Contrary-workload notes for Stage 2:**

- *High-magnitude batched observations* — `Observe(10^18,
  10^18)`: verifies the claim holds when `int64 → double`
  conversion is stressed. Expect O(1) nanoseconds still.
- *High-frequency tight-loop* — 10^9 calls in a row on the
  same instance: verifies cache-resident assumption; expect
  throughput ~10^9 calls/s on typical hardware.
- *Thread-contended case* (noted but *out of the O-claim
  scope*): measure whether a `volatile`-style contention
  mode changes nominal O(1) behaviour — should not, but
  worth a number.

Stage-2 benchmark execution defers to post-merge per the
speculative-branch convention (benchmark runs touch `bench/`
which is fair game, but a docstring-tightening update to
`src/Bayesian/BayesianAggregate.fs` is better bundled with
any other Bayesian-surface edits, not landed piecemeal on a
speculative branch).

## Inventory update

Row #1 in `docs/research/grandfather-claims-inventory-2026-
04-21.md` — Stage-1 cell flips from `pre-ADR` to the state
recorded in the table flip below. Stage-2 cell remains
`pre-ADR / deferred` until Daisy's benchmark lands in a
post-PR-#31-merge round.

## Discharge-cadence bookkeeping

This discharge consumes the round-42 slot of the grandfather
cadence entry at `docs/BACKLOG.md:170-189`. Inventory
remaining: **34** of 35. Expected-empty round under 1-per-
round cadence: round 76. Aarav graceful-degradation clause
(≥3 consecutive rounds without discharge) begins counting
from the *next* round onward.

## Cross-references

- `docs/DECISIONS/2026-04-21-router-coherence-v2.md` —
  pipeline authority (Closure C-P0-1 on grandfather
  cadence).
- `.claude/skills/complexity-reviewer/SKILL.md` — Stage-1
  skill.
- `.claude/skills/claims-tester/SKILL.md` — Stage-2 skill
  (queued).
- `src/Bayesian/BayesianAggregate.fs:22` — the claim.
- `docs/research/grandfather-claims-inventory-2026-04-21.md`
  — the inventory whose row #1 this discharge closes.
