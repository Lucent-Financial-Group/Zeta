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
/// All checks are **deterministic** given the same seed. A failing
/// run reports the seed and the sample index; re-running with the
/// same seed and `samples >= sampleIndex + 1` reproduces bit-exact.
[<RequireQualifiedAccess>]
module LawRunner =

    /// Reported when a law fails. `Seed` + `SampleIndex` are
    /// enough to reproduce; `Message` describes the specific
    /// failure mode.
    type LawViolation =
        { Seed: int
          SampleIndex: int
          Message: string }

    /// Drive a factory through one fresh op instance per sample
    /// so state cannot leak across samples. Each trace runs on
    /// its own `PluginHarness.runSingleInput` invocation which
    /// also asserts exactly-one-`Publish`-per-tick.
    let private runTrace<'TIn, 'TOut>
        (makeOp: Stream<'TIn> -> IOperator<'TOut>)
        (inputs: 'TIn list)
        : 'TOut list =
        PluginHarness.runSingleInput makeOp inputs

    let private generateTrace<'TIn>
        (rng: System.Random)
        (length: int)
        (genInput: System.Random -> 'TIn)
        : 'TIn list =
        [ for _ in 1 .. length -> genInput rng ]

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
        if samples < 1 then invalidArg "samples" "must be >= 1"
        if scheduleLength < 1 then invalidArg "scheduleLength" "must be >= 1"
        let rng = System.Random(seed)
        let mutable failure : LawViolation option = None
        let mutable i = 0
        while failure.IsNone && i < samples do
            let traceA = generateTrace rng scheduleLength genInput
            let traceB = generateTrace rng scheduleLength genInput
            let traceSum = List.map2 addIn traceA traceB
            let outA = runTrace makeOp traceA
            let outB = runTrace makeOp traceB
            let outSum = runTrace makeOp traceSum
            // Compare elementwise: op(a_t + b_t) == op(a_t) + op(b_t)
            // at every tick t. Short-circuit on first divergence so
            // the reported message points at the offending tick.
            let mutable tick = 0
            let mutable broke = false
            while not broke && tick < scheduleLength do
                let lhs = outSum.[tick]
                let rhs = addOut outA.[tick] outB.[tick]
                if not (equalOut lhs rhs) then
                    failure <-
                        Some { Seed = seed
                               SampleIndex = i
                               Message =
                                 sprintf
                                     "Linearity broke at sample %d, tick %d: \
                                      op(a+b) ≠ op(a) + op(b)."
                                     i tick }
                    broke <- true
                tick <- tick + 1
            i <- i + 1
        match failure with
        | Some v -> Error v
        | None -> Ok ()

    /// Retraction completeness (Option B, trace-based).
    /// Forward-run a generated Z-set trace, then retract each
    /// tick's input in the same order. After the round-trip the
    /// cumulative output Z-set must be empty — any residual
    /// means the operator leaked state through retraction.
    ///
    /// Works against the existing marker `IStatefulStrictOperator`
    /// without interface enrichment (see the design doc for the
    /// Option A follow-up path).
    let checkRetractionCompleteness<'TIn, 'TOut when 'TIn : comparison and 'TOut : comparison>
        (seed: int)
        (samples: int)
        (scheduleLength: int)
        (makeOp: Stream<ZSet<'TIn>> -> IOperator<ZSet<'TOut>>)
        (genInput: System.Random -> ZSet<'TIn>)
        : Result<unit, LawViolation> =
        if samples < 1 then invalidArg "samples" "must be >= 1"
        if scheduleLength < 1 then invalidArg "scheduleLength" "must be >= 1"
        let rng = System.Random(seed)
        let mutable failure : LawViolation option = None
        let mutable i = 0
        while failure.IsNone && i < samples do
            let forward = generateTrace rng scheduleLength genInput
            let retract = forward |> List.map ZSet.neg
            let outputs = runTrace makeOp (forward @ retract)
            let cumulative = outputs |> List.fold ZSet.add ZSet.empty
            if not cumulative.IsEmpty then
                failure <-
                    Some { Seed = seed
                           SampleIndex = i
                           Message =
                             sprintf
                                 "Retraction incomplete at sample %d: after \
                                  forward+retract round-trip of %d ticks, \
                                  cumulative output has %d residual entries."
                                 i scheduleLength cumulative.Count }
            i <- i + 1
        match failure with
        | Some v -> Error v
        | None -> Ok ()
