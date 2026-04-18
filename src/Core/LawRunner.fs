namespace Zeta.Core


/// Deterministic-simulation law runner for plugin operators.
/// Design and rationale live in `docs/research/stateful-harness-design.md`.
///
/// Plugin authors call these checks from their test project —
/// LawRunner is a test-time library, not a `Circuit.Build()` gate.
/// That keeps `Zeta.Core` free of FsCheck; generators are plain
/// `System.Random -> 'T` so authors wire FsCheck (or any other
/// generator) at their end.
///
/// All checks are **deterministic** given the same seed. Each
/// sample uses its own `System.Random(seed + sampleIndex)` so a
/// failing `(seed, sampleIndex)` pair reproduces bit-exact on
/// re-run with any `samples >= sampleIndex + 1` — sample N does
/// not depend on whether earlier samples failed fast.
///
/// `checkRetractionCompleteness` uses the **state-restoration
/// via continuation** formulation: feed a forward trace, then
/// its retraction, then a continuation; compare continuation
/// outputs to a fresh-op run of the continuation alone. Any
/// divergence means the op's internal state survived what was
/// supposed to be a full cancel. This catches stateful ops that
/// mistag themselves as retraction-clean (Option B per the
/// design doc; Option A enrichment — `Init`/`Step`/`Retract`
/// triple — is round-29+ work).
///
/// `'TState` on `IStatefulStrictOperator` is unused by the
/// trace-based law — the check runs through `StepAsync` and
/// never inspects state. Tests pass `unit` for this parameter.
[<RequireQualifiedAccess>]
module LawRunner =

    /// Reported when a law fails or a check cannot run.
    /// `Seed` + `SampleIndex` are enough to reproduce via a
    /// fresh `checkX` call on the same seed; `Message` describes
    /// the specific failure mode.
    type LawViolation =
        { Seed: int
          SampleIndex: int
          Message: string }

    /// Bad arguments surface as `Error` rather than exceptions
    /// so every public entry returns a `Result` — CLAUDE.md's
    /// result-over-exception rule.
    let private badArgs (seed: int) (message: string) : LawViolation =
        { Seed = seed; SampleIndex = -1; Message = message }

    let private generateTrace<'TIn>
        (rng: System.Random)
        (length: int)
        (genInput: System.Random -> 'TIn)
        : 'TIn list =
        [ for _ in 1 .. length -> genInput rng ]

    /// Shared sample-loop shape used by every law. Each sample
    /// gets a fresh `System.Random(seed + i)` so reproducibility
    /// is per-sample, not whole-loop. `check` returns `None` on
    /// pass and `Some message` on failure; the framer wraps it
    /// as a `LawViolation`.
    let private runSamples
        (seed: int)
        (samples: int)
        (check: System.Random -> int -> string option)
        : Result<unit, LawViolation> =
        let mutable failure : LawViolation option = None
        let mutable i = 0
        while failure.IsNone && i < samples do
            let rng = System.Random(seed + i)
            match check rng i with
            | Some msg ->
                failure <- Some { Seed = seed; SampleIndex = i; Message = msg }
            | None -> ()
            i <- i + 1
        match failure with
        | Some v -> Error v
        | None -> Ok ()

    /// Linearity: for every trace pair `(A, B)`, the output
    /// trace on `A + B` (elementwise) must equal the elementwise
    /// sum of the output traces on `A` and `B`.
    ///
    /// - `samples` — number of (A, B) pairs to test.
    /// - `scheduleLength` — ticks per trace. DST prefers a
    ///   generous bound (tens to low hundreds) so stateful
    ///   linear ops (e.g. integration) have time to expose
    ///   drift.
    /// - `addIn` / `addOut` / `equalOut` — user-supplied so
    ///   this works for both `ZSet<'T>` (via `ZSet.add`) and
    ///   plain numeric types. Equality is explicit for the same
    ///   reason — `ZSet<'T>` structural equality is not always
    ///   cheap, so the caller chooses.
    let checkLinear<'TIn, 'TOut>
        (seed: int)
        (samples: int)
        (scheduleLength: int)
        (makeOp: Stream<'TIn> -> IOperator<'TOut>)
        (genInput: System.Random -> 'TIn)
        (addIn: 'TIn -> 'TIn -> 'TIn)
        (addOut: 'TOut -> 'TOut -> 'TOut)
        (equalOut: 'TOut -> 'TOut -> bool)
        : Result<unit, LawViolation> =
        if samples < 1 then
            Error (badArgs seed "samples must be >= 1")
        elif scheduleLength < 1 then
            Error (badArgs seed "scheduleLength must be >= 1")
        else
            runSamples seed samples (fun rng i ->
                let traceA = generateTrace rng scheduleLength genInput
                let traceB = generateTrace rng scheduleLength genInput
                let traceSum = List.map2 addIn traceA traceB
                // Convert outputs to arrays once — tick indexing
                // is O(n) on `List.item`, so a List scan would
                // be O(scheduleLength²) per sample.
                let outA = PluginHarness.runSingleInput makeOp traceA |> List.toArray
                let outB = PluginHarness.runSingleInput makeOp traceB |> List.toArray
                let outSum = PluginHarness.runSingleInput makeOp traceSum |> List.toArray
                let mutable result = None
                let mutable tick = 0
                while result.IsNone && tick < scheduleLength do
                    let lhs = outSum.[tick]
                    let rhs = addOut outA.[tick] outB.[tick]
                    if not (equalOut lhs rhs) then
                        result <-
                            Some (sprintf
                                     "Linearity broke at sample %d, tick %d: \
                                      op(a+b) != op(a) + op(b)."
                                     i tick)
                    tick <- tick + 1
                result)

    /// Retraction completeness via state restoration.
    /// A forward trace of random Z-sets is cancelled by its
    /// elementwise negation; a continuation trace is then fed
    /// to the same op instance, and the continuation outputs
    /// are compared to a fresh-op run of the continuation
    /// alone. Any divergence means state survived the cancel.
    ///
    /// The earlier "cumulative output = 0" formulation was
    /// rejected in review: it passes trivially for empty-emitting
    /// ops, it is not the correct law for stateful-strict ops
    /// whose outputs are not themselves cancelling (e.g.
    /// integration-shaped aggregates), and a pathological op
    /// can trivially satisfy it while leaking state. State
    /// restoration is the law the tag actually promises.
    let checkRetractionCompleteness<'TIn, 'TOut when 'TIn : comparison and 'TOut : comparison>
        (seed: int)
        (samples: int)
        (scheduleLength: int)
        (continuationLength: int)
        (makeOp: Stream<ZSet<'TIn>> -> IOperator<ZSet<'TOut>>)
        (genInput: System.Random -> ZSet<'TIn>)
        : Result<unit, LawViolation> =
        if samples < 1 then
            Error (badArgs seed "samples must be >= 1")
        elif scheduleLength < 1 then
            Error (badArgs seed "scheduleLength must be >= 1")
        elif continuationLength < 1 then
            Error (badArgs seed "continuationLength must be >= 1")
        else
            runSamples seed samples (fun rng i ->
                let forward = generateTrace rng scheduleLength genInput
                let retract = forward |> List.map ZSet.neg
                let continuation = generateTrace rng continuationLength genInput
                let fullTrace = forward @ retract @ continuation
                let outFull =
                    PluginHarness.runSingleInput makeOp fullTrace
                    |> List.toArray
                let outFresh =
                    PluginHarness.runSingleInput makeOp continuation
                    |> List.toArray
                let prefix = scheduleLength + scheduleLength
                let mutable result = None
                let mutable tick = 0
                while result.IsNone && tick < continuationLength do
                    let afterCancel = outFull.[prefix + tick]
                    let fresh = outFresh.[tick]
                    let diff = ZSet.add afterCancel (ZSet.neg fresh)
                    if not diff.IsEmpty then
                        result <-
                            Some (sprintf
                                     "Retraction incomplete at sample %d, \
                                      continuation tick %d: state survived the \
                                      forward+retract cancel (diff has %d \
                                      residual entries)."
                                     i tick diff.Count)
                    tick <- tick + 1
                result)
