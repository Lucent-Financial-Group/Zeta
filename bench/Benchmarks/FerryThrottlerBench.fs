module Zeta.Benchmarks.FerryThrottlerBench

open System
open System.Threading
open System.Threading.Tasks
open BenchmarkDotNet.Attributes
open Zeta.Core

/// Allocation / throughput of the result-arity ferry vs a TCS-per-item
/// baseline (ActionBlock.SendAsync's shape: one TaskCompletionSource + Task
/// per item, no reuse). Claim: after warmup the pooled `ProcessAsync`
/// path does not allocate a Task per item. Await via `let!` (GetAwaiter);
/// never `.AsTask()` — that manufactures a Task and is the alloc under test.
[<MemoryDiagnoser>]
type FerryVsTcsPerItem() =

    static let identity (boat: ReadOnlyMemory<int>) (_ct: CancellationToken) : Task<int array> =
        let a = Array.zeroCreate boat.Length
        boat.Span.CopyTo(Span<int>(a))
        Task.FromResult a

    [<DefaultValue(false)>]
    val mutable private throttler: FerryThrottler<int, int>

    [<Params(1, 4)>]
    member val Dop = 0 with get, set

    [<Params(256)>]
    member val N = 0 with get, set

    [<GlobalSetup>]
    member this.Setup() =
        let config = FerryThrottlerConfig.withFerries this.Dop
        this.throttler <- new FerryThrottler<int, int>(config, identity)

    [<GlobalCleanup>]
    member this.Cleanup() =
        (this.throttler :> IDisposable).Dispose()

    [<Benchmark(Baseline = true, Description = "TCS per item (ActionBlock.SendAsync shape)")>]
    member this.TcsPerItem() =
        let n = this.N
        let completions =
            Array.init n (fun _ ->
                TaskCompletionSource<int>(TaskCreationOptions.RunContinuationsAsynchronously))
        for i in 0 .. n - 1 do
            completions.[i].TrySetResult i |> ignore
        task {
            for i in 0 .. n - 1 do
                let! _ = completions.[i].Task
                ()
        }

    [<Benchmark(Description = "Ferry ProcessAsync pooled ValueTask")>]
    member this.FerryPooledValueTask() =
        let n = this.N
        let t = this.throttler
        task {
            let vts = Array.zeroCreate<ValueTask<int>> n
            for i in 0 .. n - 1 do
                vts.[i] <- t.ProcessAsync i
            for i in 0 .. n - 1 do
                let! _ = vts.[i]
                ()
        }
