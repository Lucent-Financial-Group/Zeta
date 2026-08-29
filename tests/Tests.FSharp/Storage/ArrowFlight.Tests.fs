module Zeta.Tests.Storage.ArrowFlightTests

open System.Threading
open System.Threading.Tasks
open FsUnit.Xunit
open global.Xunit
open Zeta.Core


let private int64Flight () : ArrowFlight.IArrowFlight<int64> =
    ArrowFlight.InProcessFlight(ArrowInt64Serializer() :> ISerializer<int64>)
    :> ArrowFlight.IArrowFlight<int64>

let private path segs = ArrowFlight.Descriptor.Path segs


[<Fact>]
let ``DoPut then DoGet round-trips including negative weights`` () =
    task {
        let f = int64Flight ()
        let desc = path [ "shard"; "0" ]
        do! f.DoPut(desc, ZSet.ofSeq [ 1L, 3L; 2L, -1L ], CancellationToken.None)
        let! got = f.DoGet(desc, CancellationToken.None)
        got.[1L] |> should equal 3L
        got.[2L] |> should equal -1L
    }


[<Fact>]
let ``DoGet of a never-put path is empty, not an error`` () =
    task {
        let f = int64Flight ()
        let! got = f.DoGet(path [ "missing" ], CancellationToken.None)
        ZSet.isEmpty got |> should be True
    }


[<Fact>]
let ``DoPut replaces the snapshot; it does not Z-set-add`` () =
    task {
        let f = int64Flight ()
        let desc = path [ "snap" ]
        do! f.DoPut(desc, ZSet.ofSeq [ 1L, 1L ], CancellationToken.None)
        do! f.DoPut(desc, ZSet.ofSeq [ 1L, 9L ], CancellationToken.None)
        let! got = f.DoGet(desc, CancellationToken.None)
        got.[1L] |> should equal 9L
    }


[<Fact>]
let ``DoExchange integrates deltas so both peers converge`` () =
    task {
        let f = int64Flight ()
        let desc = path [ "ex" ]
        let! after1 = f.DoExchange(desc, ZSet.ofSeq [ 1L, 1L ], CancellationToken.None)
        after1.[1L] |> should equal 1L
        let! after2 = f.DoExchange(desc, ZSet.ofSeq [ 1L, 1L ], CancellationToken.None)
        after2.[1L] |> should equal 2L
        let! got = f.DoGet(desc, CancellationToken.None)
        got.[1L] |> should equal 2L
    }


[<Fact>]
let ``DoExchange retraction that cancels the snapshot leaves empty`` () =
    task {
        let f = int64Flight ()
        let desc = path [ "retract" ]
        do! f.DoPut(desc, ZSet.ofSeq [ 1L, 3L ], CancellationToken.None)
        let! after = f.DoExchange(desc, ZSet.ofSeq [ 1L, -3L ], CancellationToken.None)
        ZSet.isEmpty after |> should be True
        let! got = f.DoGet(desc, CancellationToken.None)
        ZSet.isEmpty got |> should be True
    }


[<Fact>]
let ``two hub clients share one store: A DoPut is B DoGet`` () =
    task {
        let hub = ArrowFlight.InProcessHub(ArrowInt64Serializer() :> ISerializer<int64>)
        let a = hub.Connect()
        let b = hub.Connect()
        let desc = path [ "peer" ]
        do! a.DoPut(desc, ZSet.ofSeq [ 7L, 1L ], CancellationToken.None)
        let! got = b.DoGet(desc, CancellationToken.None)
        got.[7L] |> should equal 1L
    }


[<Fact>]
let ``Path and Command descriptors do not collide`` () =
    task {
        let f = int64Flight ()
        let p = path [ "x" ]
        let c = ArrowFlight.Descriptor.Command [| 1uy |]
        do! f.DoPut(p, ZSet.ofSeq [ 1L, 1L ], CancellationToken.None)
        do! f.DoPut(c, ZSet.ofSeq [ 1L, 9L ], CancellationToken.None)
        let! gp = f.DoGet(p, CancellationToken.None)
        let! gc = f.DoGet(c, CancellationToken.None)
        gp.[1L] |> should equal 1L
        gc.[1L] |> should equal 9L
    }


[<Fact>]
let ``string-keyed Flight round-trips via ArrowStringSerializer`` () =
    task {
        let f =
            ArrowFlight.InProcessFlight(ArrowStringSerializer() :> ISerializer<string>)
            :> ArrowFlight.IArrowFlight<string>
        let desc = path [ "names" ]
        do! f.DoPut(desc, ZSet.ofSeq [ "alpha", 1L; "uni-é", -2L ], CancellationToken.None)
        let! got = f.DoGet(desc, CancellationToken.None)
        got.["alpha"] |> should equal 1L
        got.["uni-é"] |> should equal -2L
    }


[<Fact>]
let ``cancelled DoGet throws OperationCanceledException`` () =
    let f = int64Flight ()
    use cts = new CancellationTokenSource()
    cts.Cancel()
    Assert.Throws<System.OperationCanceledException>(fun () ->
        f.DoGet(path [ "x" ], cts.Token).GetAwaiter().GetResult() |> ignore)
    |> ignore


[<Fact>]
let ``concurrent DoExchange of +1 is a lossless fold`` () =
    task {
        let f = int64Flight ()
        let desc = path [ "race" ]
        let n = 32
        Parallel.For(
            0,
            n,
            fun _ ->
                f.DoExchange(desc, ZSet.ofSeq [ 1L, 1L ], CancellationToken.None)
                    .GetAwaiter()
                    .GetResult()
                |> ignore)
        |> ignore
        let! got = f.DoGet(desc, CancellationToken.None)
        got.[1L] |> should equal (int64 n)
    }
