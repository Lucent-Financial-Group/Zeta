module Zeta.Feldera.Bench.Queries

open System
open BenchmarkDotNet.Attributes
open Zeta.Core
open Zeta.Feldera.Bench.NexmarkGen


/// Nexmark Q1 — projection only. Simplest benchmark: pass-through
/// `bid.price` × currency conversion factor.
///
/// Circuit is built once. The tick is Send(one batch) + Step — not
/// reconstruct-the-circuit and not N singleton Sends (pairwise add).
[<MemoryDiagnoser>]
type NexmarkQ1 () =
    let mutable prices : int64 array = [||]
    let mutable batch = ZSet<int64>.Empty
    let mutable c : Circuit = Unchecked.defaultof<_>
    let mutable input : ZSetInputHandle<int64> = Unchecked.defaultof<_>

    [<Params(10_000, 100_000)>]
    member val EventCount : int = 0 with get, set

    [<GlobalSetup>]
    member this.Setup () =
        prices <-
            generate 42 this.EventCount
            |> Seq.choose (function BidEv b -> Some b | _ -> None)
            |> Seq.map (fun b -> b.Price)
            |> Array.ofSeq
        batch <- ZSet.ofArray prices
        c <- Circuit.create ()
        input <- c.ZSetInput<int64>()
        // p * 100 is non-decreasing on generated Nexmark prices (non-negative,
        // no int64 wrap). Map would sort; MapMonotone is O(n) coalesce.
        let mapped = c.MapMonotone(input.Stream, Func<int64, int64>(fun p -> p * 100L))
        c.Output mapped |> ignore
        c.Build()

    [<Benchmark(Baseline = true)>]
    member _.Q1_DbspCore () =
        input.Send batch
        c.Step()


/// Nexmark Q2 — filter. Subset of bids above a threshold.
[<MemoryDiagnoser>]
type NexmarkQ2 () =
    let mutable prices : int64 array = [||]
    let mutable batch = ZSet<int64>.Empty
    let mutable c : Circuit = Unchecked.defaultof<_>
    let mutable input : ZSetInputHandle<int64> = Unchecked.defaultof<_>

    [<Params(10_000, 100_000)>]
    member val EventCount : int = 0 with get, set

    [<GlobalSetup>]
    member this.Setup () =
        prices <-
            generate 42 this.EventCount
            |> Seq.choose (function BidEv b -> Some b | _ -> None)
            |> Seq.map (fun b -> b.Price)
            |> Array.ofSeq
        batch <- ZSet.ofArray prices
        c <- Circuit.create ()
        input <- c.ZSetInput<int64>()
        let filtered =
            c.Filter(input.Stream, Func<int64, bool>(fun p -> p > 5000L))
        c.Output filtered |> ignore
        c.Build()

    [<Benchmark>]
    member _.Q2_DbspCore () =
        input.Send batch
        c.Step()


/// Nexmark Q1 with unique bid identity. `|Z-set| = EventCount`.
/// MapMonotone is legal: Idx is unique and unchanged, Price * 100 is
/// non-decreasing on non-negative prices. This is the Big-O compare
/// path vs Feldera (their Q1 maps unique Bid records).
[<MemoryDiagnoser>]
type NexmarkQ1Unique () =
    let mutable batch = ZSet<BidRow>.Empty
    let mutable c : Circuit = Unchecked.defaultof<_>
    let mutable input : ZSetInputHandle<BidRow> = Unchecked.defaultof<_>

    [<Params(10_000, 100_000)>]
    member val EventCount : int = 0 with get, set

    [<GlobalSetup>]
    member this.Setup () =
        batch <- ZSet.ofArray (generateBids 42 this.EventCount)
        c <- Circuit.create ()
        input <- c.ZSetInput<BidRow>()
        let mapped =
            c.MapMonotone(input.Stream, Func<BidRow, BidRow>(fun r -> { r with Price = r.Price * 100L }))
        c.Output mapped |> ignore
        c.Build()

    [<Benchmark>]
    member _.Q1_Unique () =
        input.Send batch
        c.Step()


/// Nexmark Q2 with unique bid identity. Filter does not coalesce keys.
[<MemoryDiagnoser>]
type NexmarkQ2Unique () =
    let mutable batch = ZSet<BidRow>.Empty
    let mutable c : Circuit = Unchecked.defaultof<_>
    let mutable input : ZSetInputHandle<BidRow> = Unchecked.defaultof<_>

    [<Params(10_000, 100_000)>]
    member val EventCount : int = 0 with get, set

    [<GlobalSetup>]
    member this.Setup () =
        batch <- ZSet.ofArray (generateBids 42 this.EventCount)
        c <- Circuit.create ()
        input <- c.ZSetInput<BidRow>()
        let filtered =
            c.Filter(input.Stream, Func<BidRow, bool>(fun r -> r.Price > 5000L))
        c.Output filtered |> ignore
        c.Build()

    [<Benchmark>]
    member _.Q2_Unique () =
        input.Send batch
        c.Step()
