module Zeta.Tests.ClisVerbsTests

// The first type-check the `clis/` verb family has ever had.
//
// Aaron 2026-08-17: *"clis/Verbs.fs this is our ultimate dogfood surface plus our universal
// interfaces"* — which settles the open question in
// `docs/research/2026-08-17-sim-as-the-room-runner-*.md` §10 Q1 (compile it, or retire it?) in favour
// of **compile it**, and makes the measured facts worse rather than better: until
// 081M08VM385087G0R001DTM0K6 the folder was named by no `.fsproj` and no `.sln`, so the surface
// everything else is meant to conform to had never been read by a compiler.
//
// ## What this file is, and what it deliberately is NOT
//
// It is a **composition witness**. Adding `Verbs.fs` to a project proves almost nothing on its own —
// a file of `interface end` declarations compiles trivially, and a check that cannot fail is not a
// check. What has bite is *using* the members: writing the calls forces every declared signature to
// be inhabitable and pipeable, so a signature change breaks the build here.
//
// It is **not** an implementation of the verb family. Per
// `.claude/rules/interfaces-free-classes-earned-under-rules.md`, `clis/Verbs.fs` being pure
// interfaces is correct by the rule, not a defect — interfaces are free and weight-free; a concrete
// class must be earned. The inhabitants below are object expressions in a test file (no class is
// earned) and they carry **no semantics**: every verb returns a fresh opaque marker. They witness
// that the shapes can be inhabited. They claim nothing about what a real `sim` should do.
//
// ## The two composition breaks, measured (not inferred)
//
// The family's own header documents the loop as `sim |> mea |> cut`. It does not typecheck, for two
// **independent** reasons — each reproduced against the real compiler before this file was written:
//
//   BREAK A — nothing produces the value `mea` consumes.
//     `ISimVerb.Sim: ISeed * TimeSpan -> unit` and `IMeaVerb.Mea<'a>: IEffects * ISim<'a> -> _`.
//     Probe `cli.Sim(seed, d) |> fun s -> cli.Mea(effects, s)` yields:
//       error FS0001: The type 'unit' is not compatible with the type 'ISim<'a>'
//
//   BREAK B — `cut` does not consume what `mea` produces, GIVEN an `ISim` from anywhere.
//     `ICutVerb.Cut<'a>: TimeSpan * ISim<'a> -> IDelta<'a> * ISeam` takes the **sim**, not the
//     measurement. Probe `cli.Mea(effects, s) |> fun m -> cli.Cut(at, m)` yields:
//       error FS0001: The type 'IMeasurement' is not compatible with the type 'ISim<'a>'
//     So fixing BREAK A alone would not make the documented pipe compose. This break was not
//     previously on file.
//
// Both are left **unfixed on purpose**. Choosing what `Sim` returns decides the semantics of the
// universal interface everything must conform to, and the docstring's *"produces NO output (void);
// identity comes from the void"* is a deliberate statement, not an oversight. That is Aaron's call,
// not the shadow's — see the open question restated at the end of this file. What is shipped here is
// the surface **compiled**, with the gap made legible in a type signature rather than in prose.

open System
open global.Xunit
open Zeta.Clis

// ── Inhabitants: object expressions, no class earned, no semantics claimed ────────────────────────

