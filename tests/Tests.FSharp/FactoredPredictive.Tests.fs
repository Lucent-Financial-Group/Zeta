module Zeta.Tests.FactoredPredictiveTests

open System
open Xunit
open Zeta.Research

let private require = function Ok value -> value | Error reason -> failwithf "%A" reason
let private near a b = Assert.True(abs (a-b) < 2e-12, sprintf "%.17g != %.17g" a b)

[<Fact>]
let ``shared contractions agree with dense for every short word with and without noise`` () =
    for n in 2..4 do
        for epsilon in [0.;0.2;1.] do
            let dense = SharedFactorFilter.create n epsilon SharedFactorFilter.Dense |> require
            let tensor = SharedFactorFilter.create n epsilon SharedFactorFilter.TensorJoint |> require
            let projected = SharedFactorFilter.create n epsilon SharedFactorFilter.ProjectedProduct |> require
            for length in 0..2 do
                for tokens in PredictiveStateLaws.words (1 <<< n) length do
                    let expected, p = SharedFactorFilter.after dense tokens |> require
                    let state, q = SharedFactorFilter.after tensor tokens |> require
                    Array.iter2 near expected state
                    Array.iter2 near p q
                    near 1.0 (Array.sum q)
                    let reduced, r = SharedFactorFilter.after projected tokens |> require
                    near 1.0 (Array.sum r)
                    if epsilon = 0.0 || epsilon = 1.0 then
                        Array.iter2 near expected (SharedFactorFilter.expand projected reduced)
                        Array.iter2 near p r

[<Fact>]
let ``common noise produces correlations that product projection discards`` () =
    let dense = SharedFactorFilter.create 3 0.2 SharedFactorFilter.Dense |> require
    let projected = SharedFactorFilter.create 3 0.2 SharedFactorFilter.ProjectedProduct |> require
    let state, p = SharedFactorFilter.after dense [|0;0;0;7|] |> require
    let marginal, q = SharedFactorFilter.after projected [|0;0;0;7|] |> require
    Assert.True(Array.map2 (fun a b -> abs (a-b)) p q |> Array.max > 1e-4)
    Assert.True(Array.map2 (fun a b -> abs (a-b)) state (SharedFactorFilter.expand projected marginal) |> Array.max > 1e-4)

[<Fact>]
let ``factor fixtures reject malformed inputs and repeated inference owns its output`` () =
    Assert.True(SharedFactorFilter.create 1 0.0 SharedFactorFilter.Dense |> Result.isError)
    Assert.True(SharedFactorFilter.create 5 0.0 SharedFactorFilter.Dense |> Result.isError)
    Assert.True(SharedFactorFilter.create 2 nan SharedFactorFilter.Dense |> Result.isError)
    for mode in [SharedFactorFilter.Dense;SharedFactorFilter.TensorJoint;SharedFactorFilter.ProjectedProduct] do
        let m = SharedFactorFilter.create 2 0.2 mode |> require
        for tokens in [null;[|-1|];[|4|];Array.zeroCreate 257] do Assert.True(SharedFactorFilter.after m tokens |> Result.isError)
        let state, _ = SharedFactorFilter.after m [|0|] |> require
        let old = Array.copy state
        state.[0] <- 123.0
        let next, _ = SharedFactorFilter.after m [|0|] |> require
        Array.iter2 near old next

[<Fact>]
let ``likelihood mixture is a conditional mean one martingale under the declared null`` () =
    for length in 2..8 do
        for word in PredictiveStateLaws.words 2 length do
            let now = LagChangeDetection.traceWith [|2;4|] word |> fun t -> Math.Exp(Array.last t.Known)
            let expected = [|0;1|] |> Array.sumBy (fun token ->
                let p = if token = word.[length-2] then 0.75 else 0.25
                let next = LagChangeDetection.traceWith [|2;4|] (Array.append word [|token|])
                p * Math.Exp(Array.last next.Known))
            near now expected

[<Fact>]
let ``wrong iid null alarms on a valid null history before any alternative starts`` () =
    let trace = LagChangeDetection.trace (Array.zeroCreate 63) |> require
    Assert.Equal(-1, trace.FirstKnown)
    Assert.InRange(trace.FirstWrongIid, 2, 62)
    trace.Known |> Array.iter (near 0.0)
    for tokens in [null;[|2|];Array.zeroCreate 513] do Assert.True(LagChangeDetection.trace tokens |> Result.isError)

[<Fact>]
let ``direct sum and orthogonality have different witnesses`` () =
    let u,v = [|1.;0.|], [|1.;1.|]
    let determinant = u.[0]*v.[1] - u.[1]*v.[0]
    near 1.0 determinant
    near 0.5 (pown (Array.map2 (*) u v |> Array.sum) 2 / (Array.sumBy (fun x -> x*x) u * Array.sumBy (fun x -> x*x) v))
    let rotate (x: float[]) = [| (x.[0]-x.[1])/sqrt 2.; (x.[0]+x.[1])/sqrt 2. |]
    let state,effect = [|0.3;0.7|], [|0.8;0.2|]
    near (Array.map2 (*) state effect |> Array.sum) (Array.map2 (*) (rotate state) (rotate effect) |> Array.sum)
    Assert.Equal(state.Length, (rotate state).Length)
