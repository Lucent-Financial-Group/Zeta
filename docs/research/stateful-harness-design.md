# Stateful plugin harness — design draft

**Round:** 28
**Status:** draft (design only; no code landed)
**Scope:** design the test-time harness that verifies
`IStatefulStrictOperator<'TIn,'TState,'TOut>` plugins against
the `RetractionCompletenessLaw` under deterministic simulation.

## Framing: deterministic simulation

The whole point of a plugin-law harness is **deterministic
simulation testing** in the FoundationDB / TigerBeetle sense:
given a seed and an input schedule, the harness replays
bit-exact and a failing trace is reducible to its seed. That
constrains the design up front:

1. **No wall-clock time.** Ticks are integers; the plugin
   never observes `DateTime.UtcNow` via the harness.
2. **All randomness comes from one seeded `System.Random`**
   (or an FsCheck `StdGen`). A plugin that reaches for a new
   `Random()` defeats DST and is a bug — we lint for this
   but cannot statically prevent it.
3. **Tick order is total.** Within a tick, input is fed,
   `StepAsync` runs to completion, output is captured,
   `AfterStepAsync` runs (for strict operators), and the
   next tick proceeds. No concurrent ticks in the harness.
4. **A failing run produces a replay.** On law violation we
   print the seed, the input schedule as a list, and the
   tick index at which the law first broke. Copy-paste into
   the next test run to reproduce.

DST is the lens for *all* the law runners, not just the
stateful one. But stateful-strict is where the lens earns
its keep — non-determinism in a stateful op can mask a
retraction bug for thousands of ticks before failing.

## What `IStatefulStrictOperator` promises

Quoting `src/Core/PluginApi.fs` for the tag:

> the operator carries explicit stateful strict semantics —
> init / step / retract triple. Distinct from
> `IStrictOperator` (feedback-cut): stateful-strict ops hold
> per-key or per-instance state that must retract cleanly
> when a negative weight arrives.

The marker interface today is opaque — a plugin just
inherits `IOperator<'TOut>` under the tag, there is no
exposed `init` / `step` / `retract` triple on the interface
itself. That is a **design gap**: the law cannot fire
against an opaque op. Two options:

### Option A — enrich the interface

Add abstract methods on `IStatefulStrictOperator`:

```fsharp
type IStatefulStrictOperator<'TIn, 'TState, 'TOut> =
    inherit IOperator<'TOut>
    abstract InitState : unit -> 'TState
    abstract Step : state: 'TState * input: 'TIn -> 'TState * 'TOut
    abstract Retract : state: 'TState * input: 'TIn -> 'TState
```

**Pros:** law runner has direct access to the state
transitions, can check `Retract ∘ Step = id` at every tick,
inspect state for invariants, drive FsCheck against `Step`
and `Retract` directly without going through `StepAsync`.

**Cons:** second authoring path — plugin authors now write
`Step` and `Retract` *and* wire `StepAsync` to call them.
The two can drift. Unless `StepAsync` has a default
implementation that calls `Step` — which forces `'TState`
into a mutable field on the op, which is exactly the
shared-state pattern Ilyana pushed back on in round-27.

### Option B — trace the op through `StepAsync`

Keep the marker-interface-only shape. The harness feeds
inputs tick-by-tick through `PluginHarness.runSingleInput`.
To check retraction completeness, the harness runs *two*
traces and compares:

1. **Forward trace:** feed a sequence `A = [a₁; a₂; ...; aₙ]`
   and record outputs `[y₁; y₂; ...; yₙ]`.
2. **Round-trip trace:** feed `A ++ retract(A)` where
   `retract(A)` is the negation of each input as a Z-set
   (weights flipped to their negatives). Record outputs
   `[y₁; ...; yₙ; y'₁; ...; y'ₙ]`.

The **law**: at the end of the round-trip, the cumulative
output Z-set must be zero — i.e. summing `y_i` across all
`2n` ticks is the zero Z-set. If any term remains, the op
leaked state through retraction.

