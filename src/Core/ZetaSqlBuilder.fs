namespace Zeta.Core.Sql

open Zeta.Core

// ═══════════════════════════════════════════════════════════════════════
//  `zeta { }` — the TYPED, EAGER front end over the ONE operator algebra.
//
//  STATUS: **unmetered** (`.claude/rules/toy-is-free-metered-must-be-earned.md`)
//  — implemented, used, and now pinned by a differential falsifier against
//  the `QuerySurface` eager interpreter and the `Circuit` batch lowering
//  (`QuerySurface.Equivalence.Tests.fs` §EAGER MODE). It is not `metered`
//  because no cost model or workload measurement stands behind it.
//
//  ── What changed, and why it was a defect and not merely duplication ──
//
//  This CE used to carry its OWN implementations of `where` / `select` /
//  `join` / `for`, built out of `Seq.filter`, `Seq.map`, `Seq.groupBy` +
//  `Map.ofSeq`, each ending in `ZSet(Pool.Freeze arr)`.
//
//  `ZSet`'s array constructor is documented as: *"Construct from an
//  already-sorted-by-key, nonzero-weighted run. Callers are responsible
//  for the invariant; use `ZSet.ofSeq` for arbitrary input."* The four
//  hand-rolled operators honoured neither half of it:
//
//    • `select` maps keys, so a NON-INJECTIVE projection emits the same
//      key twice. The Z-set algebra says those weights SUM; this returned
//      two separate entries. `ZSet.Item` binary-searches, `(+)` sorted-
//      merges, and `Equals` compares position-wise — so the result read
//      as a different Z-set depending on which operator touched it.
//    • the projected/joined array was left in INPUT order, not key order,
//      so `zset.[k]` (binary search) could miss a key that is present.
//    • weights that cancel to zero were retained, breaking the
//      no-zero-weight invariant every other `ZSet` producer maintains.
//
//  The fix is deletion, not repair: every operation below now delegates to
//  the SAME `ZSet.filter` / `ZSet.map` / `ZSet.join` / `ZSet.flatMap`
//  primitives that `Circuit.Filter` / `Circuit.Map` / `Circuit.Join` call
//  through `MapZSetOp` / `FilterZSetOp` / `JoinZSetOp` (`Operators.fs`).
//  Those primitives `sortAndConsolidate` their output, which is exactly
//  the invariant the hand-rolled copies dropped.
//
//  So `zeta { }` is no longer a second implementation of the relational
//  operators — it is a typed surface syntax over the one implementation,
//  and the eager evaluation it provides is the third execution mode of the
//  shared plan (`Zeta.Core.QuerySurface.ToyExecutionMode.Eager`) rather
//  than a private evaluator.
//
//  ── The honest limit: why this surface is still SEPARATE from `ToyPlan`
//
//  `zeta { }` is generic in the row type and takes F# LAMBDAS
//  (`'T -> bool`, `'T -> 'U`). `QuerySurface.ToyPlan` is deliberately
//  CLOSURE-FREE over an erased `ToyRow`, and that closure-freedom is
//  load-bearing: it is the only reason two independently written front
//  ends can be compared for structural equality. A typed lambda cannot be
//  lowered into a `ToyScalar` without quotation splitting (see the
//  "Deliberately left out" section of the design doc).
//
//  So the two IRs are NOT merged, and merging them would destroy the
//  falsifier. What IS shared is everything below the IR: the operator
//  semantics (`ZSet.*`) and the eager execution mode. The relationship is
//  pinned by a test, not asserted here — `zeta { }` over a `ToyRow`
//  relation must return the byte-identical Z-set that `ToyEager.run`
//  returns for the corresponding `ToyPlan`, which in turn must equal the
//  `Circuit` batch lowering.
//
//  ── Anchors (Beacon) ────────────────────────────────────────────────
//  • Codd, "A Relational Model of Data for Large Shared Data Banks"
//    (CACM 1970) — select / project / join.
//  • Budiu, McSherry, Ryzhyk, Tannen, "DBSP" (VLDB 2023) — the Z-set
//    algebra these operators are the set-at-a-time instance of.
// ═══════════════════════════════════════════════════════════════════════

