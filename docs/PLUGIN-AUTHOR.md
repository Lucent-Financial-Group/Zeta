# Writing a Zeta plugin operator

This doc is aimed at external plugin authors — contributors
at downstream projects who pick up Zeta as a NuGet dependency
and want to write custom operators. If you are contributing
to Zeta itself, read `CONTRIBUTING.md` instead.

## Mental model in one page

Zeta circuits are DAGs of **operators** that advance one
tick at a time. Each tick, every operator reads its
declared inputs, computes, and publishes a single output.
Plugin operators follow the same rules as Zeta's own
operators — the only difference is that your code lives
outside the `Zeta.Core` assembly and talks to the scheduler
through a narrow public interface.

Every plugin operator is one of five shapes, determined by
which **capability interface** you implement on top of
`IOperator<'TOut>`:

Two axes of capability — **algebra** and **scheduler** —
are independent. Pick one algebra tag; add scheduler tags
only when your operator genuinely needs them.

**Algebra capability** (mutually exclusive — pick one):

| Capability | What it means | Algebra rule |
|---|---|---|
| `ILinearOperator<'TIn,'TOut>` | Linear map: `op(a+b) = op(a)+op(b)`; `op(0) = 0` | Retraction-native |
| `IBilinearOperator<'TIn1,'TIn2,'TOut>` | Bilinear in both inputs (e.g. join) | Algebra generates the `^Δ` form |
| `IStatefulStrictOperator<'TIn,'TState,'TOut>` | Explicit init/step/retract state triple | State must retract cleanly |
| `ISinkOperator<'TIn,'TOut>` | Terminal, non-Z-set output, may be retraction-lossy | **Exempt from composition** — terminal edges only |
| *(none)* — plain `IOperator<'TOut>` | Unconstrained; assert nothing | Terminal edges only |

**Scheduler capability** (orthogonal — add as needed):

| Capability | What it means |
|---|---|
| `IStrictOperator<'TOut>` | Feedback-cut (z⁻¹-style). Publish delayed state in `StepAsync`; capture current input in `AfterStepAsync` |
| `IAsyncOperator` | Operator issues genuinely asynchronous work (disk I/O, network); opts into the scheduler's slow async state-machine path |
| `INestedFixpointParticipant` | Operator participates in a nested fixed-point scope |

Pick the **strongest** algebra tag that honestly describes
your operator. Lying (claiming Linear when you are not) is
caught by `Zeta.Core.LawRunner` — a deterministic-simulation
law runner that plugin authors call from their test project.
Run `LawRunner.checkLinear` against an `ILinearOperator` and
`LawRunner.checkRetractionCompleteness` against an
`IStatefulStrictOperator`; both take a seed so failures
reproduce bit-exact. See **Verifying your plugin's
algebra tag** below.

## The canonical example

`src/Bayesian/BayesianAggregate.fs` ships `BayesianRate`, a
`Beta-Bernoulli` posterior over a stream of boolean
observations. It is **retraction-lossy by design** — a `+1`
followed by a `-1` in the input Z-set does not
un-accumulate the posterior's state — so it declares
`ISinkOperator<ZSet<bool>, struct(double * double * double)>`
and the algebra consciously exempts it from composing with
relational operators.

Read that file as the template for a new sink plugin.

## Minimum viable plugin — five-line skeleton

```fsharp
open Zeta.Core

type MyOp(input: Stream<int>) =
    let deps = [| input.AsDependency() |]
    interface IOperator<int> with
        member _.Name = "my-op"
        member _.ReadDependencies = deps
        member _.StepAsync(out, _ct) =
            out.Publish (input.Current * 2)
            System.Threading.Tasks.ValueTask.CompletedTask

[<System.Runtime.CompilerServices.Extension>]
type MyExtensions =
    [<System.Runtime.CompilerServices.Extension>]
    static member MyOp(c: Circuit, input: Stream<int>) =
        c.RegisterStream (MyOp(input))
```

If the op is linear (and this one is — doubling is linear),
replace `IOperator<int>` with
`ILinearOperator<int, int>` so the algebra layer can use it
in incremental composition.

## The four rules

1. **`Name` is a label, not identity.** Use it for
   diagnostics. Two ops may share a name; the scheduler
   tracks identity by registration order.
2. **`ReadDependencies` is authoritative.** Every stream
   you read inside `StepAsync` must appear in
   `ReadDependencies`. An undeclared read returns the
   previous tick's value; an over-declared read adds a
   useless schedule edge but is not a bug.
3. **Call `output.Publish` exactly once per `StepAsync`.**
   Zero publishes means consumers see
   `Unchecked.defaultof<'TOut>` that tick (almost always a
   bug); two publishes means the last wins (always a bug).
4. **Synchronous ops return `ValueTask.CompletedTask`.**
   If your op issues async I/O, also implement
   `IAsyncOperator` with `IsAsync = true`; the scheduler
   then wraps your op in a state machine. Default is the
   fast sync path; opt in to async explicitly.

