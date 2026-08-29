module Zeta.Tests.Operators.WindowTests
#nowarn "0893"

open System
open System.Threading.Tasks
open FsUnit.Xunit
open global.Xunit
open Zeta.Core


[<Fact>]
let ``tumbling window groups by window index`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<int * int> ()  // (time, id)
        // size = 10 → windows [0..10), [10..20), [20..30)
        let windowed = c.TumblingWindow(input.Stream, Func<_, _>(fun (t, _) -> int64 t), 10L)
        let counts = c.GroupByCount(windowed, Func<_, _>(fst))
        let out = c.Output counts

        input.Send(ZSet.ofKeys [
            0, 100 ; 3, 101 ; 9, 102                        // window 0
            10, 103 ; 15, 104                               // window 1
            25, 105                                         // window 2
        ])
        do! c.StepAsync ()

        out.Current.[(0L, 3L)] |> should equal 1L
        out.Current.[(1L, 2L)] |> should equal 1L
        out.Current.[(2L, 1L)] |> should equal 1L
    }


[<Fact>]
let ``circuit CE composes cleanly`` () =
    task {
        let build : CircuitM<ZSetInputHandle<int> * OutputHandle<ZSet<int>>> =
            Dsl.circuit {
                let! input = Dsl.zsetInput<int>
                let! doubled = input.Stream |> Dsl.map (fun x -> x * 2)
                let! filtered = doubled |> Dsl.filter (fun x -> x > 5)
                let! out = filtered |> Dsl.output
                return input, out
            }

        let c = Circuit.create ()
        let input, out = build.Invoke c
        c.Build ()

        input.Send(ZSet.ofKeys [ 1 ; 2 ; 3 ; 4 ; 5 ])
        do! c.StepAsync ()

        out.Current.[2] |> should equal 0L     // 1*2=2 < 5
        out.Current.[4] |> should equal 0L     // 2*2=4 < 5
        out.Current.[6] |> should equal 1L     // 3*2=6 > 5
        out.Current.[8] |> should equal 1L     // 4*2=8 > 5
        out.Current.[10] |> should equal 1L    // 5*2=10 > 5
    }


// ─── SlidingWindow / TumblingWindow edge cases (moved from AdvancedTests / CoverageTests2 / SpineAndSafetyTests) ──

[<Fact>]
let ``SlidingWindow emits a row per overlapping window`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<int * int> ()   // (time, id)
        // windowSize=10, slide=5 → windows [0,10), [5,15), [10,20)…
        let windowed = c.SlidingWindow(
                         input.Stream,
                         Func<_, _>(fun (t, _) -> int64 t),
                         10L, 5L)
        let out = c.Output windowed
        input.Send(ZSet.ofKeys [ 7, 101 ])   // belongs to [0,10) and [5,15)
        do! c.StepAsync ()
        // Event at t=7 should appear in windows starting at 0 and 5.
        out.Current.[(0L, (7, 101))] |> should equal 1L
        out.Current.[(5L, (7, 101))] |> should equal 1L
    }


[<Fact>]
let ``Lag1 delays the stream by one tick`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<int> ()
        let lagged = c.Lag1 input.Stream
        let out = c.Output lagged

        input.Send(ZSet.singleton 1 1L)
        do! c.StepAsync ()
        out.Current.IsEmpty |> should be True

        input.Send(ZSet.singleton 2 1L)
        do! c.StepAsync ()
        out.Current.[1] |> should equal 1L   // previous tick's value
    }


[<Fact>]
let ``TumblingWindow empty input is empty output`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<int * int>()
        let w = c.TumblingWindow(input.Stream, Func<_, _>(fun (t, _) -> int64 t), 10L)
        let out = c.Output w
        do! c.StepAsync()
        out.Current.IsEmpty |> should be True
    }


[<Fact>]
let ``TumblingWindow rejects zero size`` () =
    let c = Circuit.create ()
    let input = c.ZSetInput<int * int>()
    let act =
        fun () ->
            c.TumblingWindow(
                input.Stream, Func<_, _>(fun (t, _) -> int64 t), 0L)
            |> ignore
    act |> should throw typeof<ArgumentException>


