module Zeta.Tests.Circuit.DbspFrameTests

open System
open FsCheck
open FsCheck.Xunit
open FsUnit.Xunit
open global.Xunit
open Zeta.Core

[<Fact>]
let ``TimeAxis empty timeline has empty history`` () =
    let timeline = TimeAxis<string>.Empty
    timeline.History.IsEmpty |> should be True

[<Fact>]
let ``TimeAxis adding and retrieving state at timestamp`` () =
    let timeline = TimeAxis<string>.Empty
    let zs1 = ZSet.singleton "a" 2L
    let timeline' = timeline.Add(10L, zs1)
    
    // AsOf 10L should return zs1
    let stateAt10 = timeline'.AsOf 10L
    ZSet.lookup "a" stateAt10 |> should equal 2L
    
    // AsOf 9L should return empty
    let stateAt9 = timeline'.AsOf 9L
    stateAt9.IsEmpty |> should be True

[<Fact>]
let ``TimeAxis retraction cancels out state changes`` () =
    let timeline = TimeAxis<string>.Empty
    let zs1 = ZSet.singleton "a" 2L
    let zs2 = ZSet.singleton "a" -2L // retraction of 2 elements
    
    let timeline' = timeline.Add(10L, zs1).Add(10L, zs2)
    
    // Since 2 + (-2) = 0, history at 10L should be empty
    timeline'.History.ContainsKey 10L |> should be False
    (timeline'.AsOf 10L).IsEmpty |> should be True

[<Fact>]
let ``GnosticBase empty constructor is correct`` () =
    let gBase = GnosticBase<string>.Empty
    gBase.rememberWhen.History.IsEmpty |> should be True
    gBase.payAttention.Active.IsEmpty |> should be True

[<Fact>]
let ``Monadic composition layers meta-frames sequentially`` () =
    // Let's create a GnosticBase to run the composition on.
    let baseState = {
        rememberWhen = TimeAxis<string>.Empty.Add(1L, ZSet.singleton "a" 1L).Add(2L, ZSet.singleton "b" 1L)
        payAttention = { Active = ZSet.ofKeys [ "a"; "b"; "c" ] }
    }
    
    // Compose sequentially: we bind emotion, then prometheus
    let comp = composeFrame {
        let! emotion = twoWolvesEmotionFrame 1
        let! prometheus = prometheusMetricsFrame ()
        return (emotion, prometheus)
    }
    
    let (Composition run) = comp
    let result = run baseState
    
    // Let's verify type and result
    let (emotion, (prometheus, (emotion2, prometheus2))) = result
    
    // baseState.rememberWhen has 2 entries. active has 3.
    // balance = 2.0 / (3.0 + 1.0) = 0.5.
    // Since balance (0.5) <= threshold (1.0), EmotionMeta should have GoodWolf = 0.0, BadWolf = 1.0 / 0.6 = 1.666
    emotion.GoodWolfBasin |> should equal 0.0
    emotion.BadWolfBasin |> should (equalWithin 0.001) 1.6666666666666667
    
    // PrometheusMeta load = 3.0. CpuUsage = Min(100.0, 3.0 * 5.0) = 15.0
    prometheus.CpuUsage |> should equal 15.0
    prometheus.MemoryBytes |> should equal (3L * 1024L * 1024L)
    prometheus.UptimeSeconds |> should equal 2.0

[<Fact>]
let ``Applicative and! merge composes meta-frames in parallel`` () =
    let baseState = {
        rememberWhen = TimeAxis<string>.Empty.Add(1L, ZSet.singleton "a" 1L).Add(2L, ZSet.singleton "b" 1L)
        payAttention = { Active = ZSet.ofKeys [ "a"; "b"; "c" ] }
    }
    
    // Compose in parallel using and!
    let comp = composeFrame {
        let! emotion = twoWolvesEmotionFrame 1
        and! clifford = cliffordTaggedDims 2
        and! prometheus = prometheusMetricsFrame ()
        return (emotion, clifford, prometheus)
    }
    
    let (Composition run) = comp
    let result = run baseState
    
    // Verify parallel composition output
    let ((emotion, (clifford, prometheus)), (emotion2, clifford2, prometheus2)) = result
    
    emotion.GoodWolfBasin |> should equal 0.0
    clifford.Coordinates.Length |> should equal 2
    clifford.Coordinates.[0] |> should equal 3.0 // 3 * 1
    clifford.Coordinates.[1] |> should equal 6.0 // 3 * 2
    prometheus.CpuUsage |> should equal 15.0

[<Property>]
let ``TimeAxis retraction commutativity (group law)`` (xs: (string * int64 * int) list) =
    let inputs = 
        xs 
        |> List.map (fun (k, t, w) -> abs t, ZSet.singleton k (int64 w))
        
    let timeline1 =
        inputs
        |> List.fold (fun (acc: TimeAxis<string>) (t, zs) -> acc.Add(t, zs)) TimeAxis<string>.Empty
        
    let timeline2 =
        inputs
        |> List.rev
        |> List.fold (fun (acc: TimeAxis<string>) (t, zs) -> acc.Add(t, zs)) TimeAxis<string>.Empty
        
    if inputs.IsEmpty then
        true
    else
        let maxT = inputs |> List.map fst |> List.max
        let state1 = timeline1.AsOf maxT
        let state2 = timeline2.AsOf maxT
        state1 = state2
