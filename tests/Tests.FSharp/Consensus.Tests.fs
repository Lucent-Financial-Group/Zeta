module Zeta.Tests.ConsensusTests

open System
open Xunit
open FsCheck
open FsCheck.Xunit
open Zeta.Core.Consensus

let otto = NodeId "otto"
let vera = NodeId "vera"
let riven = NodeId "riven"
let lior = NodeId "lior"
let now = DateTimeOffset.UtcNow

let vote node value =
    { Node = node; Value = value; Timestamp = now }

[<Fact>]
let ``4 nodes unanimous — commits`` () =
    let votes = [ vote otto "merge"; vote vera "merge"; vote riven "merge"; vote lior "merge" ]
    let result = decide votes
    match result with
    | Committed(v, q, t) ->
        Assert.Equal("merge", v)
        Assert.Equal(4, t)
        Assert.True(q >= 3)
    | Rejected _ -> Assert.Fail "expected commit"

[<Fact>]
let ``4 nodes, 1 disagrees — still commits (3 >= threshold)`` () =
    let votes = [ vote otto "merge"; vote vera "merge"; vote riven "reject"; vote lior "merge" ]
    let result = decide votes
    match result with
    | Committed(v, q, _) ->
        Assert.Equal("merge", v)
        Assert.Equal(3, q)
    | Rejected _ -> Assert.Fail "expected commit with 3/4"

[<Fact>]
let ``4 nodes, 2 disagree — rejects (2 < threshold)`` () =
    let votes = [ vote otto "merge"; vote vera "merge"; vote riven "reject"; vote lior "reject" ]
    let result = decide votes
    match result with
    | Committed _ -> Assert.Fail "expected rejection with 2/4"
    | Rejected(reason, best, total) ->
        Assert.Equal(2, best)
        Assert.Equal(4, total)
        Assert.Contains("no quorum", reason)

[<Fact>]
let ``empty votes — rejects`` () =
    let result = decide<string> []
    Assert.False(isCommitted result)

[<Fact>]
let ``quorum threshold for N=4 is 3`` () =
    Assert.Equal(3, quorumThreshold 4)

[<Fact>]
let ``quorum threshold for N=7 is 5`` () =
    Assert.Equal(5, quorumThreshold 7)

[<Fact>]
let ``committedValue extracts on commit`` () =
    let votes = [ vote otto 42; vote vera 42; vote riven 42 ]
    let result = decide votes
    Assert.Equal(Some 42, committedValue result)

[<Fact>]
let ``committedValue returns None on reject`` () =
    let votes = [ vote otto 1; vote vera 2; vote riven 3; vote lior 4 ]
    let result = decide votes
    Assert.Equal(None, committedValue result)

[<Property>]
let ``unanimous votes always commit`` (NonEmptyArray (values: int array)) =
    let v = values[0]
    let votes = values |> Array.mapi (fun i _ -> vote (NodeId $"n{i}") v) |> Array.toList
    isCommitted (decide votes)
