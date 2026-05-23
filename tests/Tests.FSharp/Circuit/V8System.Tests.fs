module Zeta.Tests.Circuit.V8SystemTests

open System
open FsCheck
open FsCheck.Xunit
open FsUnit.Xunit
open global.Xunit
open Zeta.Core

[<Fact>]
let ``TensorBridge 2D creation and zero-copy indexing works`` () =
    let tensor = TensorBridge<float>.Create2D(2, 3, 0.0)
    tensor.Shape |> should equal [| 2; 3 |]
    tensor.Data.Length |> should equal 6
    
    // Mutate internal data span safely (zero copy representation)
    tensor.Data.[0] <- 1.5
    tensor.Data.[4] <- 4.2
    
    tensor.Item(0, 0) |> should equal 1.5
    tensor.Item(1, 1) |> should equal 4.2

[<Fact>]
let ``4-particle cycle observes, limits, chooses, and emits correctly`` () =
    let gBase = GnosticBase<string>.Empty
    
    // 1. Observe
    let obs = V8Primitives.observe L1Cache gBase "test-meta"
    obs.Level |> should equal L1Cache
    obs.Tag |> should equal "test-meta"
    
    // 2. Limit (Simulation)
    let dFrame = { BaseState = "a"; Metadata = "meta" }
    let cFrame = { BaseState = "b"; Metadata = "meta" }
    let preview = V8Primitives.limit dFrame cFrame
    preview.Dialectical.BaseState |> should equal "a"
    preview.Classical.BaseState |> should equal "b"
    
    // 3. Choose path with lowest energy
    let paths = [
        { EnergyCost = 10.0; ComposedFrame = dFrame }
        { EnergyCost = 2.5; ComposedFrame = cFrame }
        { EnergyCost = 5.0; ComposedFrame = dFrame }
    ]
    let chosen = V8Primitives.choose paths
    chosen.EnergyCost |> should equal 2.5
    chosen.ComposedFrame.BaseState |> should equal "b"
    
    // 4. Emit
    let (level, emittedFrame) = V8Primitives.emit L1Cache chosen.ComposedFrame
    level |> should equal L1Cache
    emittedFrame.BaseState |> should equal "b"

[<Fact>]
let ``SignalBlock cancels incoming messages to net-zero via retraction-dual`` () =
    let blocker : SignalBlock<string> = SignalBlock<string>.Empty.Add("channel-A")
    blocker.IsBlocked "channel-A" |> should be True
    blocker.IsBlocked "channel-B" |> should be False
    
    let delta : ZSet<string> = ZSet.singleton "a" 3L
    
    // Blocking applies retraction dual (ZSet.neg)
    let blockedResult = blocker.Block("channel-A", delta)
    ZSet.lookup "a" blockedResult |> should equal -3L
    
    // Adding standard delta and blocked delta yields net-zero
    let netZero = ZSet.add delta blockedResult
    netZero.IsEmpty |> should be True

[<Fact>]
let ``Eve-Protocol gateSignal enforces polymorphic diplomacy trust tiers`` () =
    let blocker : SignalBlock<string> = SignalBlock<string>.Empty
    let delta : ZSet<string> = ZSet.singleton "msg" 1L
    
    // 1. InsideTrust -> Auto-admit
    let resultInside = V8Primitives.gateSignal InsideTrust "ch" delta 0.1 blocker
    match resultInside with
    | Admit d -> ZSet.lookup "msg" d |> should equal 1L
    | _ -> failwith "Expected Admit"
    
    // 2. AtTrustBoundary -> Reputation based
    let resultHighRep = V8Primitives.gateSignal AtTrustBoundary "ch" delta 0.9 blocker
    match resultHighRep with
    | Admit d -> ZSet.lookup "msg" d |> should equal 1L
    | _ -> failwith "Expected Admit"
    
    let resultMedRep = V8Primitives.gateSignal AtTrustBoundary "ch" delta 0.6 blocker
    match resultMedRep with
    | Negotiated (d, msg) ->
        ZSet.lookup "msg" d |> should equal 1L
        msg |> should equal "Accept under medium trust baseline"
    | _ -> failwith "Expected Negotiated"
        
    let resultLowRep = V8Primitives.gateSignal AtTrustBoundary "ch" delta 0.2 blocker
    match resultLowRep with
    | Reject -> ()
    | _ -> failwith "Expected Reject"
    
    // 3. OutsideTrust -> Auto-reject
    let resultOutside = V8Primitives.gateSignal OutsideTrust "ch" delta 0.9 blocker
    match resultOutside with
    | Reject -> ()
    | _ -> failwith "Expected Reject"