[<Fact>]
let ``SlidingWindow rejects zero size`` () =
    let c = Circuit.create ()
    let input = c.ZSetInput<int>()
    let act =
        fun () ->
            c.SlidingWindow(
                input.Stream, Func<_, _>(int64), 0L, 1L) |> ignore
    act |> should throw typeof<ArgumentException>


[<Fact>]
let ``SlidingWindow rejects zero slide`` () =
    let c = Circuit.create ()
    let input = c.ZSetInput<int>()
    let act =
        fun () ->
            c.SlidingWindow(
                input.Stream, Func<_, _>(int64), 10L, 0L) |> ignore
    act |> should throw typeof<ArgumentException>


[<Fact>]
let ``SlidingWindow empty input`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<int>()
        let w = c.SlidingWindow(input.Stream, Func<_, _>(int64), 10L, 5L)
        let out = c.Output w
        do! c.StepAsync()
        out.Current.IsEmpty |> should be True
    }


// ─── SlidingWindow cap + valid ratio (moved from SpineAndSafetyTests) ─────

[<Fact>]
let ``SlidingWindow rejects ratio above 1024`` () =
    let c = Circuit.create ()
    let input = c.ZSetInput<int64>()
    (fun () ->
        c.SlidingWindow(input.Stream, Func<_, _>(fun x -> x),
                        windowSize = 10_000L, slide = 1L) |> ignore)
    |> should throw typeof<ArgumentException>


[<Fact>]
let ``SlidingWindow accepts reasonable ratios and emits per-window tags`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<int64>()
        let sw = c.SlidingWindow(input.Stream, Func<_, _>(fun x -> x),
                                 windowSize = 30L, slide = 10L)
        let out = c.Output sw
        input.Send (ZSet.ofKeys [ 12L ])
        do! c.StepAsync()
        // t=12 with window=30, slide=10 belongs to windows [0..30) and
        // [-20..10) and [-10..20) — three tags.
        out.Current.Count |> should be (greaterThan 0)
    }


// ─── Session windows (IndexedZSet + coalesce gap > T) ────────────────────

[<Fact>]
let ``SessionWindows.assign coalesces consecutive events within the gap`` () =
    // One partition; times 0, 3, 10 with gap=5 → sessions [0,3] start=0 and [10] start=10
    let z = ZSet.ofKeys [ (0L, "a"); (3L, "b"); (10L, "c") ]
    let labeled =
        SessionWindows.assign
            5L
            (Func<_, _>(fun _ -> 0))
            (Func<_, _>(fun (t, _) -> t))
            z
    labeled.[(0L, (0L, "a"))] |> should equal 1L
    labeled.[(0L, (3L, "b"))] |> should equal 1L
    labeled.[(10L, (10L, "c"))] |> should equal 1L
    labeled.[(0L, (10L, "c"))] |> should equal 0L


[<Fact>]
let ``SessionWindows.assign merges two sessions when a bridging event lands`` () =
    let split = ZSet.ofKeys [ (0L, "a"); (10L, "c") ]
    let gap = 8L
    let before =
        SessionWindows.assign 8L (Func<_, _>(fun _ -> 0)) (Func<_, _>(fst)) split
    before.[(0L, (0L, "a"))] |> should equal 1L
    before.[(10L, (10L, "c"))] |> should equal 1L
    let bridged = ZSet.add split (ZSet.ofKeys [ (5L, "b") ])
    let after =
        SessionWindows.assign gap (Func<_, _>(fun _ -> 0)) (Func<_, _>(fst)) bridged
    after.[(0L, (0L, "a"))] |> should equal 1L
    after.[(0L, (5L, "b"))] |> should equal 1L
    after.[(0L, (10L, "c"))] |> should equal 1L
    after.[(10L, (10L, "c"))] |> should equal 0L


[<Fact>]
let ``SessionWindows.isClosed uses Frontier.ClosedThrough vs last+gap`` () =
    let f = Frontier.singleton 0 20L
    SessionWindows.isClosed 10L 5L f |> should be True    // 15 <= 20
    SessionWindows.isClosed 15L 5L f |> should be True    // 20 <= 20
    SessionWindows.isClosed 16L 5L f |> should be False   // 21 > 20
    SessionWindows.isClosed 10L 5L Frontier.empty |> should be False


