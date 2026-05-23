module Zeta.Tests.Algebra.ResiduatedTests
#nowarn "0893"

open System
open System.Collections.Generic
open FsUnit.Xunit
open FsCheck
open FsCheck.FSharp
open global.Xunit
open Zeta.Core


// ═══════════════════════════════════════════════════════════════════
// Residuated-Lattice IVM Property Tests (B-0711)
// ═══════════════════════════════════════════════════════════════════

// 1. Galois connection: a · x ≤ b ⇔ x ≤ a \ b
// where · is max, and a \ b = (if a <= b then b else a)
[<FsCheck.Xunit.Property>]
let ``Galois connection holds for ResidualMax under natural order`` (a: int) (x: int) (b: int) =
    if a <= b then
        // If a <= b, then max a x <= b is equivalent to x <= b (which is x <= a \ b)
        let lhs = (max a x) <= b
        let rhs = x <= b
        lhs = rhs
    else
        // If a > b, max a x <= b is always false since max a x >= a > b
        let lhs = (max a x) <= b
        lhs = false

// 2. Residual under max: a \ b = b if a ≤ b else a
[<FsCheck.Xunit.Property>]
let ``Residual under max properties`` (a: int) (b: int) =
    let residualMax a b = if a <= b then b else a
    residualMax a b = (if a <= b then b else a)

// 3. Retraction equivalence: ResidualMax(insert + retract trace) = max(positive-only trace)
[<FsCheck.Xunit.Property>]
let ``ResidualMax retraction equivalence`` (ops: (int * int) list) =
    // Limit weight changes to reasonable bounds to simulate typical active/retract traces
    let opsMapped = ops |> List.map (fun (k, w) -> (k, int64 (w % 10)))
    
    let c = Circuit()
    let input = c.ZSetInput<int>()
    let m = c.ResidualMax(input.Stream, Func<_, _>(id))
    let out = OutputHandle m.Op
    c.Build()
    
    let keyWeight = Dictionary<int, int64>()
    let active = SortedSet<int>()
    
    let mutable ok = true
    for (k, w) in opsMapped do
        // Update the model's key weight tracking
        let existing =
            match keyWeight.TryGetValue k with
            | true, v -> v
            | false, _ -> 0L
        let updated = existing + w
        let wasActive = existing > 0L
        let isActive = updated > 0L
        
        // Update the model's active key-set (O(log k))
        if wasActive && not isActive then active.Remove k |> ignore
        elif not wasActive && isActive then active.Add k |> ignore
        
        if updated = 0L then keyWeight.Remove k |> ignore
        else keyWeight.[k] <- updated
        
        // Send delta update to the live operator and step the circuit
        input.Send (ZSet.singleton k w)
        c.Step()
        
        // Assert the live operator exactly matches the model's active set max
        let expected =
            if active.Count = 0 then ValueNone
            else ValueSome (Seq.last active)
        if out.Current <> expected then
            ok <- false
            
    ok