## Verifying your plugin without a circuit

Every plugin operator can be exercised via
`Zeta.Core.PluginHarness.runSingleInput` without building
a full `Circuit`. The harness:

- Feeds a sequence of inputs tick by tick.
- Calls your `StepAsync` with a mock `OutputBuffer`.
- Asserts `Publish` is called exactly once per tick.
- Returns the sequence of outputs for assertion.

```fsharp
open Zeta.Core

let outputs =
    PluginHarness.runSingleInput
        (fun input -> MyOp(input) :> IOperator<int>)
        [ 1; 2; 3 ]
// outputs = [ 2; 4; 6 ]
```

Use it in unit tests. `Tests.FSharp/Plugin/*.Tests.fs` has
more examples.

## Verifying your plugin's algebra tag

`Zeta.Core.LawRunner` is the test-time harness that verifies
your algebra tag is honest. It runs under deterministic
simulation: given a seed and a schedule length, a failing
run prints enough to reproduce bit-exact.

```fsharp
open Zeta.Core

let result =
    LawRunner.checkLinear
        42      // seed — reproduces the exact trace on failure
        20      // samples (a, b) trace pairs
        8       // ticks per trace
        (fun input -> MyLinearOp input :> IOperator<int>)
        (fun rng -> rng.Next(-100, 101))   // genInput
        (+)                                 // addIn
        (+)                                 // addOut
        (=)                                 // equalOut

match result with
| Ok () -> ()
| Error v -> failwithf "Linearity broke: %A" v
```

`checkRetractionCompleteness` works against
`IStatefulStrictOperator<ZSet<'TIn>, _, ZSet<'TOut>>`:
it forward-runs a random Z-set trace, retracts each tick
in the same order, and asserts the cumulative output Z-set
is empty. Any residual means the operator leaked state
through retraction.

```fsharp
let result =
    LawRunner.checkRetractionCompleteness
        7 15 6
        (fun input -> MyStatefulOp input :> IOperator<ZSet<int>>)
        (fun rng -> ZSet.ofSeq [ rng.Next(0,5), int64 (rng.Next(-3,4)) ])
```

Bilinear and sink-terminal law runners are round-29+ work —
see `docs/research/stateful-harness-design.md` for the
sequenced plan.

## What you cannot do

- **You cannot mutate another operator's output.** The
  `.Value` setter on the internal scheduler type is not
  part of the plugin surface. Your only write channel is
  the `OutputBuffer<'TOut>` handed to your `StepAsync`.
- **You cannot read future stream values.** Zeta's algebra
  is point-wise causal. You see the current tick's input
  or (via a `z^-1` delay) the previous tick's input. No
  look-ahead.
- **You cannot schedule your own ticks.** The `Circuit`
  drives ticks; plugins only respond.
- **You cannot bypass retraction.** Linear and bilinear
  tagged operators must correctly un-accumulate a negative
  weight; the `RetractionCompletenessLaw` checks this at
  `Circuit.Build()`. If your operator cannot retract
  cleanly, declare `ISinkOperator` — which tells Zeta to
  keep you at terminal edges only.

## Known limits

Safe-to-ship caveats — each is tracked in `docs/DEBT.md`
with a target round.

- **Law coverage.** `LawRunner.checkLinear` and
  `LawRunner.checkRetractionCompleteness` (Option B, trace-
  based) are live. `checkBilinear` and `checkSinkTerminal`
  are round-29+ work. An Option-A promotion of
  `IStatefulStrictOperator` to an explicit `Init` / `Step` /
  `Retract` triple (matching the DBSP paper's `(σ, λ, ρ)`
  shape) is also scheduled — see
  `docs/research/stateful-harness-design.md`.
- **`PluginHarness.runSingleInput` asserts exactly-one-
  `Publish`-per-tick**, but the production `Circuit` path
  currently does not. An op that forgets to call `Publish`
  leaves consumers reading the previous tick's value; one
  that calls it twice writes last-wins. The harness is the
  enforcement surface until a `Circuit.Build()` check lands.
- **`OutputBuffer<'TOut>` captured outside `StepAsync` is
  undefined behaviour.** Don't stash the buffer in a field
  or pass it to another thread to call `Publish` later. A
  tick-stamped guard is tracked as DEBT.
- **`dotnet new zeta-plugin` scaffolding template** is
  still pending. Until it exists, start from the Bayesian
  example in `src/Bayesian/BayesianAggregate.fs`.
- **Multi-input operators** beyond one-input and two-input
  shapes need a custom `IOperator<'TOut>` with a longer
  `ReadDependencies` array; there's no generic N-input
  capability tag. Open an issue if you need this.

## Getting help

- Check the Bayesian example for patterns.
- `docs/research/plugin-api-design.md` has the full design
  rationale — why the shape is what it is.
- Zeta's `public-api-designer` reviews every public surface
  change; if your plugin needs something that doesn't
  exist, file an issue and we'll design it with Ilyana's
  review cycle.