let private aSeed: ISeed = { new ISeed }
let private anEffects: IEffects = { new IEffects }
let private aSim<'a> () : ISim<'a> = { new ISim<'a> }

/// A verb family whose every member returns a fresh opaque marker. Its only claim is that the six
/// declared signatures are simultaneously inhabitable by one value — which is what `ICli` asserts
/// and what nothing had ever checked.
let private cli: ICli =
    { new ICli with
        member _.Gen<'a>(_generator: 'a) : ISim<'a> = { new ISim<'a> }

        member _.Sim(_seed: ISeed, _duration: TimeSpan) : unit = ()

        member _.Mea<'a>(_effects: IEffects, _sim: ISim<'a>) : IMeasurement = { new IMeasurement }

        member _.Cut<'a>(_at: TimeSpan, _sim: ISim<'a>) : IDelta<'a> * ISeam =
            ({ new IDelta<'a> }, { new ISeam })

        member _.Ben<'a>(_effects: IEffects, _sim: ISim<'a>) : IBenchmark = { new IBenchmark }

        member _.Cla<'a>(_sim: ISim<'a>) : IClassLabel = { new IClassLabel }

        member _.Res<'a>(_effects: IEffects, _sim: ISim<'a>) : IMeasurement = { new IMeasurement } }

/// The braid / soft-topology sub-family, likewise inhabited without semantics.
let private braidCli: IBraidCli =
    { new IBraidCli with
        member _.Tie<'a>(_a: ISim<'a>, _b: ISim<'a>) : ISoftTie<'a> = { new ISoftTie<'a> }

        member _.Braid<'a>(_strands: ISim<'a> list) : IBraid<'a> = { new IBraid<'a> }

        member _.Weave<'a>(_braid: IBraid<'a>) : IWeave<'a> = { new IWeave<'a> }

        member _.Bob<'a>(_at: int, _weave: IWeave<'a>) : IDelta<'a> * ISeam =
            ({ new IDelta<'a> }, { new ISeam }) }

// ── The core loop, written the only way it currently can be ──────────────────────────────────────

/// `sim |> mea |> cut`, parameterised on **the arrow the family does not provide**.
///
/// `produceSim` is BREAK A stated as a type rather than as a comment: nothing in `ICli` has this
/// shape, so the caller must supply it. Making the gap a parameter is the honest move — it neither
/// guesses a return type for `Sim` nor pretends the loop composes.
///
/// Note the body also encodes BREAK B: `mea` and `cut` are applied to the **same sim**, side by
/// side, because `cut` cannot take `mea`'s output. Whether that fan-out is the intended reading (all
/// verbs decorate the sim) or whether the pipe was meant literally (data flows verb to verb) is
/// exactly the semantics question left open.
let documentedLoop
    (family: ICli)
    (effects: IEffects)
    (at: TimeSpan)
    (generator: 'a)
    (seed: ISeed)
    (duration: TimeSpan)
    : IMeasurement * IDelta<'a> * ISeam =
    // `Sim` returns unit — the run is an effect, not a value the rest of the loop can reach.
    // That is unchanged and deliberate (it is the CLI invocation).
    family.Sim(seed, duration)
    // BREAK A IS CLOSED (2026-09-05). This line used to be an out-of-band `produceSim` parameter
    // threaded in from the caller, because the family declared no way to make the first value. It
    // now comes from the family itself.
    let s = family.Gen(generator)
    let measurement = family.Mea(effects, s)
    let delta, seam = family.Cut(at, s)
    measurement, delta, seam

/// The benchmark loop the header documents as `cut mea ben sim` — same shape, same gap: `ben`,
/// `mea` and `cut` all consume the sim, none consumes another's output.
let benchLoop
    (family: ICli)
    (effects: IEffects)
    (at: TimeSpan)
    (s: ISim<'a>)
    : IBenchmark * IMeasurement * (IDelta<'a> * ISeam) =
    family.Ben(effects, s), family.Mea(effects, s), family.Cut(at, s)

// ── The braid sub-family, which DOES compose end to end ──────────────────────────────────────────

/// `braid |> weave |> bob` — a genuine three-verb pipe with no missing arrow: `Braid` produces the
/// `IBraid` that `Weave` consumes, and `Weave` produces the `IWeave` that `Bob` consumes.
///
/// This is the neutral fact worth recording next to the two breaks: the *later* sub-family
/// (2026-06-10) is composable as declared, and the *core* family is not. The defect is local to the
/// five-verb core, not to the pure-interface style.
let braidLoop (family: IBraidCli) (n: int) (strands: ISim<'a> list) : IDelta<'a> * ISeam =
    strands |> family.Braid |> family.Weave |> (fun w -> family.Bob(n, w))

// ── Tests ────────────────────────────────────────────────────────────────────────────────────────

[<Fact>]
let ``the five-verb core family is inhabitable — all six members at once`` () =
    // `ICli` inherits six verb interfaces. That one value can satisfy all six simultaneously is an
    // assertion the surface makes and nothing had checked.
    let s = aSim<int> ()
    Assert.NotNull(box cli)
    cli.Sim(aSeed, TimeSpan.FromSeconds 30.0)
    Assert.NotNull(box (cli.Mea(anEffects, s)))
    Assert.NotNull(box (cli.Cut(TimeSpan.FromSeconds 30.0, s)))
    Assert.NotNull(box (cli.Ben(anEffects, s)))
    Assert.NotNull(box (cli.Cla s))
    Assert.NotNull(box (cli.Res(anEffects, s)))

[<Fact>]
let ``cut's residue is a Z-set delta AND a sticky-end seam`` () =
    // The header calls the residue "a Z-set delta + a sticky-end seam (re-ligated to main)". The
    // pair-ness is the checkable part of that sentence; the Z-set-ness is not, because `IDelta<'a>`
    // is `interface end` while `src/Core/ZSet.fs` holds the real Z-set. That divergence is recorded
    // in the research doc, not resolved here.
    let delta, seam = cli.Cut(TimeSpan.FromSeconds 30.0, aSim<string> ())
    Assert.NotNull(box delta)
    Assert.NotNull(box seam)

[<Fact>]
let ``the documented core loop now starts from the family's own introduction form`` () =
    // WAS: "the documented core loop needs an arrow the family does not declare". The arrow was
    // `produceSim`, a function parameter the harness passed in because the family could not make
    // the first value. The prediction written beside it was exact — *"if `ISimVerb.Sim` ever
    // returns that value, this parameter disappears and the change is a one-line diff at this call
    // site"*. It disappeared on 2026-09-05, and the diff is this line: the resolution was
    // `IGenVerb.Gen`, a separate introduction form, rather than changing `Sim`'s return type.
    //
    // BREAK B IS STILL HERE and is still executed by `documentedLoop`: `mea` and `cut` are applied
    // to the SAME sim, side by side, because `cut` cannot take `mea`'s output. Whether that is a
    // defect or the intended fan-out is the semantics question this change deliberately does not
    // answer.
    let measurement, delta, seam =
        documentedLoop cli anEffects (TimeSpan.FromSeconds 30.0) 42 aSeed (TimeSpan.FromSeconds 30.0)

    Assert.NotNull(box measurement)
    Assert.NotNull(box delta)
    Assert.NotNull(box seam)

[<Fact>]
let ``the benchmark loop's three verbs all consume the sim, not each other`` () =
    let bench, measurement, (delta, seam) = benchLoop cli anEffects (TimeSpan.FromSeconds 30.0) (aSim<int> ())
    Assert.NotNull(box bench)
    Assert.NotNull(box measurement)
    Assert.NotNull(box delta)
    Assert.NotNull(box seam)

[<Fact>]
let ``the braid sub-family composes as a genuine pipe — braid then weave then bob`` () =
    // The positive result. No parameterised gap: this pipe is written with `|>` end to end.
    let delta, seam = braidLoop braidCli 4 [ aSim<int> (); aSim<int> (); aSim<int> () ]
    Assert.NotNull(box delta)
    Assert.NotNull(box seam)

[<Fact>]
let ``the family declares BOTH eliminators and an introduction form for ISim`` () =
    // The sharpest *mechanical* statement of BREAK A, and the one that survives every reading of the
    // semantics: reflect over every interface the surface declares and split its members by where
    // `ISim<_>` appears. Several consume it; none returns it. An interface family with eliminators
    // and no introduction form is uninhabitable as a pipeline by construction — no amount of
    // implementation effort produces the first value.
    //
    // REVISITED 2026-09-05, exactly as this comment required. It used to assert
    // `Assert.Empty producers` and read: *"the day an introduction form is added (in whatever shape
    // Aaron chooses), `producers` stops being empty and this test fails — which is exactly the
    // moment the gap closes and this file must be revisited."* The form was added
    // (`IGenVerb.Gen<'a>: 'a -> ISim<'a>`), the test failed as designed, and it is rewritten here
    // rather than deleted — the assertion is INVERTED, so it still cannot pass vacuously: remove
    // the introduction form and `producers` empties and this fails again.
    //
    // Both halves are asserted because a family with only introduction forms is as uninhabitable as
    // one with only eliminators — you could make values and never interpret them.
    let isSim (t: Type) =
        t.IsGenericType && t.GetGenericTypeDefinition() = typedefof<ISim<_>>

    let declared =
        typeof<ICli>.Assembly.GetTypes()
        |> Array.filter (fun t -> t.IsInterface)
        |> Array.collect (fun t -> t.GetMethods())

    let consumers =
        declared
        |> Array.filter (fun m -> m.GetParameters() |> Array.exists (fun p -> isSim p.ParameterType))

    let producers = declared |> Array.filter (fun m -> isSim m.ReturnType)

    Assert.NotEmpty consumers
    Assert.NotEmpty producers

    // Name the producer, so a future reader sees WHICH member closed the gap rather than only that
    // the count is non-zero. A bare `NotEmpty` would still pass if some unrelated member started
    // returning an `ISim` by accident.
    let producerNames = producers |> Array.map (fun m -> m.Name) |> Array.distinct |> Array.sort
    Assert.Contains("Gen", producerNames)

[<Fact>]
let ``tie joins two strands of the same carrier type`` () =
    // `ITieVerb.Tie<'a>: ISim<'a> * ISim<'a> -> ISoftTie<'a>` — both strands share `'a`. Worth a
    // check because it is the one place in the braid family where the type parameter is *linked*
    // across two arguments rather than threaded through one.
    Assert.NotNull(box (braidCli.Tie(aSim<int> (), aSim<int> ())))

// ── Left open, deliberately (the question that stops here) ────────────────────────────────────────
//
// ## STATUS 2026-09-05: BREAK A is closed. The question below is NOT answered.
//
// `IGenVerb.Gen<'a>: 'a -> ISim<'a>` was added to the family. What that settles and what it leaves
// alone, stated separately so the second is not read off the first:
//
//   SETTLED — the family is now INHABITABLE as a pipeline. It declared eliminators and no
//   introduction form, which made the first value unreachable by construction, and every one of the
//   three readings below needs some way to produce it. Reading 2 says so outright ("a builder, the
//   room, or `SimVerb`"), so declaring the form takes nothing off the table.
//
//   ANSWERED, narrowly — reading 1's objection. It said `Sim: ISeed * TimeSpan -> ISim<'a>` would
//   make `'a` a return-position-only parameter chosen out of nothing. `Gen<'a>: 'a -> ISim<'a>`
//   determines `'a` from the ARGUMENT, so that objection does not apply to this shape. Note this
//   answers an objection to a *mechanism*; it does not choose reading 1.
//
//   NOT SETTLED — what `sim` MEANS, which of the three readings is right, and BREAK B. `Sim` still
//   returns `unit` (reading 2's point stands: it is the CLI invocation, and a command returns
//   nothing). `mea` and `cut` still both consume the sim, so the documented pipe still does not
//   compose as a chain, and `documentedLoop` still executes the fan-out. Under the free-object
//   reading that is correct and the DOC is wrong; under reading 3 it is a real defect. Nothing here
//   picks, and adding an introduction form does not establish that `ISim<'a>` is a free object —
//   it is necessary for that reading and very far from sufficient (`numerology-vs-number-theory`:
//   a matching shape is the weakest evidence there is).
//
// **What does `sim` return?** Three honest readings, none picked here:
//
//   1. `Sim` returns `ISim<'a>`. Then what is `'a`? Nothing in `ISeed * TimeSpan` determines it, so
//      it would be a return-position-only type parameter chosen by the caller — and it contradicts
//      the docstring's *"produces NO output (void); identity comes from the void"*, which reads as a
//      deliberate design statement rather than an omission.
//   2. `ISim<'a>` is produced elsewhere — a builder, the room, or `SimVerb`. Note
//      `SimVerb.ISimVerb.Sim: Room<'S,'Q> * seed -> Task<Run<'S,'Q>>` already occupies this slot with
//      types that compile, taking the runnable thing and returning the run. Under that reading
//      `clis`' `ISim<'a>` is the *room*, and `ISimVerb.Sim -> unit` is the *CLI invocation* (a
//      command returns nothing) — two layers currently sharing one interface family.
//   3. The documented loop is simply wrong and the real composition is the fan-out that
//      `documentedLoop` above is forced to write.
//
// ### Aaron's stated preference for the resolution (2026-08-17), and what it does not settle
//
// Aaron: *"lets make this mathematical and i think we advance a lot of historical math into a new
// regime where they can all work together and be compared in one arena."* The arena is already
// carved — `.claude/rules/only-the-irreducible-is-primitive-generate-the-rest.md`: the free object
// is primitive and each tradition is an **earned quotient** that declares its relations. So the
// preferred resolution of the question above is the one under which `ISim<'a>` is the **free
// object**: `mea` folds it, `cut` cuts it, `cla` discriminates it, `res` iterates to a fixed point,
// and `tie`/`braid`/`weave` are its monoidal structure.
//
// **What is evidence for that reading, stated at its real strength and no higher.** The declared
// shapes are *consistent with* it: `IMeaVerb.Mea<'a>: IEffects * ISim<'a> -> IMeasurement` has the
// arity of a catamorphism with the algebra injected — compare `DynamicValueFold.cata:
// DvAlgebra<'r> -> DynamicValue -> 'r` (Meijer/Fokkinga/Paterson 1991, law `bananaSplit a b dv =
// (cata a dv, cata b dv)` already proven in-tree). Under that reading BREAK B is not a defect at
// all: `mea` and `cut` are two *interpretations of the same term*, so applying both to the same sim
// is correct and the documented pipe is what is wrong.
//
// **That is a shape correspondence, NOT an exhibited instance, and it is not promoted here.** A
// matching arity is the weakest possible evidence — the `numerology-vs-number-theory` rule applies
// verbatim: say "consistent with", never "is", until the structure is supplied. Exhibiting the
// instance would require carrier types that let `IMeasurement` hold a folded value and let
// `ISim<'a>` hold a term, which decides what `'a` *is* — i.e. it silently answers the open question
// above. So it is left undone on purpose.
//
// **The promotion path, named so it is actionable rather than aspirational.** To earn "the verb
// family is the free structure", exhibit: (1) an introduction form for `ISim<'a>` (the test above
// proves there is none today); (2) `mea` instantiated by a real catamorphism over an in-tree
// algebra; (3) a law test showing an existing structure — `WSet.FourCornerTrace` (traced monoidal,
// Joyal–Street–Verity 1996) or `MenoBraided*` (braided monoidal / Yang–Baxter) — as an *instance*
// of the family rather than a neighbour. Until (3) holds, four honest structures beat one false
// unification.
//
// Reading 2 also implies a reconciliation between `clis/Verbs.fs` and `src/Core/SimVerb.fs`, which
// is research-doc §10 Q1's unanswered half. Guessing any of the three would bake a semantics into
// the interface everything else must conform to, on the strength of nobody's authority.