**Pros:** no interface change; works against the existing
marker-only tag; authoring path stays narrow (one
`StepAsync` method).

**Cons:** only observable output is checked, not internal
state. A plugin that retracts cleanly at the boundary but
leaks memory internally (keeps dead state entries forever)
is not caught. That is a separate property — "bounded
state-growth" — and can be a `Watch`-class law under DST
by running for a fixed number of ticks and asserting state
byte-size stays bounded. Covered by a follow-up law, not
`RetractionCompletenessLaw`.

### Recommendation: Option B now, Option A as planned round-29+ work

**Option A is the right long-term direction.** It matches the
DBSP paper's canonical `(σ, λ, ρ)` triple — the same shape
`tools/lean4/Lean4/DbspChainRule.lean` proves against — so
math, Lean proofs, and F# implementation share one shape and
compositional reasoning travels across them. Option A also
unlocks generic WDC checkpointing (pickle `'TState` without
per-op serialisation), planner fusion of adjacent stateful
ops (reuse state buffers, batch step+retract), and sharper
law-failure diagnostics ("state diverged by δ" vs Option B's
"cumulative Z-set wasn't zero").

**Option B is the right first step.** Option A needs real
design work on (1) the async path — `Step : σ * 'TIn * ct
-> ValueTask<σ * 'TOut>` duplicates the sync signature —
and (2) a precise retraction contract (is `Retract(Step(s,
a)) = s` always, or only for linear `a`? Partial retraction
semantics?). Prototyping Option A in a vacuum, without
having run Option B against real plugins, ships a contract
we would almost certainly need to revise. Option B lands
the law runner today against the existing marker interface,
teaches us what retraction actually looks like in practice,
and Option A absorbs those lessons.

**Path forward:**

1. **This round (28):** Option B trace-based
   `checkRetractionCompleteness`. Marker interface stays as
   it is.
2. **Round 29+ — Option A promotion.** Additive interface
   enrichment: `Init` / `Step` / `Retract` become abstract
   methods on `IStatefulStrictOperator`; `StepAsync`
   default-implements by calling `Step` so existing plugins
   keep compiling. The law runner uses the new hooks when
   present, falls back to Option B trace for plugins that
   stay marker-only. Same capability-tagging shape the
   plugin API already uses.
3. **Round 29+ — generic checkpointing.** Once `'TState` is
   in the type signature, WDC can pickle it via FsPickler
   (schema-bound) without per-op `Save`/`Load` code.
4. **Round 30+ — planner fusion.** With `Step`/`Retract`
   exposed, the planner can fuse adjacent stateful ops
   (reuse state buffers, batch step+retract). Out of scope
   until we have data on which op pairs dominate hot paths.

Option B is not throwaway — it remains the fallback for
plugins that genuinely cannot expose `Step`/`Retract`
(black-box ML wrappers, third-party system integrations).

## API sketch

```fsharp
namespace Zeta.Core

module LawRunner =

    /// Deterministic-simulation result. `None` on pass;
    /// `Some` carries enough to reproduce.
    type LawViolation =
        { Seed: int
          Inputs: obj list            // boxed for diagnostic printing
          TickOfFirstBreak: int
          Message: string }

    /// Linearity: `op(a + b) = op(a) + op(b)` and `op(0) = 0`.
    /// Not stateful — single-tick check per sample.
    val checkLinear<'TIn, 'TOut when 'TIn : (static member (+) : 'TIn * 'TIn -> 'TIn)
                                  and 'TOut : (static member (+) : 'TOut * 'TOut -> 'TOut)
                                  and 'TOut : equality>
        : seed: int
        -> samples: int
        -> makeOp: (Stream<'TIn> -> ILinearOperator<'TIn, 'TOut>)
        -> genInput: (System.Random -> 'TIn)
        -> zeroIn: 'TIn
        -> zeroOut: 'TOut
        -> Result<unit, LawViolation>

    /// Retraction completeness (stateful): forward-then-retract
    /// a schedule, assert cumulative output is zero. Option-B
    /// trace approach; no interface enrichment required.
    val checkRetractionCompleteness<'TIn, 'TState, 'TOut>
        : seed: int
        -> samples: int
        -> scheduleLength: int
        -> makeOp: (Stream<ZSet<'TIn>> ->
                    IStatefulStrictOperator<ZSet<'TIn>, 'TState, ZSet<'TOut>>)
        -> genInput: (System.Random -> ZSet<'TIn>)
        -> Result<unit, LawViolation>
```