[<Fact>]
let ``SessionWindows.exceedsGap is strict greater-than and saturates`` () =
    SessionWindows.exceedsGap 0L 5L 5L |> should be False
    SessionWindows.exceedsGap 0L 6L 5L |> should be True
    SessionWindows.exceedsGap 10L 8L 5L |> should be False
    SessionWindows.exceedsGap Int64.MaxValue  Int64.MaxValue 1L |> should be False
    SessionWindows.exceedsGap (Int64.MaxValue - 1L) Int64.MaxValue 1L |> should be False


[<Fact>]
let ``SessionWindow rejects non-positive gap`` () =
    let c = Circuit.create ()
    let input = c.ZSetInput<int64>()
    (fun () ->
        c.SessionWindow(input.Stream, Func<_, _>(fun x -> x), 0L) |> ignore)
    |> should throw typeof<ArgumentException>


[<Fact>]
let ``SessionWindow empty input is empty output`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<int64>()
        let w = c.SessionWindow(input.Stream, Func<_, _>(fun x -> x), 5L)
        let out = c.Output w
        do! c.StepAsync()
        out.Current.IsEmpty |> should be True
    }


[<Fact>]
let ``SessionWindow labels a run and emits only the assignment delta on the next tick`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<int64 * string>()
        let w =
            c.SessionWindow(
                input.Stream,
                Func<_, _>(fun (_, id) -> id),
                Func<_, _>(fun (t, _) -> t),
                5L)
        let out = c.Output w
        input.Send(ZSet.ofKeys [ 0L, "u"; 3L, "u" ])
        do! c.StepAsync()
        out.Current.[(0L, (0L, "u"))] |> should equal 1L
        out.Current.[(0L, (3L, "u"))] |> should equal 1L
        input.Send(ZSet.ofKeys [ 10L, "u" ])
        do! c.StepAsync()
        // Second tick is the delta of the labeling: only the new session row.
        out.Current.[(10L, (10L, "u"))] |> should equal 1L
        out.Current.[(0L, (0L, "u"))] |> should equal 0L
        out.Current.[(0L, (3L, "u"))] |> should equal 0L
    }


[<Fact>]
let ``SessionWindow retracts split labels when a late event merges two sessions`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<int64 * int>()
        let w =
            c.SessionWindow(
                input.Stream,
                Func<_, _>(fun _ -> 0),
                Func<_, _>(fst),
                8L)
        let out = c.Output w
        input.Send(ZSet.ofKeys [ 0L, 1; 10L, 2 ])
        do! c.StepAsync()
        out.Current.[(0L, (0L, 1))] |> should equal 1L
        out.Current.[(10L, (10L, 2))] |> should equal 1L
        input.Send(ZSet.ofKeys [ 5L, 3 ])
        do! c.StepAsync()
        out.Current.[(0L, (5L, 3))] |> should equal 1L
        out.Current.[(10L, (10L, 2))] |> should equal -1L
        out.Current.[(0L, (10L, 2))] |> should equal 1L
    }


[<Fact>]
let ``SessionWindow retraction of a member emits a negative label`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<int64>()
        let w = c.SessionWindow(input.Stream, Func<_, _>(fun x -> x), 5L)
        let out = c.Output w
        input.Send(ZSet.ofKeys [ 0L; 1L ])
        do! c.StepAsync()
        input.Send(ZSet.singleton 1L -1L)
        do! c.StepAsync()
        out.Current.[(0L, 1L)] |> should equal -1L
        out.Current.[(0L, 0L)] |> should equal 0L
    }


[<Fact>]
let ``SessionWindow partitions do not coalesce across keys`` () =
    task {
        let c = Circuit.create ()
        let input = c.ZSetInput<int64 * string>()
        let w =
            c.SessionWindow(
                input.Stream,
                Func<_, _>(fun (_, id) -> id),
                Func<_, _>(fun (t, _) -> t),
                100L)
        let out = c.Output w
        input.Send(ZSet.ofKeys [ 0L, "a"; 1L, "b" ])
        do! c.StepAsync()
        out.Current.[(0L, (0L, "a"))] |> should equal 1L
        out.Current.[(1L, (1L, "b"))] |> should equal 1L
        out.Current.[(0L, (1L, "b"))] |> should equal 0L
    }
