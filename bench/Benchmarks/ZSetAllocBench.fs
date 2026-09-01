module Zeta.Benchmarks.ZSetAllocBench

open BenchmarkDotNet.Attributes
open Zeta.Core

/// Claimed no/low-allocation Z-set paths. MemoryDiagnoser is the
/// measurement; unit tests in Allocation.Tests.fs are the falsifier
/// that can fail CI. Do not quote a zero-alloc claim without both.
[<MemoryDiagnoser>]
type ZSetZeroAlloc() =

    [<DefaultValue(false)>]
    val mutable private z: ZSet<int>

    [<Params(256, 4096)>]
    member val Size = 0 with get, set

    [<GlobalSetup>]
    member this.Setup() =
        this.z <- ZSet.ofKeys [ 0 .. this.Size - 1 ]

    [<Benchmark>]
    member this.Lookup() = this.z.[this.Size / 2]

    [<Benchmark>]
    member this.Count() = this.z.Count

    [<Benchmark>]
    member this.WeightedCount() = ZSet.weightedCount this.z

    [<Benchmark>]
    member this.IsEmpty() = this.z.IsEmpty

    [<Benchmark>]
    member this.EmptyAdd() = ZSet.add ZSet<int>.Empty ZSet<int>.Empty


[<MemoryDiagnoser>]
type ZSetMapVsMapMonotone() =

    [<DefaultValue(false)>]
    val mutable private z: ZSet<int>

    [<Params(256, 4096)>]
    member val Size = 0 with get, set

    [<GlobalSetup>]
    member this.Setup() =
        this.z <- ZSet.ofKeys [ 0 .. this.Size - 1 ]

    [<Benchmark(Baseline = true)>]
    member this.Map() = ZSet.map (fun x -> x * 2) this.z

    [<Benchmark>]
    member this.MapMonotone() = ZSet.mapMonotone (fun x -> x * 2) this.z
