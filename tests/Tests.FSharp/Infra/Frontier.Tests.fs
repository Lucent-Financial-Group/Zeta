module Zeta.Tests.Infra.FrontierTests
#nowarn "0893"

open System
open FsCheck
open FsCheck.Xunit
open FsUnit.Xunit
open global.Xunit
open Zeta.Core


[<Fact>]
let ``empty frontier ClosedThrough is MinValue (Akidau, not Timely +inf)`` () =
    Frontier.empty.ClosedThrough |> should equal Int64.MinValue
    Frontier.empty.IsEmpty |> should be True
    Watermark.combine [] |> should equal Frontier.empty.ClosedThrough


[<Fact>]
let ``singleton ClosedThrough is that shard's watermark`` () =
    let f = Frontier.singleton 3 40L
    f.ClosedThrough |> should equal 40L
    match f.WatermarkOf 3 with
    | ValueSome w -> w |> should equal 40L
    | ValueNone -> failwith "expected shard 3"
    match f.WatermarkOf 9 with
    | ValueNone -> ()
    | ValueSome _ -> failwith "unknown shard must not invent a watermark"


[<Fact>]
let ``ClosedThrough is min across shards (Akidau slowest-source)`` () =
    let f = Frontier.ofSeq [ 0, 100L; 1, 40L; 2, 80L ]
    f.ClosedThrough |> should equal 40L
    Watermark.combine [ 100L; 40L; 80L ] |> should equal f.ClosedThrough


[<Fact>]
let ``Advance is monotone per shard and never walks backwards`` () =
    let f0 = Frontier.singleton 0 10L
    let f1 = f0.Advance(0, 25L)
    f1.ClosedThrough |> should equal 25L
    let f2 = f1.Advance(0, 12L)
    obj.ReferenceEquals(f1, f2) |> should be True
    f2.ClosedThrough |> should equal 25L


[<Fact>]
let ``Advance of a new shard lowers ClosedThrough when the new source is slower`` () =
    let f = Frontier.singleton 0 100L
    let g = f.Advance(1, 30L)
    g.ClosedThrough |> should equal 30L
    g.ShardCount |> should equal 2


[<Fact>]
let ``OfSeq duplicate shards keep max (Advance-from-empty)`` () =
    let f = Frontier.ofSeq [ 0, 10L; 0, 40L; 0, 25L ]
    f.ShardCount |> should equal 1
    f.ClosedThrough |> should equal 40L


[<Fact>]
let ``Merge is conservative min on overlap and unions disjoint shards`` () =
    let a = Frontier.ofSeq [ 0, 10L; 1, 50L ]
    let b = Frontier.ofSeq [ 0, 7L; 2, 9L ]
    let m = Frontier.merge a b
    m.ClosedThrough |> should equal 7L
    match m.WatermarkOf 0, m.WatermarkOf 1, m.WatermarkOf 2 with
    | ValueSome 7L, ValueSome 50L, ValueSome 9L -> ()
    | other -> failwithf "unexpected %A" other


[<Fact>]
let ``Merge empty is identity`` () =
    let f = Frontier.singleton 1 8L
    Frontier.merge Frontier.empty f |> should equal f
    Frontier.merge f Frontier.empty |> should equal f
    Frontier.merge Frontier.empty Frontier.empty |> should equal Frontier.empty


[<Fact>]
let ``IsLate follows Watermark.isLate on ClosedThrough`` () =
    let f = Frontier.ofSeq [ 0, 100L; 1, 80L ]
    f.IsLate 80L |> should equal (Watermark.isLate 80L 80L)
    f.IsLate 79L |> should be True
    f.IsLate 81L |> should be False
    f.IsClosedOn(0, 100L) |> should be True
    f.IsClosedOn(0, 101L) |> should be False
    f.IsClosedOn(9, 0L) |> should be False


[<Property>]
let ``Merge is idempotent`` (xs: (int * int64) list) =
    let f = Frontier.ofSeq (xs |> List.truncate 8)
    Frontier.merge f f = f


[<Property>]
let ``Merge is commutative`` (xs: (int * int64) list) (ys: (int * int64) list) =
    let a = Frontier.ofSeq (xs |> List.truncate 6)
    let b = Frontier.ofSeq (ys |> List.truncate 6)
    Frontier.merge a b = Frontier.merge b a


[<Property>]
let ``Merge is associative``
    (xs: (int * int64) list) (ys: (int * int64) list) (zs: (int * int64) list) =
    let a = Frontier.ofSeq (xs |> List.truncate 5)
    let b = Frontier.ofSeq (ys |> List.truncate 5)
    let c = Frontier.ofSeq (zs |> List.truncate 5)
    Frontier.merge (Frontier.merge a b) c = Frontier.merge a (Frontier.merge b c)
