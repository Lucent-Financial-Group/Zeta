namespace Zeta.Core

open System.Threading

/// **The CAS port** — one memory location that supports a hardware
/// compare-and-swap. Interfaces are free (`interfaces-free-classes-earned-under-rules`),
/// so the algorithm below depends on this *shape* and never on a vendor type:
/// `Interlocked.CompareExchange` is one implementation of the port, not the port.
///
/// Owning the interface is what makes the retry path **testable**. A lost race is
/// otherwise only reachable by scheduling two real threads and hoping; against this
/// port a test can *script* a miss and the retry becomes a replayable, deterministic
/// path (discipline #4 / manifesto §7) rather than a flaky one.
type ICasCell<'T> =

    /// Read the current value. This is the **snapshot** the speculation is built on.
    abstract Snapshot: unit -> 'T

    /// Hardware compare-and-swap. Returns the value the location held *before* the
    /// call. The swap happened **iff** that returned value `IsSame` as `expected`.
    abstract CompareExchange: next: 'T * expected: 'T -> 'T

    /// The equality by which a compare-exchange result is judged to be the snapshot.
    ///
    /// This is on the port because it genuinely differs per cell and getting it
    /// wrong is silent: a **reference** cell must compare by reference (two equal-by-
    /// value objects are still a lost race), while a **primitive** cell has no
    /// identity at all and must compare by value.
    abstract IsSame: a: 'T * b: 'T -> bool


