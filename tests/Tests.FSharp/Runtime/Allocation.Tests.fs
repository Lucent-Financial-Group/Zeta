module Zeta.Tests.Runtime.AllocationTests

open System
open System.Threading.Tasks
open FsUnit.Xunit
open global.Xunit
open Zeta.Core


/// Measure allocations of an action. The GC counter is thread-local and
/// precise to the byte. Warm up first so JIT is done.
let private measure (warmup: int) (action: unit -> unit) : int64 =
    for _ in 1 .. warmup do action ()
    GC.Collect()
    GC.WaitForPendingFinalizers()
    GC.Collect()
    let before = GC.GetAllocatedBytesForCurrentThread()
    action ()
    let after = GC.GetAllocatedBytesForCurrentThread()
    after - before


[<Fact>]
let ``ZSet lookup is zero-alloc after warm-up`` () =
    let z = ZSet.ofSeq [ 1, 1L ; 2, 2L ; 3, 3L ; 4, 4L ; 5, 5L ]
    let bytes = measure 3 (fun () -> z.[3] |> ignore)
    Assert.True((bytes = 0L), sprintf "Expected 0 bytes, got %d" bytes)


[<Fact>]
let ``ZSet count is zero-alloc`` () =
    let z = ZSet.ofSeq [ 1, 1L ; 2, 2L ]
    let bytes = measure 3 (fun () -> z.Count |> ignore)
    Assert.True((bytes = 0L), sprintf "Expected 0 bytes, got %d" bytes)


[<Fact>]
let ``ZSet.ofArray allocates less than pairwise singleton add`` () =
    let keys = Array.init 256 id
    let batchBytes = measure 3 (fun () -> ZSet.ofArray keys |> ignore)
    let pairwiseBytes =
        measure 3 (fun () ->
            let mutable acc = ZSet<int>.Empty
            for k in keys do
                acc <- ZSet.add acc (ZSet.singleton k 1L)
            ignore acc)
    Assert.True(
        (batchBytes < pairwiseBytes),
        sprintf "ofArray %d bytes should beat pairwise singleton add %d bytes" batchBytes pairwiseBytes)


[<Fact>]
let ``ZSet.mapMonotone allocates no more than map`` () =
    let z = ZSet.ofKeys [ 1 .. 256 ]
    let mapBytes = measure 3 (fun () -> ZSet.map (fun x -> x * 2) z |> ignore)
    let monoBytes = measure 3 (fun () -> ZSet.mapMonotone (fun x -> x * 2) z |> ignore)
    Assert.True(
        (monoBytes <= mapBytes),
        sprintf "mapMonotone %d bytes should be ≤ map %d bytes" monoBytes mapBytes)


[<Fact>]
let ``ZSet.join 1-to-1 does not rent the cartesian product`` () =
    let a = ZSet.ofKeys [ 1 .. 256 ]
    let b = ZSet.ofKeys [ 1 .. 256 ]
    let bytes =
        measure 3 (fun () ->
            ZSet.join id id (fun x y -> x, y) a b |> ignore)
    // Old path rented 256×256 entries (~1 MiB+). Output is 256 pairs.
    Assert.True(
        (bytes < 200_000L),
        sprintf "1:1 join of 256×256 rented %d bytes (cartesian-shaped)" bytes)


[<Fact>]
let ``ZSet.add allocates only the output array`` () =
    let a = ZSet.ofSeq [ 1, 1L ; 2, 2L ; 3, 3L ]
    let b = ZSet.ofSeq [ 4, 4L ; 5, 5L ]
    // Expected: one T[] allocation. Each ZEntry<int> is 16 bytes (int + long).
    // Output is 5 entries = 80 bytes + 24 byte array header ≈ 104 bytes.
    let bytes = measure 3 (fun () -> ZSet.add a b |> ignore)
    Assert.True((bytes < 200L), sprintf "Expected < 200 bytes, got %d" bytes)


[<Fact>]
let ``ZSet.neg allocates only the output array`` () =
    let a = ZSet.ofSeq [ 1, 1L ; 2, 2L ; 3, 3L ; 4, 4L ; 5, 5L ]
    let bytes = measure 3 (fun () -> ZSet.neg a |> ignore)
    Assert.True((bytes < 200L), sprintf "Expected < 200 bytes, got %d" bytes)


[<Fact>]
let ``ZSet.weightedCount is zero-alloc`` () =
    let z = ZSet.ofSeq [ 1, 1L ; 2, 2L ; 3, 3L ; 4, 4L ]
    let bytes = measure 3 (fun () -> ZSet.weightedCount z |> ignore)
    Assert.True((bytes = 0L), sprintf "Expected 0 bytes, got %d" bytes)


[<Fact>]
let ``Empty ZSet operations allocate nothing`` () =
    let empty = ZSet<int>.Empty
    let bytes =
        measure 3 (fun () ->
            let e = ZSet.add empty empty
            ignore e)
    Assert.True((bytes = 0L), sprintf "Expected 0 bytes, got %d" bytes)


// ─── Pool paths (moved from CoverageTests) ─────────────────────────

[<Fact>]
let ``Pool rents zero-length returns empty array`` () =
    let arr = Pool.Rent<int> 0
    arr.Length |> should equal 0


[<Fact>]
let ``Pool allocateExact zero-length returns empty array`` () =
    let arr = Pool.AllocateExact<int> 0
    arr.Length |> should equal 0


[<Fact>]
let ``Pool Freeze creates immutable`` () =
    let arr = Array.init 3 (fun i -> i)
    let im = Pool.Freeze arr
    im.Length |> should equal 3


[<Fact>]
let ``Pool FreezeSlice zero returns empty`` () =
    let arr = Array.zeroCreate<int> 10
    let im = Pool.FreezeSlice(arr, 0)
    im.Length |> should equal 0


[<Fact>]
let ``Circuit step with no data is low-alloc`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<int>()
        let mapped = c.Map(input.Stream, Func<int, int>(fun x -> x * 2))
        let _out = c.Output mapped
        c.Build()

        // Warm-up: a few ticks to JIT everything.
        for _ in 1 .. 5 do do! c.StepAsync()

        GC.Collect()
        GC.WaitForPendingFinalizers()
        GC.Collect()
        let before = GC.GetAllocatedBytesForCurrentThread()
        for _ in 1 .. 100 do
            do! c.StepAsync()
        let after = GC.GetAllocatedBytesForCurrentThread()
        let perStep = (after - before) / 100L

        // Budget: backgroundTask state machine + minor bookkeeping per step.
        Assert.True((perStep < 5120L), sprintf "Per-step allocation %d bytes exceeded budget" perStep)
    }
