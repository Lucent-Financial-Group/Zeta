module Zeta.Tests.Properties.PolicyRelocationTests

open System
open FsUnit.Xunit
open global.Xunit
open Zeta.Core


[<Fact>]
let ``same filter circuit on same deltas produces identical output`` () =
    task {
        let c1 = Circuit.create ()
        let c2 = Circuit.create ()

        let input1 = c1.ZSetInput<int>()
        let filtered1 = c1.Filter(input1.Stream, Func<int, bool>(fun x -> x > 5))
        let out1 = c1.Output filtered1

        let input2 = c2.ZSetInput<int>()
        let filtered2 = c2.Filter(input2.Stream, Func<int, bool>(fun x -> x > 5))
        let out2 = c2.Output filtered2

        let deltas = [
            ZSet.ofSeq [| (3, 1L); (7, 1L); (10, 1L) |]
            ZSet.ofSeq [| (7, -1L); (12, 1L) |]
            ZSet.ofSeq [| (1, 1L); (99, 1L); (5, 1L) |]
        ]

        for delta in deltas do
            input1.Send delta
            input2.Send delta
            do! c1.StepAsync()
            do! c2.StepAsync()
            out1.Current |> should equal out2.Current
    }


[<Fact>]
let ``relocated circuit preserves semantics across 100 random deltas`` () =
    task {
        let rng = Random(69420)
        let c1 = Circuit.create ()
        let c2 = Circuit.create ()

        let input1 = c1.ZSetInput<int>()
        let filtered1 = c1.Filter(input1.Stream, Func<int, bool>(fun x -> x > 50))
        let out1 = c1.Output filtered1

        let input2 = c2.ZSetInput<int>()
        let filtered2 = c2.Filter(input2.Stream, Func<int, bool>(fun x -> x > 50))
        let out2 = c2.Output filtered2

        for _ in 1 .. 100 do
            let size = rng.Next(1, 20)
            let entries =
                Array.init size (fun _ ->
                    let key = rng.Next(0, 100)
                    let weight = if rng.Next(2) = 0 then 1L else -1L
                    (key, weight))
            let delta = ZSet.ofSeq entries
            input1.Send delta
            input2.Send delta
            do! c1.StepAsync()
            do! c2.StepAsync()
            out1.Current |> should equal out2.Current
    }
