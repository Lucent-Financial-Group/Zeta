module Zeta.Tests.SpeculativeUpdateTests

open System.Threading
open System.Threading.Tasks
open Xunit
open Zeta.Core

/// A reference payload with *value* equality, deliberately. It is the forcing case
/// for `ICasCell.IsSame`: two distinct `Box 1` instances are `=` but are not the same
/// object, so a CE result judged by structural equality would report a lost race as a
/// win. Using a record here means the reference-equality requirement is load-bearing
/// in these tests rather than incidentally satisfied.
type private Box = { N: int }

/// **Scripted contention** — an `ICasCell` decorator that loses the first `misses`
/// exchanges to an imaginary competing writer.
///
/// It does not merely report failure: it *installs* `interfere expected` into the
/// underlying cell first, then returns that value, which is exactly what a real
/// `CompareExchange` returns after being beaten to the location. So the retry sees a
/// genuinely moved snapshot, not a replayed one.
///
/// Deterministic by construction (discipline #4): the race is scripted, so the retry
/// path replays identically instead of depending on two real threads interleaving.
type private ScriptedContention<'T>(inner: ICasCell<'T>, interfere: 'T -> 'T, misses: int) =
    let mutable remaining = misses

    interface ICasCell<'T> with
        member _.Snapshot() = inner.Snapshot()
        member _.IsSame(a, b) = inner.IsSame(a, b)

        member _.CompareExchange(next, expected) =
            if remaining > 0 then
                remaining <- remaining - 1
                let intruder = interfere expected
                inner.CompareExchange(intruder, expected) |> ignore
                intruder
            else
                inner.CompareExchange(next, expected)


// ---------------------------------------------------------------------------
// R10.1 — uncontended: `update` runs exactly once; the field becomes update(original)
// ---------------------------------------------------------------------------

[<Fact>]
let ``uncontended speculativeUpdate invokes update exactly once`` () =
    let cell = CasRefCell({ N = 1 })
    let mutable calls = 0

    let landed =
        Atomic.speculativeUpdate cell (fun s ->
            calls <- calls + 1
            { N = s.N + 10 })

    Assert.Equal(1, calls)
    Assert.Equal({ N = 11 }, landed)
    Assert.Equal({ N = 11 }, cell.Value)

/// R6 — the return value is the value that WON the exchange, not the snapshot it was
/// computed from. Asserted by reference so a mutant returning a structurally-equal
/// snapshot could not slip through.
[<Fact>]
let ``speculativeUpdate returns the landed value, not the snapshot`` () =
    let original = { N = 1 }
    let cell = CasRefCell(original)

    let landed = Atomic.speculativeUpdate cell (fun s -> { N = s.N + 1 })

    Assert.False(obj.ReferenceEquals(landed, original))
    Assert.True(obj.ReferenceEquals(landed, cell.Value))


// ---------------------------------------------------------------------------
// R10.2 — a lost race re-invokes `update`, and the extra invocation is VISIBLE
// ---------------------------------------------------------------------------

[<Fact>]
let ``a lost race re-invokes update and the extra run is visible in the call count`` () =
    let cell = CasRefCell({ N = 0 })
    let scripted = ScriptedContention(cell, (fun s -> { N = s.N + 100 }), misses = 3) :> ICasCell<Box>
    let mutable calls = 0

    let landed =
        Atomic.speculativeUpdate scripted (fun s ->
            calls <- calls + 1
            { N = s.N + 1 })

    // Three lost races ⇒ four invocations. This is the purity requirement (R1) made
    // observable: an impure `update` would have run its side effect four times.
    Assert.Equal(4, calls)
    // ...and the landed value is computed from the LAST snapshot (0 + 100*3 + 1),
    // never from the stale original. A retry that reused the first snapshot would
    // land 1 here.
    Assert.Equal({ N = 301 }, landed)
    Assert.Equal({ N = 301 }, cell.Value)

[<Fact>]
let ``real multi-threaded contention loses no updates`` () =
    let cell = CasIntCell(0)
    let threads = 8
    let perThread = 2000

    Parallel.For(
        0,
        threads,
        fun _ ->
            for _ in 1..perThread do
                Atomic.speculativeUpdate cell (fun n -> n + 1) |> ignore
    )
    |> ignore

    // Exact, not approximate: a dropped retry or a CE whose failure is misread as a
    // success shows up here as a deficit.
    Assert.Equal(threads * perThread, cell.Value)


// ---------------------------------------------------------------------------
// R10.3 / R10.4 — the abort variant
// ---------------------------------------------------------------------------

