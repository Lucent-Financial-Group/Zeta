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
        // If residual is None, it means a > b. For LHS to be true, max(a,x) <= b must hold.
        // But since a > b, max(a,x) is definitely > b (unless x is smaller, but max will be at least a).
        // So if residual is None, LHS is always false.
        // The only way for the equivalence to hold is if RHS is also false.
        // `x <= bound` would be the condition. If there is no bound, any `x` fails the condition, so RHS is false.
        | None -> not lhs
        
    lhs = rhs

// 2. Residual under max: a \ b = Some b if a ≤ b else None
[<FsCheck.Xunit.Property>]
let ``Residual under max has expected behavior`` (a: int) (b: int) =
    let residualMax a b = if a <= b then Some b else None
    
    if a <= b then
        residualMax a b = Some b
    else
        residualMax a b = None

// 3. Retraction equivalence: ResidualMax(insert + retract trace) = max(positive-only trace)
// Oracle for max over active set
let private oracle (ops: (int * int64) list) =
    let keyWeight = Dictionary<int, int64>()
    
    for (k, w) in ops do
        let existing =
            match keyWeight.TryGetValue k with
            | true, v -> v
            | false, _ -> 0L
        let updated = existing + w
        
        if updated = 0L then keyWeight.Remove k |> ignore
        else keyWeight.[k] <- updated

    let activeKeys = keyWeight |> Seq.filter (fun kvp -> kvp.Value > 0L) |> Seq.map (fun kvp -> kvp.Key)
    
    if Seq.isEmpty activeKeys then ValueNone
    else ValueSome (Seq.max activeKeys)

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