Notes on the signature:

- **Generators are `System.Random -> 'T`, not FsCheck `Gen<'T>`.**
  Keeps `Zeta.Core` free of FsCheck. Plugin authors wire
  FsCheck in their test project and hand the law runner a
  thin `Random -> 'T` adapter.
- **Seed is explicit.** No hidden clock-seeding. A failing
  run prints the seed; the author pastes it back to
  reproduce.
- **`makeOp` is the factory, same shape as
  `PluginHarness.runSingleInput`.** This means every
  stateful operator already unit-testable via the harness
  is law-runnable with no rewrite.
- **`scheduleLength` bounds the trace.** DST prefers a
  generous upper bound (1000 ticks is cheap) so state
  churn has time to expose leaks; small (say 10) bounds
  produce false-green runs that make the law useless.

## Where it does not fire

**Not at `Circuit.Build()`.** See `docs/PLUGIN-AUTHOR.md`
round-28 rewrite — the law runner is a library consumer
opts-in mechanism, not a gate the scheduler enforces. A
`Circuit.Build()` gate would pay a probabilistic-testing
cost on every construction, slow circuits measurably, and
couple `Zeta.Core` to FsCheck. Plugin authors call
`LawRunner.*` from their test project instead.

The reason for the choice is **not** that Build-time
verification is wrong in principle — it is that the
cheapest reliable form is a test-time check driven by a
DST harness. A future `DebugCircuit.BuildWithLawChecks`
could exist as a slow-path gate for CI-only smoke runs, but
that is round-29+ work and out of scope here.

## Open design questions

1. **Z-set negation helper.** The Option B trace approach
   needs `ZSet<'T>` negation (`-w` on every weight). Is
   there a canonical `ZSet.negate` already, or does the law
   runner synthesize it? (Core grep should answer this
   before implementation.)
2. **Schedule shape.** Uniform random Z-sets per tick vs
   structured schedules (e.g. "insert 100, retract 50,
   insert 100, retract all"). DST orthodoxy favours
   structured schedules over pure uniform for shrinking
   quality — FsCheck's shrinker does not understand the
   semantic of a retraction trace.
3. **Async ops.** Does the stateful harness need to run
   `IAsyncOperator`-tagged stateful ops under a controlled
   scheduler (cooperative `Task.Yield` interleaving)? DST
   orthodoxy says yes — but the first landing should be
   sync-only and flag async as a follow-up.
4. **Per-key vs per-instance state.** "Stateful-strict"
   currently covers both. The law holds for per-instance
   state trivially; per-key state needs the retract-step
   pair to fire on the matching key. The current trace-
   based law treats the op as opaque, so it works for both
   — but means the diagnostic print on a failing per-key
   op will be less actionable. A future option-A
   enrichment would split these cleanly.

## Next steps

- Land `checkLinear` in `src/Core/LawRunner.fs` this round.
  Easiest law, cleanest proof-of-concept. One test in
  `tests/Tests.FSharp/Plugin/LawRunner.Tests.fs` against a
  trivial `id * 2` linear op.
- Land `checkRetractionCompleteness` this round only if
  Option B stays clean end-to-end; otherwise ship the
  design doc and the Linear check, defer stateful to
  round-29. **Explicit acceptance of a partial landing is
  better than a rushed stateful-harness implementation
  that lies about coverage.**
- Retract the `IStatefulStrictOperator` soft-claim in
  `docs/PLUGIN-AUTHOR.md` only when `checkRetractionCompleteness`
  is actually live. A partial landing updates the doc to
  "Linear law live; stateful-strict law in round-29"
  — honest rather than aspirational.