[<Fact>]
let ``trySpeculativeUpdate aborts without writing and without calling update`` () =
    let original = { N = 7 }
    let cell = CasRefCell(original)
    let mutable calls = 0

    let landed =
        Atomic.trySpeculativeUpdate
            cell
            (fun _ -> true)
            (fun s ->
                calls <- calls + 1
                { N = s.N + 1 })

    Assert.False(landed)
    Assert.Equal(0, calls)
    Assert.True(obj.ReferenceEquals(original, cell.Value))

[<Fact>]
let ``trySpeculativeUpdate with a never-firing abort behaves as speculativeUpdate`` () =
    let cell = CasRefCell({ N = 7 })
    let mutable calls = 0

    let landed =
        Atomic.trySpeculativeUpdate
            cell
            (fun _ -> false)
            (fun s ->
                calls <- calls + 1
                { N = s.N + 1 })

    Assert.True(landed)
    Assert.Equal(1, calls)
    Assert.Equal({ N = 8 }, cell.Value)

/// The predicate is re-checked against the FRESH snapshot on every retry — a check
/// made only before the loop would be a check on a value that no longer exists.
[<Fact>]
let ``trySpeculativeUpdate re-evaluates the abort predicate after a lost race`` () =
    let cell = CasRefCell({ N = 0 })
    let scripted = ScriptedContention(cell, (fun s -> { N = s.N + 100 }), misses = 1) :> ICasCell<Box>
    let mutable calls = 0

    // Passes on the original snapshot (0), vetoes the intruder's (100).
    let landed =
        Atomic.trySpeculativeUpdate
            scripted
            (fun s -> s.N >= 100)
            (fun s ->
                calls <- calls + 1
                { N = s.N + 1 })

    Assert.False(landed)
    Assert.Equal(1, calls)
    // The intruder's value survives; ours was never written.
    Assert.Equal({ N = 100 }, cell.Value)


// ---------------------------------------------------------------------------
// R10.5 — a primitive cell, where CE equality is by VALUE
// ---------------------------------------------------------------------------

[<Fact>]
let ``int cell updates uncontended`` () =
    let cell = CasIntCell(41)
    let mutable calls = 0

    let landed =
        Atomic.speculativeUpdate cell (fun n ->
            calls <- calls + 1
            n + 1)

    Assert.Equal(1, calls)
    Assert.Equal(42, landed)
    Assert.Equal(42, cell.Value)

[<Fact>]
let ``int cell retries on a lost race`` () =
    let cell = CasIntCell(0)
    let scripted = ScriptedContention(cell, (fun n -> n + 100), misses = 2) :> ICasCell<int>
    let mutable calls = 0

    let landed =
        Atomic.speculativeUpdate scripted (fun n ->
            calls <- calls + 1
            n + 1)

    Assert.Equal(3, calls)
    Assert.Equal(201, landed)
    Assert.Equal(201, cell.Value)

[<Fact>]
let ``int cell abort leaves the value untouched`` () =
    let cell = CasIntCell(5)

    let landed = Atomic.trySpeculativeUpdate cell (fun _ -> true) (fun n -> n + 1)

    Assert.False(landed)
    Assert.Equal(5, cell.Value)


// ---------------------------------------------------------------------------
// R2 — reference cells judge the CE result by IDENTITY, not by structural equality
// ---------------------------------------------------------------------------

/// A cell whose CE reports a structurally-equal but distinct object. That IS a lost
/// race, and reference-equality is the only thing that catches it: under `=` this
/// would read as a win and the caller's write would be silently dropped.
type private ImpostorCell(inner: ICasCell<Box>) =
    let mutable fired = false

    interface ICasCell<Box> with
        member _.Snapshot() = inner.Snapshot()
        member _.IsSame(a, b) = inner.IsSame(a, b)

        member _.CompareExchange(next, expected) =
            if not fired then
                fired <- true
                { N = expected.N } // equal by value, a different object
            else
                inner.CompareExchange(next, expected)

[<Fact>]
let ``a structurally-equal but distinct CE result counts as a lost race`` () =
    let cell = CasRefCell({ N = 3 })
    let impostor = ImpostorCell(cell) :> ICasCell<Box>
    let mutable calls = 0

    let landed =
        Atomic.speculativeUpdate impostor (fun s ->
            calls <- calls + 1
            { N = s.N + 1 })

    Assert.Equal(2, calls)
    Assert.Equal({ N = 4 }, landed)
    Assert.Equal({ N = 4 }, cell.Value)
