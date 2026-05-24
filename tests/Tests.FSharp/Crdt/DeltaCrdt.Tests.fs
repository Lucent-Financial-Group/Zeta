module Zeta.Tests.Crdt.DeltaCrdtTests

open Xunit
open Zeta.Core


module DvvTests =

    [<Fact>]
    let ``Empty DVV has empty context and no dot`` () =
        let dvv = Dvv.Empty
        Assert.True(Map.isEmpty dvv.Context)
        Assert.True(dvv.Dot.IsNone)

    [<Fact>]
    let ``Sync produces a dot and increments counter`` () =
        let dvv = Dvv.Empty.Sync("A")
        Assert.Equal(Some(struct ("A", 1L)), dvv.Dot)
        Assert.Equal(1L, Map.find "A" dvv.Context)

    [<Fact>]
    let ``successive Syncs by same replica increment counter`` () =
        let d1 = Dvv.Empty.Sync("A")
        let d2 = d1.Sync("A")
        let d3 = d2.Sync("A")
        Assert.Equal(Some(struct ("A", 3L)), d3.Dot)
        Assert.Equal(3L, Map.find "A" d3.Context)

    [<Fact>]
    let ``Syncs by different replicas track independently`` () =
        let d1 = Dvv.Empty.Sync("A")
        let d2 = d1.Sync("B")
        Assert.Equal(1L, Map.find "A" d2.Context)
        Assert.Equal(1L, Map.find "B" d2.Context)
        Assert.Equal(Some(struct ("B", 1L)), d2.Dot)

    [<Fact>]
    let ``Before detects causal ordering`` () =
        let a = Dvv.Empty.Sync("A")
        let b = a.Sync("A")
        Assert.True(Dvv.Before a b)
        Assert.False(Dvv.Before b a)

    [<Fact>]
    let ``Before is false for identical DVVs`` () =
        let a = Dvv.Empty.Sync("A")
        Assert.False(Dvv.Before a a)

    [<Fact>]
    let ``Concurrent detects truly concurrent events`` () =
        let a = Dvv.Empty.Sync("A")
        let b = Dvv.Empty.Sync("B")
        Assert.True(Dvv.Concurrent a b)

    [<Fact>]
    let ``Concurrent is false for causally ordered events`` () =
        let a = Dvv.Empty.Sync("A")
        let b = a.Sync("A")
        Assert.False(Dvv.Concurrent a b)

    [<Fact>]
    let ``Concurrent is false for equal DVVs`` () =
        let a = Dvv.Empty.Sync("A")
        Assert.False(Dvv.Concurrent a a)

    [<Fact>]
    let ``Join takes elementwise max`` () =
        let a = Dvv.Empty.Sync("A").Sync("A")
        let b = Dvv.Empty.Sync("B").Sync("B").Sync("B")
        let joined = Dvv.Join a b
        Assert.Equal(2L, Map.find "A" joined.Context)
        Assert.Equal(3L, Map.find "B" joined.Context)
        Assert.True(joined.Dot.IsNone)

    [<Fact>]
    let ``Join with overlapping replicas takes max`` () =
        let a = Dvv.Empty.Sync("A").Sync("A").Sync("A")
        let b = Dvv.Empty.Sync("A")
        let joined = Dvv.Join a b
        Assert.Equal(3L, Map.find "A" joined.Context)


module GCounterDeltaTests =

    [<Fact>]
    let ``increment produces a delta with correct causality`` () =
        let d = GCounterDelta.increment "A" 5L Dvv.Empty
        Assert.Equal(5L, d.Payload.Value)
        Assert.Equal(Some(struct ("A", 1L)), d.Causality.Dot)

    [<Fact>]
    let ``apply merges delta into local state`` () =
        let local = GCounter.Empty.Increment("A", 10L)
        let delta = GCounterDelta.increment "B" 7L Dvv.Empty
        let merged = GCounterDelta.apply local delta
        Assert.Equal(17L, merged.Value)

    [<Fact>]
    let ``negative increment is rejected`` () =
        Assert.Throws<System.ArgumentException>(fun () ->
            GCounterDelta.increment "A" -1L Dvv.Empty |> ignore)

    [<Fact>]
    let ``zero increment is valid`` () =
        let d = GCounterDelta.increment "A" 0L Dvv.Empty
        Assert.Equal(0L, d.Payload.Value)

    [<Fact>]
    let ``causality chain tracks successive increments`` () =
        let d1 = GCounterDelta.increment "A" 5L Dvv.Empty
        let d2 = GCounterDelta.increment "A" 3L d1.Causality
        Assert.Equal(Some(struct ("A", 2L)), d2.Causality.Dot)
        Assert.True(Dvv.Before d1.Causality d2.Causality)


module PNCounterDeltaTests =

    [<Fact>]
    let ``positive increment tracks causality`` () =
        let d = PNCounterDelta.increment "A" 5L Dvv.Empty
        Assert.Equal(5L, d.Payload.Value)
        Assert.Equal(Some(struct ("A", 1L)), d.Causality.Dot)

    [<Fact>]
    let ``negative decrement works`` () =
        let d = PNCounterDelta.increment "A" -3L Dvv.Empty
        Assert.Equal(-3L, d.Payload.Value)

    [<Fact>]
    let ``apply merges into local`` () =
        let local = PNCounter.Empty.Increment("A", 10L)
        let delta = PNCounterDelta.increment "B" -4L Dvv.Empty
        let merged = PNCounterDelta.apply local delta
        Assert.Equal(6L, merged.Value)


module OrSetDeltaTests =

    [<Fact>]
    let ``addElement creates a delta with the element`` () =
        let d = OrSetDelta.addElement 42 "A" Dvv.Empty
        let values = d.Payload.Value |> Seq.toList
        Assert.Contains(42, values)
        Assert.Equal(Some(struct ("A", 1L)), d.Causality.Dot)

    [<Fact>]
    let ``apply merges into local set`` () =
        let local = OrSet<int>.Empty.Add(1).Add(2)
        let delta = OrSetDelta.addElement 3 "B" Dvv.Empty
        let merged = OrSetDelta.apply local delta
        let values = merged.Value |> Seq.toList
        Assert.Contains(1, values)
        Assert.Contains(2, values)
        Assert.Contains(3, values)