/// A reference-typed compare-and-swap location.
///
/// **Earned class** (per `interfaces-free-classes-earned-under-rules`): a class
/// carries state ⇒ weight, so it must be justified. The earning here is a hardware
/// fact, not a convenience — `Interlocked.CompareExchange` needs the *address* of a
/// stable memory location, and a location is precisely state. F# cannot capture a
/// `byref` in a closure or an interface implementation, so the cell must own its
/// storage. The state is the irreducible subject of the operation.
[<Sealed>]
type CasRefCell<'T when 'T: not struct>(initial: 'T) =

    // Volatile for the same reason `Transaction.fs` marks its cell volatile: without
    // it the JIT may hoist a plain `cell` read out of a caller's loop and hand back a
    // snapshot several exchanges stale.
    [<VolatileField>]
    let mutable cell = initial

    /// The current value. A plain volatile read — no CAS, no spin.
    member _.Value = cell

    interface ICasCell<'T> with
        member _.Snapshot() = cell
        member _.CompareExchange(next, expected) = Interlocked.CompareExchange(&cell, next, expected)
        member _.IsSame(a, b) = obj.ReferenceEquals(a, b)


/// An `int` compare-and-swap location. See `CasRefCell` for why the class is earned.
///
/// Separate from `CasRefCell` because the CE equality is genuinely different: an
/// `int` has no reference identity, so the result is judged by **value** (`=`), and
/// `Interlocked.CompareExchange` binds to the non-generic `int` overload.
[<Sealed>]
type CasIntCell(initial: int) =

    [<VolatileField>]
    let mutable cell = initial

    /// The current value. A plain volatile read — no CAS, no spin.
    member _.Value = cell

    interface ICasCell<int> with
        member _.Snapshot() = cell
        member _.CompareExchange(next, expected) = Interlocked.CompareExchange(&cell, next, expected)
        member _.IsSame(a, b) = a = b


/// **Speculative update** — the optimistic snapshot ⇒ compute ⇒ compare-exchange
/// loop, which is how a lock-free structure applies an arbitrary function to a
/// shared location without ever taking a lock (discipline #2, manifesto §2).
///
/// The word *speculative* is the contract, not decoration: the `update` function is
/// applied to a snapshot that another writer may invalidate before the exchange
/// lands, so **`update` may run more than once** and MUST be pure. An impure
/// `update` does not merely risk a duplicate side effect — it will produce one, and
/// the extra run is invisible to the caller.
///
/// **Attribution (Beacon).** The published anchor for this pattern is Joseph
/// Albahari, *Threading in C#* (§"Nonblocking Synchronization" / *C# in a Nutshell*)
/// — the `Interlocked.CompareExchange` optimistic-update loop and `SpinWait` as its
/// backoff, written out in full for a general audience. The standing .NET
/// concurrency lineage this repo follows: Stephen Toub (the `Interlocked` /
/// `SpinWait` / async-primitive guidance) and David Fowler
/// (`System.Threading.Channels`). Underneath both, the theory anchor: Maurice
/// Herlihy, *Wait-Free Synchronization* (TOPLAS 1991) — compare-and-swap has
/// unbounded consensus number, which is exactly why a CAS retry loop needs no
/// helper protocol and no arbitrary attempt ceiling.
[<RequireQualifiedAccess>]
module Atomic =

    /// Apply `update` to `cell` atomically, retrying until the exchange lands.
    /// Returns the value that **won** the exchange (the `next` that was stored),
    /// never the snapshot it was computed from.
    ///
    /// `update` MUST be pure — see the module doc. It runs once on the uncontended
    /// path (one read, one CE, no spin, so the path is DST-replayable) and once more
    /// per lost race.
    ///
    /// **No attempt ceiling.** A CAS loop only fails to progress when *some other*
    /// writer succeeded, so the loop is lock-free by construction and the
    /// environment, not a magic number, decides how long contention lasts. Capping
    /// it and throwing would convert someone else's success into our exception.
    let speculativeUpdate (cell: ICasCell<'T>) (update: 'T -> 'T) : 'T =
        // An INSTANCE `SpinWait`, not a static spin: the instance is what carries the
        // progressive backoff (tight spin, then yield, then sleep) across retries of
        // *this* call. It is local progress control only — never a clock that filters
        // what enters a shared fold (`local-time-never-enters-the-shared-fold`).
        //
        // HONEST LIMIT — this line is UNMETERED, and deleting it survives every test
        // in `SpeculativeUpdate.Tests.fs` (mutation-checked, not assumed). Backoff
        // changes how long contention costs, never what the loop computes, so the only
        // test that could see it is a timing test — which would be flaky and non-DST.
        // The `SpinWait` is here on the published guidance (Albahari; Toub), and it is
        // named as unfalsified rather than left looking covered.
        let mutable spinner = SpinWait()
        let mutable landed = Unchecked.defaultof<'T>
        let mutable settled = false

        while not settled do
            let snapshot = cell.Snapshot()
            let next = update snapshot
            let seen = cell.CompareExchange(next, snapshot)

            if cell.IsSame(seen, snapshot) then
                landed <- next
                settled <- true
            else
                spinner.SpinOnce()

        landed

    /// `speculativeUpdate` with an abort predicate. Returns `true` if the exchange
    /// landed, `false` if `shouldAbort` vetoed the snapshot — in which case **nothing
    /// is written and `update` is never called**.
    ///
    /// The predicate is re-evaluated on every retry against the *fresh* snapshot,
    /// which is the whole point: a condition that held when the caller started may be
    /// falsified by the writer that won the race, and a check made only once would be
    /// a check on a value that no longer exists.
    ///
    /// Kept as its own loop rather than delegating to `speculativeUpdate` with a
    /// constant predicate: that would push a per-call closure allocation onto the
    /// uncontended path of a lock-free primitive, to spare eight lines.
    let trySpeculativeUpdate (cell: ICasCell<'T>) (shouldAbort: 'T -> bool) (update: 'T -> 'T) : bool =
        let mutable spinner = SpinWait()
        let mutable landed = false
        let mutable settled = false

        while not settled do
            let snapshot = cell.Snapshot()

            if shouldAbort snapshot then
                settled <- true
            else
                let next = update snapshot
                let seen = cell.CompareExchange(next, snapshot)

                if cell.IsSame(seen, snapshot) then
                    landed <- true
                    settled <- true
                else
                    spinner.SpinOnce()

        landed
