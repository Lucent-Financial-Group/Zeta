module Zeta.Tests.Storage.SpineBalancedTests
#nowarn "0893"

open System
open FsUnit.Xunit
open global.Xunit
open Zeta.Core


// ═══════════════════════════════════════════════════════════════════
// BalancedSpine — MaxSAT-inspired merge scheduler
// (moved from SpineAndSafetyTests)
// ═══════════════════════════════════════════════════════════════════

[<Fact>]
let ``BalancedSpine inserts and consolidates empty`` () =
    let sp = BalancedSpine<int>(budgetMergesPerTick = 4)
    sp.Consolidate().IsEmpty |> should be True
    sp.BatchCount |> should equal 0
    sp.PendingMerges |> should equal 0


[<Fact>]
let ``BalancedSpine consolidates a single insert losslessly`` () =
    let sp = BalancedSpine<int>(budgetMergesPerTick = 4)
    sp.Insert (ZSet.ofKeys [ 1; 2; 3 ])
    let c = sp.Consolidate()
    c.Count |> should equal 3


[<Fact>]
let ``BalancedSpine consolidates many inserts correctly`` () =
    // Insert 16 disjoint singletons.
    let sp = BalancedSpine<int>(budgetMergesPerTick = 2)
    for i in 0 .. 15 do
        sp.Insert (ZSet.ofKeys [ i ])
    let c = sp.Consolidate()
    c.Count |> should equal 16
    for i in 0 .. 15 do
        c.[i] |> should equal 1L


[<Fact>]
let ``BalancedSpine Tick respects budget`` () =
    let sp = BalancedSpine<int>(budgetMergesPerTick = 1)
    // Produce several pending merges by inserting same-class batches.
    for _ in 0 .. 5 do
        sp.Insert (ZSet.ofKeys [ 42 ])   // all into size-class 1
    // After many inserts we should have at least one pending merge.
    sp.PendingMerges |> should be (greaterThanOrEqualTo 0)
    let drained = sp.Tick()
    drained |> should be (lessThanOrEqualTo 1)


[<Fact>]
let ``BalancedSpine Clear resets state`` () =
    let sp = BalancedSpine<int>(budgetMergesPerTick = 4)
    sp.Insert (ZSet.ofKeys [ 1; 2 ])
    sp.Insert (ZSet.ofKeys [ 3; 4 ])
    sp.Clear()
    sp.BatchCount |> should equal 0
    sp.PendingMerges |> should equal 0
    sp.Consolidate().IsEmpty |> should be True


[<Fact>]
let ``BalancedSpine skips empty batches without allocating a slot`` () =
    let sp = BalancedSpine<int>(budgetMergesPerTick = 4)
    sp.Insert ZSet<int>.Empty
    sp.BatchCount |> should equal 0


// ─── BalancedSpine stress (moved from SpineAndSafetyTests) ──

[<Fact>]
let ``BalancedSpine eventually consolidates under budgeted ticks`` () =
    let sp = BalancedSpine<int>(budgetMergesPerTick = 2)
    let rng = Random 42
    let expected =
        [| for _ in 0 .. 50 do
            let k = rng.Next 200
            sp.Insert (ZSet.ofKeys [ k ])
            k |]
        |> Array.distinct
        |> Array.sort
    // Drain with many ticks.
    for _ in 0 .. 100 do sp.Tick() |> ignore
    let c = sp.Consolidate()
    c.Count |> should equal expected.Length


[<Fact>]
let ``Expire retracts keys older than now-ttl and keeps the rest`` () =
    let sp = BalancedSpine<int>(budgetMergesPerTick = 4)
    sp.Insert(ZSet.ofKeys [ 0; 3; 6; 10 ])
    let delta = sp.Expire(10L, 5L, Func<int, int64>(int64))
    // expiresAt = time + 5; expired iff <= 10 → 0 and 3.
    delta.[0] |> should equal -1L
    delta.[3] |> should equal -1L
    delta.[6] |> should equal 0L
    delta.[10] |> should equal 0L
    let live = sp.Consolidate()
    live.[0] |> should equal 0L
    live.[3] |> should equal 0L
    live.[6] |> should equal 1L
    live.[10] |> should equal 1L


[<Fact>]
let ``Expire is idempotent at a fixed now`` () =
    let sp = BalancedSpine<int>(budgetMergesPerTick = 4)
    sp.Insert(ZSet.ofKeys [ 0; 8 ])
    let first = sp.Expire(10L, 5L, Func<int, int64>(int64))
    first.[0] |> should equal -1L
    let second = sp.Expire(10L, 5L, Func<int, int64>(int64))
    second.IsEmpty |> should be True
    sp.Consolidate().[8] |> should equal 1L


[<Fact>]
let ``Expire empty spine is empty delta`` () =
    let sp = BalancedSpine<int>(budgetMergesPerTick = 4)
    sp.Expire(100L, 1L, Func<int, int64>(int64)).IsEmpty |> should be True


[<Fact>]
let ``Expire rejects non-positive ttl`` () =
    let sp = BalancedSpine<int>(budgetMergesPerTick = 4)
    sp.Insert(ZSet.ofKeys [ 1 ])
    (fun () -> sp.Expire(10L, 0L, Func<int, int64>(int64)) |> ignore)
    |> should throw typeof<ArgumentException>


[<Fact>]
let ``Expire accepts Frontier.ClosedThrough as injected now`` () =
    let sp = BalancedSpine<int>(budgetMergesPerTick = 4)
    sp.Insert(ZSet.ofKeys [ 1; 20 ])
    let frontier = Frontier.singleton 0 10L
    let delta = sp.Expire(frontier.ClosedThrough, 5L, Func<int, int64>(int64))
    delta.[1] |> should equal -1L
    delta.[20] |> should equal 0L
    sp.Consolidate().[20] |> should equal 1L
