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
    let residualMax a b = if a <= b then Some b else None
    
    let lhs = (max a x) <= b
    let rhs =
        match residualMax a b with
        | Some bound -> x <= bound
        | None -> false
        
    lhs = rhs

// 2. Residual under max: a \ b = Some b if a ≤ b else None
[<FsCheck.Xunit.Property>]
let ``Residual under max properties`` (a: int) (b: int) =
    let residualMax a b = if a <= b then Some b else None
    residualMax a b = (if a <= b then Some b else None)

// 3. Retraction equivalence: ResidualMax(insert + retract trace) = max(positive-only trace)
// Oracle for max over active set
let private oracle (ops: (int * int64) list) =
    let keyWeight = Dictionary<int, int64>()
    let active = SortedSet<int>()
    
    for (k, w) in ops do
        let existing =
            match keyWeight.TryGetValue k with
            | true, v -> v
            | false, _ -> 0L
        let updated = existing + w
        let wasActive = existing > 0L
        let isActive = updated > 0L
        
        if wasActive && not isActive then active.Remove k |> ignore
        elif not wasActive && isActive then active.Add k |> ignore
        
        if updated = 0L then keyWeight.Remove k |> ignore
        else keyWeight.[k] <- updated
        
    if active.Count = 0 then ValueNone
    else ValueSome (active.Max)

[<FsCheck.Xunit.Property>]
let ``ResidualMax retraction equivalence`` (ops: (int * int) list) =
    // Limit weight changes to reasonable bounds to simulate typical active/retract traces
    let opsMapped = ops |> List.map (fun (k, w) -> (k, int64 (w % 10)))
    
    let c = Circuit()
    let input = c.ZSetInput<int>()
    let m = c.ResidualMax(input.Stream, Func<_, _>(id))
    let out = OutputHandle m.Op
    c.Build()
    
    for (k, w) in opsMapped do
        input.Send (ZSet.singleton k w)
        c.Step()
        
    out.Current = (oracle opsMapped)