/// Represents a schema-typed relation (a materialized Z-set) in the Zeta
/// DBSP runtime. Construct with `Relation.ofSeq` / `Relation.ofKeys` —
/// they route through `ZSet.ofSeq`, which establishes the sorted,
/// consolidated, nonzero-weight invariant that `ZSet`'s raw array
/// constructor requires the caller to guarantee.
type Relation<'Schema when 'Schema : comparison> = { Stream: ZSet<'Schema> }

[<RequireQualifiedAccess>]
[<CompilationRepresentation(CompilationRepresentationFlags.ModuleSuffix)>]
module Relation =

    /// The empty relation.
    let empty<'T when 'T : comparison> : Relation<'T> = { Stream = ZSet<'T>.Empty }

    /// Wrap an existing Z-set. The `ZSet` invariant is the caller's, as
    /// always — but every `ZSet` PRODUCER in the codebase maintains it, so
    /// this is safe for anything that came out of `ZSet.*`.
    let ofZSet (z: ZSet<'T>) : Relation<'T> = { Stream = z }

    /// Build from arbitrary `(key, weight)` pairs. Sorts and consolidates.
    let ofSeq (pairs: ('T * Weight) seq) : Relation<'T> = { Stream = ZSet.ofSeq pairs }

    /// Build from keys, each at weight 1. Sorts and consolidates, so a
    /// repeated key becomes weight 2 (Z-set semantics, not set semantics).
    let ofKeys (keys: 'T seq) : Relation<'T> = { Stream = ZSet.ofKeys keys }

    let toZSet (r: Relation<'T>) : ZSet<'T> = r.Stream

/// Builder for the `zeta` query computation expression. Every operation
/// delegates to the shared `ZSet` primitive named in its comment; none of
/// them implements relational semantics of its own.
type ZetaQueryBuilder() =

    /// `for x in r do ...` — the monadic bind. Delegates to `ZSet.flatMap`,
    /// which scales each inner Z-set by the outer entry's weight and sums,
    /// consolidating collisions. The hand-rolled version multiplied weights
    /// into a flat `ResizeArray` and never consolidated.
    member _.For(r: Relation<'T>, f: 'T -> Relation<'U>) : Relation<'U>
        when 'T : comparison and 'U : comparison =
        { Stream = ZSet.flatMap (fun k -> (f k).Stream) r.Stream }

    /// A single row at weight 1. `ZSet.singleton` rather than a hand-built
    /// one-element array.
    member _.Yield(x: 'T) : Relation<'T> when 'T : comparison =
        { Stream = ZSet.singleton x 1L }

    member _.YieldFrom(r: Relation<'T>) : Relation<'T> when 'T : comparison = r

    member _.Zero() : Relation<'T> when 'T : comparison = { Stream = ZSet<'T>.Empty }

    /// σ (selection). Delegates to `ZSet.filter` — the same function
    /// `FilterZSetOp.StepAsync` calls. Filtering a sorted run preserves
    /// sort order, so this was the one hand-rolled operator that happened
    /// to be correct; it still routes through the shared primitive so
    /// there is exactly one implementation to keep correct.
    [<CustomOperation("where", MaintainsVariableSpace = true)>]
    member _.Where(r: Relation<'T>, [<ProjectionParameter>] predicate: 'T -> bool) : Relation<'T>
        when 'T : comparison =
        { Stream = ZSet.filter predicate r.Stream }

    /// π (projection). Delegates to `ZSet.map` — the same function
    /// `MapZSetOp.StepAsync` calls — which `sortAndConsolidate`s, so a
    /// non-injective projection SUMS the colliding weights and drops the
    /// ones that cancel to zero.
    [<CustomOperation("select")>]
    member _.Select(r: Relation<'T>, [<ProjectionParameter>] projection: 'T -> 'U) : Relation<'U>
        when 'T : comparison and 'U : comparison =
        { Stream = ZSet.map projection r.Stream }

    /// ⋈ (equi-join). Delegates to `ZSet.join` — the same function
    /// `JoinZSetOp.StepAsync` calls: a hash join that indexes the RIGHT
    /// side, multiplies weights with `Checked` arithmetic, guards the
    /// output-size overflow, and consolidates.
    ///
    /// The `'Key : not null` constraint is new and is inherited from
    /// `ZSet.join` (and therefore from `Circuit.Join`): the join's probe
    /// side is a `Dictionary<'Key, int>`, which cannot key on null. The
    /// hand-rolled version used `Map.ofSeq` and so accepted a nullable
    /// key — an accidental capability, not a designed one, and one that
    /// the circuit path never had.
    [<CustomOperation("join")>]
    member _.Join(relR: Relation<'R>,
                  relS: Relation<'S>,
                  keySelectorR: 'R -> 'Key,
                  keySelectorS: 'S -> 'Key,
                  projector: 'R -> 'S -> 'Result) : Relation<'Result>
        when 'R : comparison and 'S : comparison and 'Key : comparison and 'Key : not null and 'Result : comparison =
        { Stream = ZSet.join keySelectorR keySelectorS projector relR.Stream relS.Stream }

[<AutoOpen>]
module ZetaQueryModule =
    let zeta = ZetaQueryBuilder()
