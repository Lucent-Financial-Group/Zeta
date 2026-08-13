# What does 253.60 ms mean without a wall clock — and where amplitudes actually live

**Ferried** 2026-08-13 from Aaron, two observations in one message:

> so bounding each in closed form gives 253.60 ms, constant, for all time, no ephemeris — this seems
> weird when we don't have wall clock what does 253.60 ms mean?

> also please try to push those things forward, i think the amplidude stuff comes in only in multi
> agent setups for soicety quarum not inndividual agents they are just softemu shaped i think

---

## Part 1 — the ms question. Short answer: it is a **duration**, not a timestamp.

**CHECKED** against `src/Bayesian/BusRegime.fs`. The conviction rule is:

```
OutOfCone is declared only when   min(RTT)/2 > deadlineMs + δMaxMs
```

with `RttSamplesMs` a bounded window of **round-trip samples**. A round-trip time is measured with
**one** clock: send at `t₀`, receive at `t₁`, `RTT = t₁ − t₀`. Both readings come from the same
oscillator on the same node. **No clock synchronisation is involved, and no two clocks are ever
compared.**

So 253.60 ms is well-formed without a wall clock, and Aaron's instinct that something is off is
pointed at the right place but lands one layer over: the light-cone test consumes *durations*, and a
duration is a local-proper-time interval, not a point on a shared timeline. That is also why
[`local-time-never-enters-the-shared-fold.md`](../../.claude/rules/local-time-never-enters-the-shared-fold.md)
is not violated by the *measurement*: a node's own clock steering a node's own decision is exactly the
permitted use.

But asking the question surfaces two things that are genuinely wrong or unstated.

### Problem 1 — clock **rate** still matters, and the budget has a shelf life of ~845 days

A duration measured on a local oscillator is only as good as that oscillator's rate. The defect record
already carries the figure: Earth–Mars clock-rate divergence (gravitational + kinematic) at
≈3.4 ns/s ≈ **0.3 ms/day secular**.

```
253.60 ms  ÷  0.3 ms/day  ≈  845 days
```

**CHECKED arithmetic; PROPOSED as a consequence:** after roughly 845 days without re-calibration, the
accumulated rate divergence equals the *entire* asymmetry budget the constant is supposed to bound. A
constant advertised as holding "for all time, no ephemeris" therefore has an unstated dependency — not
on the ephemeris, but on a **re-synchronisation cadence**. The correct statement is
"253.60 ms, constant, no ephemeris, given clock-rate calibration at interval T," and T must be named.
845 days is generous, which is exactly why it will be forgotten.

This is the more interesting half of Aaron's question: removing the ephemeris did not remove all
time-dependence; it moved it from *orbital phase* to *oscillator drift*, and only one of those is
currently written down.

### Problem 2 — the **verdict** enters the shared fold, and that is where the rule bites

`Regime` (`InCone` / `OutOfCone` / `Unmeasured`) is not a local action — it becomes **evidence**. So a
locally-measured millisecond quantity produces a value that crosses into the commutative belief fold.

The rule's own litmus: *"if two nodes with different receive-times could fold different sets, local
time has leaked."* Two nodes with different local RTT windows can classify the same message
differently — one `InCone`, one `Unmeasured` — because `RttSamplesMs` is a **local, bounded, 16-sample
window** whose contents depend on that node's own recent traffic.

Mitigations already in the code, and they are real:
- `Unmeasured` is the honest default and *never upgrades to evidence*.
- The conservative direction suppresses true convictions rather than manufacturing false ones.

**OPEN, and worth a proper verification pass rather than a guess here:** does a disagreement between
nodes on `InCone` vs `Unmeasured` change the *folded conclusion*, or only the *rate of convergence*?
If only the latter, the boundary holds and this should be written down as an argument. If the former,
local time has leaked into the shared fold exactly as the rule predicted — and the rule was carved
**before** this code existed precisely so the check could be run against it.

## Part 2 — where amplitudes live. Aaron places the Born boundary, and it resolves the design's open edge.

The design landed in #10419 found that `AmplitudeEmu` and `FactorGraph` are a **category error** to
bridge: `AmplitudeEmu.merge` **sums** amplitudes (distinct paths to one outcome — interference, opposite
phases cancel), while `FactorGraph` combines by **product** (independent evidence about one variable).
`bornProb ∘ ofSoft = id`, but `ofSoft ∘ bornProb` erases every phase — a section/retraction, not an
isomorphism. The design therefore refused to build a converter and kept a one-way Born boundary.

It left open *where* that boundary sits. Aaron places it:

> the amplitude stuff comes in only in multi agent setups for society quorum not individual agents
> they are just softemu shaped

**This is a placement, and it makes the refusal constructive rather than merely defensive:**

| layer | carrier | combines by | meaning |
|---|---|---|---|
| individual agent | `SoftValue` (real, non-negative) | **product** | independent evidence about one variable |
| society / quorum | `AmplitudeEmu.Amp` (complex) | **sum** | distinct paths to one outcome; phases can cancel |

The Born rule is then not a converter between two things that wanted to be the same — it is the
**layer transition**, applied exactly once, on the way out of the quorum.

### Why this placement is load-bearing rather than tidy

It predicts a real semantic difference that the Bayesian layer cannot express, and the difference is
one this repo has already been bitten by. In a Bayesian fold, two correlated agents **double-count** —
that is bug **B3** found during the design work (`SocietyBootstrap` sums precisions with no correlation
term: six agents on one data stream give `precision = 66.0` on a wrong mean). Evidence can only ever
*add*.

In an amplitude fold, two contributions **can cancel**. Destructive interference is available, and
opposite-phase agents annihilate rather than reinforce.

So the amplitude layer is not decoration at the quorum — it is the only layer in which *a quorum can
disagree with itself to zero*. Whether that is the behaviour we want for a quorum is a genuine design
question and should be argued, not assumed: **PROPOSED**, and the honest counter is that a quorum whose
members can silently annihilate each other is also a quorum an adversary can neutralise by supplying an
opposite phase. That is a Sybil-adjacent attack with no analogue in the Bayesian layer, and it must be
priced before amplitudes are given real authority.

### What follows immediately (cheap, from #10419)

The design's cheap-list stands and this placement does not disturb it: `IProductionPrior` into `Sppf`,
inside–outside EM for context-free weights, the marginal → `SoftController.inputSuperposition`
conversion (whose own header already asks for likelihood weights and today returns uniform priors), and
the function-word channel into `DecorrelationExcess`. None of those touch amplitudes — which is itself
evidence for the placement: everything cheap lives at or below the agent, and the amplitude layer is
the one thing that only makes sense above it.

## Pointers

- `src/Bayesian/BusRegime.fs` — the conviction rule and the `δMaxMs` widening
- `docs/design/2026-08-13-factor-graph-soft-value-heterogeneous-bnn-linguistic-seed-bridge.md` (#10419)
- `docs/research/2026-08-13-soraya-light-time-asymmetry-envelope-routing-and-proof.md` (#10418) — where 253.60 ms comes from
- [`local-time-never-enters-the-shared-fold.md`](../../.claude/rules/local-time-never-enters-the-shared-fold.md) — the rule carved before this code, for this check
- Work-items `081KZYK0Q8Z087G0R0010Z2Z2Q`, `081KZYNGQ29087G0R000F5N6H6`
